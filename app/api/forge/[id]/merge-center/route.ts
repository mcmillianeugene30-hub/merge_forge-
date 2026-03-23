import { NextRequest, NextResponse } from "next/server";
import type { User } from '@supabase/supabase-js';
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;
    const { id: forgeId } = await params;
    const supabase = await getSupabaseAdmin();

    const { data: analyses } = await supabase
      .from("merge_analyses")
      .select("*")
      .eq("forge_id", forgeId)
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({ analyses: analyses ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;
    const { id: forgeId } = await params;
    const supabase = await getSupabaseAdmin();

    const { data: prs } = await supabase
      .from("pr_activity")
      .select("*")
      .eq("forge_id", forgeId)
      .eq("state", "open")
      .order("updated_at", { ascending: false });

    const { data: issues } = await supabase
      .from("unified_issues")
      .select("*")
      .eq("forge_id", forgeId)
      .neq("status", "done")
      .order("position", { ascending: true })
      .limit(50);

    if ((!prs || prs.length === 0) && (!issues || issues.length === 0)) {
      return NextResponse.json({ error: "No open PRs or issues to analyze. Sync GitHub first." }, { status: 400 });
    }

    const { data: analysis } = await supabase
      .from("merge_analyses")
      .insert({ forge_id: forgeId, created_by: user.id, status: "running", pr_ids: (prs ?? []).map((p: { id: string }) => p.id) })
      .select()
      .single();

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/suggest-merges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ forgeId, prs: prs ?? [], issues: issues ?? [] }),
      });

      const result = await response.json();

      await supabase
        .from("merge_analyses")
        .update({
          status: "completed",
          groups: result.groups ?? [],
          suggestions: result.suggestions ?? [],
          risks: result.risks ?? [],
          merge_sequence: result.merge_sequence ?? [],
        })
        .eq("id", analysis.id);

      return NextResponse.json({
        success: true,
        analysisId: analysis.id,
        groups: result.groups ?? [],
        suggestions: result.suggestions ?? [],
        risks: result.risks ?? [],
        merge_sequence: result.merge_sequence ?? [],
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI analysis failed";
      await supabase.from("merge_analyses").update({ status: "failed" }).eq("id", analysis.id);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
