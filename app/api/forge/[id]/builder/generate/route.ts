import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
    const { id: forgeId } = await params;
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = await getSupabaseAdmin();

    // Verify session belongs to this forge
    const { data: session } = await admin
      .from("builder_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("forge_id", forgeId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Update status to generating
    await admin.from("builder_sessions").update({ status: "generating" }).eq("id", sessionId);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      await admin.from("builder_sessions").update({ status: "failed" }).eq("id", sessionId);
      return NextResponse.json({ error: "Supabase env not configured" }, { status: 500 });
    }

    // Call generate-app-artifacts edge function
    const edgeRes = await fetch(`${supabaseUrl}/functions/v1/generate-app-artifacts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({
        forgeId,
        sessionId,
        prompt: session.prompt,
        targetStack: session.target_stack,
        plan: session.plan,
      }),
    });

    if (!edgeRes.ok) {
      await admin.from("builder_sessions").update({ status: "failed" }).eq("id", sessionId);
      const errText = await edgeRes.text();
      return NextResponse.json({ error: `Generation failed: ${errText}` }, { status: 500 });
    }

    const result = await edgeRes.json();

    // Store artifacts
    if (result.artifacts && Array.isArray(result.artifacts) && result.artifacts.length > 0) {
      const artifactsToInsert = result.artifacts.map((a: { path: string; content: string; artifact_type: string }) => ({
        session_id: sessionId,
        path: a.path,
        content: a.content,
        artifact_type: a.artifact_type ?? "code",
      }));
      await admin.from("builder_artifacts").insert(artifactsToInsert);
    }

    // Mark completed
    await admin.from("builder_sessions").update({ status: "completed" }).eq("id", sessionId);

    return NextResponse.json({ success: true, artifacts: result.artifacts ?? [] });
  } catch (err) {
    console.error("generate error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
