import { NextResponse } from "next/server";
import type { User } from '@supabase/supabase-js';
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST() {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseAdmin();
  await supabase
    .from("github_accounts")
    .delete()
    .eq("user_id", user.id);

  return NextResponse.json({ success: true });
}
