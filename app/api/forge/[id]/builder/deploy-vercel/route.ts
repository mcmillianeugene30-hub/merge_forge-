import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrRes = await requireAuth();
  if (userOrRes instanceof NextResponse) return userOrRes;
  const user = userOrRes;
    const { id: forgeId } = await params;
    const body = await req.json();
    const { sessionId, projectName, framework } = body;

    if (!sessionId || !projectName) {
      return NextResponse.json({ error: "sessionId and projectName are required" }, { status: 400 });
    }

    if (!/^[a-z0-9-]{1,52}$/.test(projectName)) {
      return NextResponse.json({ error: "Invalid projectName: lowercase letters, numbers, hyphens only, max 52 chars" }, { status: 400 });
    }

    if (!process.env.VERCEL_API_TOKEN) {
      return NextResponse.json({ error: "VERCEL_API_TOKEN is not configured. Add it to your .env.local file." }, { status: 500 });
    }

    const supabase = await getSupabaseAdmin();

    const { data: session } = await supabase
      .from("builder_sessions")
      .select("id")
      .eq("id", sessionId)
      .eq("forge_id", forgeId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: artifacts } = await supabase
      .from("builder_artifacts")
      .select("path, content")
      .eq("session_id", sessionId);

    if (!artifacts || artifacts.length === 0) {
      return NextResponse.json({ error: "No artifacts to deploy" }, { status: 400 });
    }

    const { data: job } = await supabase
      .from("deploy_jobs")
      .insert({ session_id: sessionId, forge_id: forgeId, created_by: user.id, target: "vercel", status: "running" })
      .select()
      .single();

    try {
      const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
      const deployUrl = `https://api.vercel.com/v13/deployments${teamQuery}`;

      const requestBody = {
        name: projectName,
        framework: framework ?? "nextjs",
        files: artifacts.map((a: { path: string; content: string }) => ({ file: a.path, data: a.content, encoding: "utf-8" })),
        projectSettings: { framework: framework ?? "nextjs" },
        target: "production",
      };

      const vercelRes = await fetch(deployUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!vercelRes.ok) {
        const errJson = await vercelRes.json();
        const errMsg = errJson.error?.message || "Vercel deployment failed";
        await supabase.from("deploy_jobs").update({ status: "failed", error_message: errMsg }).eq("id", job.id);
        return NextResponse.json({ error: errMsg }, { status: 500 });
      }

      const deployment = await vercelRes.json();
      const deploymentUrl = deployment.url ? `https://${deployment.url}` : null;
      const deploymentId = deployment.id;

      await supabase
        .from("deploy_jobs")
        .update({
          status: "completed",
          vercel_deploy_url: deploymentUrl,
          vercel_project_id: deploymentId,
          metadata: { deploymentId, projectName, readyState: deployment.readyState },
        })
        .eq("id", job.id);

      return NextResponse.json({ success: true, deployUrl: deploymentUrl, deploymentId, deployJobId: job.id });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Vercel deployment failed";
      await supabase.from("deploy_jobs").update({ status: "failed", error_message: msg }).eq("id", job.id);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
