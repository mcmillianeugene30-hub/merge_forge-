import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data: forges, error } = await supabase
    .from("forges")
    .select(`
      *,
      forge_members(count)
    `)
    .eq("forge_members.user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ forges });
}

export async function POST(request: NextRequest) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, description } = body;

  if (!name || name.trim() === "") {
    return NextResponse.json(
      { error: "Forge name is required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Insert the forge
  const { data: forge, error: forgeError } = await supabase
    .from("forges")
    .insert({
      name: name.trim(),
      description: description?.trim() || null,
      owner_id: user.id,
    })
    .select()
    .single();

  if (forgeError) {
    return NextResponse.json({ error: forgeError.message }, { status: 500 });
  }

  // Add the owner as a member
  const { error: memberError } = await supabase
    .from("forge_members")
    .insert({
      forge_id: forge.id,
      user_id: user.id,
      role: "owner",
    });

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ id: forge.id }, { status: 201 });
}
