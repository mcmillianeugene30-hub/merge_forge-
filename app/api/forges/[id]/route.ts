import { NextRequest, NextResponse } from "next/server";
import type { User } from '@supabase/supabase-js';
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createClient();

  // Check if user is a member
  const { data: membership } = await supabase
    .from("forge_members")
    .select("role")
    .eq("forge_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "You are not a member of this forge" },
      { status: 403 }
    );
  }

  const { data: forge, error } = await supabase
    .from("forges")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !forge) {
    return NextResponse.json({ error: "Forge not found" }, { status: 404 });
  }

  return NextResponse.json({ forge });
}
