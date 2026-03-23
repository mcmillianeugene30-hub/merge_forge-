import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { forgeId, analyses } = await req.json();

    if (!forgeId || !analyses) {
      return new Response(JSON.stringify({ error: "forgeId and analyses required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");

    const systemPrompt = `You are MergeForge AI. Given repo analysis summaries, identify shared concepts, conflicts, and opportunities. Respond ONLY with valid JSON: { "sharedConcepts": [], "conflicts": [], "opportunities": [] }`;

    const userPrompt = `Repo summaries:\n{JSON.stringify(analyses, null, 2)}`;

    if (openaiKey) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer {openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 1000,
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`OpenAI error: {res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response");
      return new Response(content, { status: 200, headers: { "Content-Type": "application/json" } });
    }

    if (groqKey) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer {groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 1000,
          temperature: 0.2,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });
      if (!res.ok) throw new Error(`Groq error: {res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response");
      return new Response(content, { status: 200, headers: { "Content-Type": "application/json" } });
    }

    // Deterministic fallback
    const serviceCounts = new Map<string, number>();
    for (const a of analyses as Array<{ services?: string[] }>) {
      for (const s of a.services ?? []) {
        serviceCounts.set(s, (serviceCounts.get(s) ?? 0) + 1);
      }
    }
    const sharedConcepts = [...serviceCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([service]) => service);

    return new Response(JSON.stringify({
      sharedConcepts,
      conflicts: [] as string[],
      opportunities: ["Merge authentication flows", "Unified database schema", "Shared component library"],
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("analyze-repos error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
