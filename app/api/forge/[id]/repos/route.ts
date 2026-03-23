import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: forgeId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("linked_repos")
    .select("*")
    .eq("forge_id", forgeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ repos: data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: forgeId } = await params;
  const body = await request.json();
  const { repos } = body;

  if (!Array.isArray(repos) || repos.length === 0) {
    return NextResponse.json(
      { error: "repos must be a non-empty array" },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Get GitHub account
  const { data: githubAccount } = await supabase
    .from("github_accounts")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!githubAccount) {
    return NextResponse.json(
      { error: "GitHub account not connected" },
      { status: 400 }
    );
  }

  // Map repos to linked_repos rows
  const rows = repos.map((repo: any) => ({
    forge_id: forgeId,
    github_account_id: githubAccount.id,
    github_repo_full_name: repo.full_name,
    github_repo_id: repo.id,
    default_branch: repo.default_branch || "main",
    private: repo.private,
  }));

  // Upsert (idempotent)
  for (const row of rows) {
    await supabase
      .from("linked_repos")
      .upsert(row, { onConflict: "forge_id,github_repo_full_name" });
  }

  return NextResponse.json({ success: true, linked: repos.length });
}
