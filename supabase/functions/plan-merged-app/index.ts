import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { prompt, targetStack, knowledge } = await req.json();

    if (!prompt?.trim()) {
      return new Response(JSON.stringify({ error: "prompt required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const groqKey = Deno.env.get("GROQ_API_KEY");

    const systemPrompt = `You are MergeForge Planner AI. Analyze the linked repository knowledge and user goal, then output a complete merged app architecture. Respond ONLY with valid JSON. No markdown, no explanation, no code fences.`;

    const userPrompt = `User goal: {prompt}

Target stack: {JSON.stringify(targetStack)}

Repository knowledge:
{JSON.stringify(knowledge, null, 2)}

Output a complete app architecture plan as JSON with these exact keys:
{
  "summary": "string (2-3 sentence description)",
  "architecture": { "frontend": [], "backend": [], "database": [], "integrations": [] },
  "pages": [{ "path": "string", "title": "string", "purpose": "string" }],
  "routes": [{ "path": "string", "method": "string", "purpose": "string" }],
  "schema": [{ "table": "string", "columns": ["string"] }],
  "env_vars": ["string"],
  "tasks": ["string"]
}`;

    // OpenAI path
    if (openaiKey) {
      const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer {openaiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 2000,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!openaiRes.ok) {
        throw new Error(`OpenAI error: {openaiRes.status}`);
      }

      const data = await openaiRes.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from OpenAI");
      return new Response(content, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Groq path
    if (groqKey) {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer {groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 2000,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!groqRes.ok) {
        throw new Error(`Groq error: {groqRes.status}`);
      }

      const data = await groqRes.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty response from Groq");
      return new Response(content, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Deterministic fallback — no AI key
    const repos = knowledge?.repos ?? [];
    const allServices = repos.flatMap((r: { services?: string[] }) => r.services ?? []);
    const allStack = repos.flatMap((r: { stack?: string[] }) => r.stack ?? []);
    const allDeps = repos.flatMap((r: { dependencies?: string[] }) => r.dependencies ?? []);

    const frontendTech = allStack.includes("Next.js") ? ["Next.js 15", "React 19", "TypeScript"]
      : allStack.includes("Vue") ? ["Vue 3", "TypeScript"]
      : allStack.includes("Svelte") ? ["SvelteKit"] : ["Next.js 15", "React 19"];

    const backendTech = allServices.includes("supabase") ? ["Supabase"] : ["Node.js API"];

    const fallbackPlan = {
      summary: `Merged app scaffold based on: {prompt.slice(0, 80)}{prompt.length > 80 ? "..." : ""}`,
      architecture: {
        frontend: frontendTech,
        backend: backendTech,
        database: allServices.includes("supabase") ? ["PostgreSQL (Supabase)"] : ["PostgreSQL"],
        integrations: [...new Set(allServices)].slice(0, 4),
      },
      pages: [
        { path: "/", title: "Home", purpose: "Landing page" },
        { path: "/dashboard", title: "Dashboard", purpose: "Main user dashboard" },
        { path: "/settings", title: "Settings", purpose: "User settings and preferences" },
        { path: "/api-reference", title: "API Reference", purpose: "API documentation" },
      ],
      routes: [
        { path: "/api/health", method: "GET", purpose: "Health check endpoint" },
        { path: "/api/auth/login", method: "POST", purpose: "User login" },
        { path: "/api/data", method: "GET", purpose: "Fetch core data" },
        { path: "/api/data", method: "POST", purpose: "Create new data entry" },
      ],
      schema: [
        { table: "users", columns: ["id uuid PK", "email text UNIQUE", "name text", "created_at timestamptz"] },
        { table: "sessions", columns: ["id uuid PK", "user_id uuid FK", "token text", "expires_at timestamptz"] },
        { table: "resources", columns: ["id uuid PK", "user_id uuid FK", "name text", "data jsonb", "created_at timestamptz"] },
      ],
      env_vars: [...new Set(repos.flatMap((r: { envVars?: string[] }) => r.envVars ?? []))].slice(0, 10),
      tasks: [
        "Set up project scaffold",
        "Configure authentication",
        "Build core data model",
        "Create API routes",
        "Build dashboard UI",
        "Add integrations",
        "Write tests",
        "Deploy",
      ],
    };

    return new Response(JSON.stringify(fallbackPlan), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("plan-merged-app error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
