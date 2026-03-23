import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { forgeId, repoId, repoFullName } = await req.json();

    if (!forgeId || !repoId || !repoFullName) {
      return new Response(JSON.stringify({ error: "Missing required fields: forgeId, repoId, repoFullName" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const githubToken = Deno.env.get("GITHUB_PERSONAL_ACCESS_TOKEN")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const [owner, repo] = repoFullName.split("/");

    const headers = {
      Authorization: `Bearer {githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };

    // Fetch issues, PRs, and events in parallel
    const [issuesRes, prsRes, eventsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/{owner}/{repo}/issues?state=open&per_page=100`, { headers }),
      fetch(`https://api.github.com/repos/{owner}/{repo}/pulls?state=open&per_page=100`, { headers }),
      fetch(`https://api.github.com/repos/{owner}/{repo}/events?per_page=30`, { headers }),
    ]);

    const issuesData = await issuesRes.json();
    const prsData = await prsRes.json();
    const eventsData = await eventsRes.json();

    // Filter out PRs from issues (GitHub API returns PRs in issues endpoint)
    const filteredIssues = Array.isArray(issuesData)
      ? issuesData.filter((issue: any) => !issue.pull_request)
      : [];

    // Upsert issues
    const mappedIssues = filteredIssues.map((issue: any, index: number) => ({
      forge_id: forgeId,
      source_repo_id: repoId,
      github_issue_number: issue.number,
      title: issue.title,
      body: issue.body,
      status: "todo",
      labels: issue.labels?.map((l: any) => l.name) ?? [],
      assignee_ids: issue.assignees?.map((a: any) => String(a.id)) ?? [],
      github_issue_url: issue.html_url,
      source_type: "github",
      position: (index + 1) * 1000,
    }));

    for (const issue of mappedIssues) {
      await supabase
        .from("unified_issues")
        .upsert(issue, { onConflict: "forge_id,github_issue_number" });
    }

    // Upsert PRs
    const mappedPRs = (Array.isArray(prsData) ? prsData : []).map((pr: any) => ({
      forge_id: forgeId,
      repo_id: repoId,
      pr_number: pr.number,
      title: pr.title,
      state: pr.state,
      author: pr.user?.login ?? "unknown",
      pr_url: pr.html_url,
      head_ref: pr.head?.ref,
      base_ref: pr.base?.ref,
    }));

    for (const pr of mappedPRs) {
      await supabase
        .from("pr_activity")
        .upsert(pr, { onConflict: "forge_id,pr_number" });
    }

    // Insert events (append-only, not upsert)
    const mappedEvents = (Array.isArray(eventsData) ? eventsData : []).map((event: any) => ({
      forge_id: forgeId,
      repo_id: repoId,
      event_type: event.type === "PushEvent" ? "commit" :
                  event.type === "PullRequestEvent" ? "pr" :
                  event.type === "IssuesEvent" ? "issue" :
                  event.type === "IssueCommentEvent" ? "comment" : "sync",
      title: `{event.type?.replace("Event", "")} on {repo}`,
      actor: event.actor?.login ?? "unknown",
      metadata: event,
      source_url: "",
    }));

    if (mappedEvents.length > 0) {
      await supabase.from("activity_events").insert(mappedEvents);
    }

    // Update last_synced_at
    await supabase
      .from("linked_repos")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", repoId);

    return new Response(JSON.stringify({
      synced: {
        issues: mappedIssues.length,
        prs: mappedPRs.length,
        events: mappedEvents.length,
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Sync error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Internal server error",
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
