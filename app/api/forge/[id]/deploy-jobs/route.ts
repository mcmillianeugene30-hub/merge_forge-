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
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    let query = supabase
      .from("deploy_jobs")
      .select("*")
      .eq("forge_id", forgeId)
      .order("created_at", { ascending: false });

    if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ jobs: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
