import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id: forgeId } = await params;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const admin = await getSupabaseAdmin();

    // Verify session belongs to this forge
    const { data: session } = await admin
      .from("builder_sessions")
      .select("id, forge_id")
      .eq("id", sessionId)
      .eq("forge_id", forgeId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Fetch all artifacts
    const { data: artifacts } = await admin
      .from("builder_artifacts")
      .select("path, content, artifact_type")
      .eq("session_id", sessionId)
      .order("path", { ascending: true });

    return NextResponse.json({
      sessionId,
      forgeId,
      exportedAt: new Date().toISOString(),
      artifacts: artifacts ?? [],
    });
  } catch (err) {
    console.error("export error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
