import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { TargetStack } from "@/lib/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: forgeId } = await params;
    const body = await req.json();
    const { prompt, targetStack } = body;

    if (!prompt?.trim()) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = await getSupabaseAdmin();

    const defaultStack: TargetStack = {
      frontend: "Next.js 15",
      backend: "Supabase",
      styling: "Tailwind CSS + shadcn/ui",
      auth: "Supabase Auth",
      database: "PostgreSQL",
    };

    // Create session
    const { data: session, error: sessionError } = await admin
      .from("builder_sessions")
      .insert({
        forge_id: forgeId,
        created_by: user.id,
        prompt,
        target_stack: targetStack ?? defaultStack,
        status: "planning",
      })
      .select()
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Fetch cached analyses
    const { data: analyses } = await admin
      .from("repo_analysis_cache")
      .select("summary, dependencies, env_vars, services")
      .eq("forge_id", forgeId);

    const knowledge = {
      repos: (analyses ?? []).map((a: { summary: unknown }) => a.summary),
      sharedConcepts: [] as string[],
      conflicts: [] as string[],
      opportunities: [] as string[],
    };

    // Call plan-merged-app edge function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      // Update session as failed if env missing
      await admin.from("builder_sessions").update({ status: "failed" }).eq("id", session.id);
      return NextResponse.json({ error: "Supabase env not configured" }, { status: 500 });
    }

    const edgeRes = await fetch(`${supabaseUrl}/functions/v1/plan-merged-app`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        forgeId,
        prompt,
        targetStack: session.target_stack,
        knowledge,
      }),
    });

    if (!edgeRes.ok) {
      await admin.from("builder_sessions").update({ status: "failed" }).eq("id", session.id);
      return NextResponse.json({ error: "Plan generation failed" }, { status: 500 });
    }

    const planJson = await edgeRes.json();

    // Update session with plan
    await admin.from("builder_sessions").update({
      status: "draft",
      summary: planJson.summary ?? null,
      plan: planJson,
    }).eq("id", session.id);

    // Store plan artifact
    await admin.from("builder_artifacts").insert({
      session_id: session.id,
      path: "plans/architecture-plan.json",
      content: JSON.stringify(planJson, null, 2),
      artifact_type: "plan",
    });

    return NextResponse.json({ success: true, sessionId: session.id, plan: planJson });
  } catch (err) {
    console.error("plan error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
