import { NextRequest, NextResponse } from "next/server";
import type { User } from '@supabase/supabase-js';
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;
  const { id: forgeId } = await params;

  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("forge_members")
    .select("role")
    .eq("forge_id", forgeId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { prs?: unknown; issues?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prs = [], issues = [] } = body;

  if (!prs.length && !issues.length) {
    return NextResponse.json({ groups: [], suggestions: [], risks: [] }, { status: 200 });
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  if (!openaiKey && !groqKey) {
    return NextResponse.json(
      { groups: [], suggestions: [], risks: [], message: "No AI key configured" },
      { status: 200 }
    );
  }

  const systemPrompt =
    "You are MergeForge AI, an expert in cross-repository coordination. " +
    "Respond ONLY with valid JSON, no markdown, no explanation. " +
    "Return: { \"groups\": [{ \"label\": string, \"pr_numbers\": number[], \"issue_numbers\": number[], \"reason\": string }], " +
    "\"suggestions\": [{ \"priority\": \"high\"|\"medium\"|\"low\", \"action\": string, \"detail\": string }], " +
    "\"risks\": [{ \"severity\": \"high\"|\"medium\"|\"low\", \"description\": string, \"affected_items\": string[] }] }";

  const userPrompt = `Analyze these PRs and issues for a Forge:\n\nPRs:\n${JSON.stringify(prs, null, 2)}\n\nIssues:\n${JSON.stringify(issues, null, 2)}\n\nIdentify logical groups, suggest priority actions, and flag risks.`;

  try {
    if (openaiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1000,
          temperature: 0.3,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response");
      return NextResponse.json(JSON.parse(content), { status: 200 });
    }

    if (groqKey) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          temperature: 0.3,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Groq error: ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response");
      return NextResponse.json(JSON.parse(content), { status: 200 });
    }
  } catch (err) {
    console.error("merge/suggest error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }

  return NextResponse.json({ groups: [], suggestions: [], risks: [] }, { status: 200 });
}
