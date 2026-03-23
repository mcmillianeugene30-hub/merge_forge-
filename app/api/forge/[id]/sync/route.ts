import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOctokit } from "@/lib/github";
import type { BoardStatus } from "@/lib/types";

function mapGithubIssueToStatus(
  githubState: string,
  existingStatus?: string
): BoardStatus {
  if (githubState === "closed") {
    return "done";
  }
  if (githubState === "open") {
    if (existingStatus && existingStatus !== "done") {
      return existingStatus as BoardStatus;
    }
    return "todo";
  }
  return "todo";
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
  const supabase = await createClient();

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

  // Get linked repos
  const { data: linkedRepos } = await supabase
    .from("linked_repos")
    .select("*")
    .eq("forge_id", forgeId);

  if (!linkedRepos || linkedRepos.length === 0) {
    return NextResponse.json(
      { error: "No repositories linked to this forge" },
      { status: 400 }
    );
  }

  const octokit = getOctokit(githubAccount.access_token);

  let totalIssues = 0;
  let totalPRs = 0;

  try {
    for (const linkedRepo of linkedRepos) {
      const [owner, repo] = linkedRepo.github_repo_full_name.split("/");

      // Paginate issues
      const issuesIterator = octokit.paginate(octokit.rest.issues.listForRepo, {
        owner,
        repo,
        state: "all",
        per_page: 100,
      });

      // Paginate PRs
      const prsIterator = octokit.paginate(octokit.rest.pulls.list, {
        owner,
        repo,
        state: "open",
        per_page: 100,
      });

      // Collect all issues and PRs
      const allIssues: any[] = [];
      const allPRs: any[] = [];

      for await (const issues of issuesIterator) {
        // Filter out PRs (they appear in issues endpoint too)
        const pureIssues = issues.filter((issue) => !issue.pull_request);
        allIssues.push(...pureIssues);
      }

      for await (const prs of prsIterator) {
        allPRs.push(...prs);
      }

      // Process issues
      for (let i = 0; i < allIssues.length; i++) {
        const issue = allIssues[i];
        
        // Check if exists
        const { data: existing } = await supabase
          .from("unified_issues")
          .select("id, status")
          .eq("forge_id", forgeId)
          .eq("source_repo_id", linkedRepo.id)
          .eq("github_issue_number", issue.number)
          .single();

        const mappedStatus = mapGithubIssueToStatus(
          issue.state,
          existing?.status
        );

        if (existing) {
          // Update
          await supabase
            .from("unified_issues")
            .update({
              title: issue.title,
              body: issue.body,
              status: mappedStatus,
              labels: issue.labels.map((l: any) => l.name),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          // Insert
          await supabase.from("unified_issues").insert({
            forge_id: forgeId,
            source_repo_id: linkedRepo.id,
            github_issue_number: issue.number,
            title: issue.title,
            body: issue.body,
            status: mappedStatus,
            labels: issue.labels.map((l: any) => l.name),
            github_issue_url: issue.html_url,
            source_type: "github",
            source_repo_name: linkedRepo.github_repo_full_name,
            issue_type: "issue",
            position: (i + 1) * 1000,
          });
        }
        totalIssues++;
      }

      // Process PRs
      for (const pr of allPRs) {
        // Check if exists
        const { data: existing } = await supabase
          .from("pr_activity")
          .select("id")
          .eq("forge_id", forgeId)
          .eq("repo_id", linkedRepo.id)
          .eq("pr_number", pr.number)
          .single();

        if (existing) {
          // Update
          await supabase
            .from("pr_activity")
            .update({
              title: pr.title,
              state: pr.state,
              author: pr.user?.login ?? "unknown",
              pr_url: pr.html_url,
              head_ref: pr.head?.ref,
              base_ref: pr.base?.ref,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          // Insert
          await supabase.from("pr_activity").insert({
            forge_id: forgeId,
            repo_id: linkedRepo.id,
            pr_number: pr.number,
            title: pr.title,
            state: pr.state,
            author: pr.user?.login ?? "unknown",
            pr_url: pr.html_url,
            head_ref: pr.head?.ref,
            base_ref: pr.base?.ref,
          });
        }
        totalPRs++;
      }

      // Update last_synced_at
      await supabase
        .from("linked_repos")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("id", linkedRepo.id);

      // Insert sync event
      await supabase.from("activity_events").insert({
        forge_id: forgeId,
        repo_id: linkedRepo.id,
        event_type: "sync",
        title: `Synced ${linkedRepo.github_repo_full_name}`,
        actor: user.email || user.id,
        metadata: { issues: allIssues.length, prs: allPRs.length },
      });
    }

    return NextResponse.json({
      success: true,
      synced: {
        repos: linkedRepos.length,
        issues: totalIssues,
        prs: totalPRs,
      },
    });
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
