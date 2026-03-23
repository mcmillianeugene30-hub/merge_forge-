import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOctokit } from "@/lib/github";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: forgeId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("unified_issues")
    .select("*")
    .eq("forge_id", forgeId)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ issues: data });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: forgeId } = await params;
  const body = await request.json();
  const { title, body: issueBody, sourceRepoId, createInGithub } = body;

  if (!title || title.trim() === "") {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const supabase = await createClient();

  let githubIssueNumber: number | null = null;
  let githubIssueUrl: string | null = null;
  let sourceType: "github" | "virtual" = "virtual";
  let sourceRepoName: string | null = null;

  // If creating in GitHub
  if (createInGithub && sourceRepoId) {
    // Get linked repo
    const { data: linkedRepo } = await supabase
      .from("linked_repos")
      .select("*")
      .eq("id", sourceRepoId)
      .eq("forge_id", forgeId)
      .single();

    if (!linkedRepo) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Get GitHub account
    const { data: githubAccount } = await supabase
      .from("github_accounts")
      .select("access_token")
      .eq("user_id", user.id)
      .single();

    if (!githubAccount) {
      return NextResponse.json(
        { error: "GitHub account not connected" },
        { status: 400 }
      );
    }

    // Create GitHub issue
    const [owner, repo] = linkedRepo.github_repo_full_name.split("/");
    const octokit = getOctokit(githubAccount.access_token);

    try {
      const response = await octokit.rest.issues.create({
        owner,
        repo,
        title: title.trim(),
        body: issueBody?.trim() || "",
      });

      githubIssueNumber = response.data.number;
      githubIssueUrl = response.data.html_url;
      sourceType = "github";
      sourceRepoName = linkedRepo.github_repo_full_name;
    } catch (error) {
      console.error("Failed to create GitHub issue:", error);
      return NextResponse.json(
        { error: "Failed to create GitHub issue" },
        { status: 500 }
      );
    }
  }

  // Insert unified issue
  const { data: newIssue, error: insertError } = await supabase
    .from("unified_issues")
    .insert({
      forge_id: forgeId,
      source_repo_id: sourceRepoId || null,
      github_issue_number: githubIssueNumber,
      title: title.trim(),
      body: issueBody?.trim() || null,
      status: "todo",
      labels: [],
      assignee_ids: [],
      source_type: sourceType,
      source_repo_name: sourceRepoName,
      issue_type: "issue",
      position: 1000,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Insert activity event
  await supabase.from("activity_events").insert({
    forge_id: forgeId,
    repo_id: sourceRepoId || null,
    event_type: "issue",
    title: `Created issue: ${title.trim()}`,
    actor: user.email || user.id,
    metadata: {
      issue_id: newIssue.id,
      source_type: sourceType,
    },
  });

  return NextResponse.json({ issue: newIssue }, { status: 201 });
}
