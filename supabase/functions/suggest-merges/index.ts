import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const { forgeId, prs, issues } = await req.json();

  if (!Array.isArray(prs) || !Array.isArray(issues)) {
    return new Response(JSON.stringify({ error: "prs and issues must be arrays" }), { status: 400 });
  }

  if (prs.length === 0 && issues.length === 0) {
    return new Response(JSON.stringify({ groups: [], suggestions: [], risks: [], merge_sequence: [] }));
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const groqKey = Deno.env.get("GROQ_API_KEY");

  const systemPrompt = "You are MergeForge Merge Analyst. Analyze these pull requests and issues across multiple repositories. Return ONLY valid JSON with no markdown, no code fences, no explanation.";

  const prSummary = (prs as Array<{ pr_number?: number; number?: number; title?: string; state?: string; pr_url?: string; url?: string; head_ref?: string; base_ref?: string }>) =>
    prs.map(pr => ({
      pr_number: pr.pr_number ?? pr.number,
      title: pr.title ?? "",
      state: pr.state ?? "open",
      repo: ((pr.pr_url ?? pr.url) as string)?.split("/").slice(-4, -2).join("/") ?? "unknown",
      head_ref: pr.head_ref ?? "",
      base_ref: pr.base_ref ?? "",
    }));

  const issueSummary = (issues as Array<{ number?: number; title?: string; status?: string; source_repo_name?: string }>) =>
    issues.map(iss => ({
      number: iss.number,
      title: iss.title ?? "",
      status: iss.status ?? "open",
      source_repo_name: iss.source_repo_name ?? "unknown",
    }));

  const userPrompt = `Analyze {prs.length} pull requests and {issues.length} issues. Return JSON with:

{
  "groups": [{ "label": string, "pr_numbers": number[], "issue_numbers": number[], "reason": string }],
  "suggestions": [{ "priority": "high"|"medium"|"low", "action": string, "detail": string }],
  "risks": [{ "severity": "high"|"medium"|"low", "description": string, "affected_items": string[] }],
  "merge_sequence": [{ "step": number, "pr_number": number, "repo": string, "reason": string, "depends_on": number[] }]
}

PRs: {JSON.stringify(prSummary(prs))}
Issues: {JSON.stringify(issueSummary(issues))}`;

  try {
    if (openaiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer {openaiKey}` },
        body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: 2000, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return new Response(content, { headers: { "Content-Type": "application/json" } });
    } else if (groqKey) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer {groqKey}` },
        body: JSON.stringify({ model: "llama-3.3-70b-versatile", max_tokens: 2000, temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }] }),
      });
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) return new Response(content, { headers: { "Content-Type": "application/json" } });
    }

    // Fallback — deterministic
    const byRepo: Record<string, number[]> = {};
    for (const pr of prs as Array<{ pr_number?: number; number?: number; pr_url?: string; url?: string }>) {
      const num = pr.pr_number ?? pr.number;
      const repo = ((pr.pr_url ?? pr.url) as string)?.split("/").slice(-4, -2).join("/") ?? "unknown";
      if (!byRepo[repo]) byRepo[repo] = [];
      byRepo[repo].push(num);
    }

    const groups = Object.entries(byRepo).map(([repo, nums]) => ({
      label: repo,
      pr_numbers: nums,
      issue_numbers: [] as number[],
      reason: `PRs targeting {repo}`,
    }));

    const byBase: Record<string, number[]> = {};
    for (const pr of prs as Array<{ pr_number?: number; number?: number; base_ref?: string }>) {
      const num = pr.pr_number ?? pr.number;
      const base = pr.base_ref ?? "unknown";
      if (!byBase[base]) byBase[base] = [];
      byBase[base].push(num);
    }
    const risks = Object.entries(byBase)
      .filter(([, nums]) => nums.length > 1)
      .map(([base, nums]) => ({
        severity: "medium" as const,
        description: `Multiple PRs targeting same branch: {base}`,
        affected_items: nums.map(n => `PR #{n}`),
      }));

    const suggestions = [{ priority: "medium" as const, action: "Review and merge oldest PRs first", detail: "Reduces merge conflict accumulation" }];

    const merge_sequence = (prs as Array<{ pr_number?: number; number?: number; pr_url?: string; url?: string }>).map((pr, i) => ({
      step: i + 1,
      pr_number: pr.pr_number ?? pr.number,
      repo: ((pr.pr_url ?? pr.url) as string)?.split("/").slice(-4, -2).join("/") ?? "unknown",
      reason: "Sequential merge order",
      depends_on: [] as number[],
    }));

    return new Response(JSON.stringify({ groups, suggestions, risks, merge_sequence }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "AI analysis failed" }), { status: 500 });
  }
});
