import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ISSUE_STATUSES } from "@/lib/constants";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: forgeId, issueId } = await params;
  const body = await request.json();
  const { status, position } = body;

  // Validate status
  if (status && !ISSUE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${ISSUE_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  // Validate position
  if (position !== undefined && (!Number.isFinite(position) || position < 0)) {
    return NextResponse.json(
      { error: "Position must be a finite positive number" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Update the issue
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (status) updates.status = status;
  if (position !== undefined) updates.position = position;

  const { data, error } = await supabase
    .from("unified_issues")
    .update(updates)
    .eq("id", issueId)
    .eq("forge_id", forgeId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Issue not found" }, { status: 404 });
  }

  return NextResponse.json({ issue: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; issueId: string }> }
) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: forgeId, issueId } = await params;
  const supabase = await createClient();

  // Delete the issue
  const { error } = await supabase
    .from("unified_issues")
    .delete()
    .eq("id", issueId)
    .eq("forge_id", forgeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
