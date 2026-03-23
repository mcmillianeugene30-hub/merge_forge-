import { NextRequest, NextResponse } from "next/server";
import type { User } from '@supabase/supabase-js';
import { requireAuth } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;
    const { id: forgeId, jobId } = await params;
    const supabase = await createClient();

    const { data: job } = await supabase
      .from("deploy_jobs")
      .select("*")
      .eq("id", jobId)
      .eq("forge_id", forgeId)
      .single();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.target === "vercel" && job.vercel_project_id && job.status === "running" && process.env.VERCEL_API_TOKEN) {
      const teamQuery = process.env.VERCEL_TEAM_ID ? `?teamId=${process.env.VERCEL_TEAM_ID}` : "";
      const statusUrl = `https://api.vercel.com/v13/deployments/${job.vercel_project_id}${teamQuery}`;

      const vercelRes = await fetch(statusUrl, {
        headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
      });

      if (vercelRes.ok) {
        const deployment = await vercelRes.json();
        const readyState = deployment.readyState;
        let newStatus: "pending" | "running" | "completed" | "failed" = "running";

        if (readyState === "READY") newStatus = "completed";
        else if (readyState === "ERROR" || readyState === "CANCELED") newStatus = "failed";

        if (newStatus !== "running") {
          const admin = await getSupabaseAdmin();
          const updates: Record<string, unknown> = { status: newStatus };
          if (newStatus === "completed") updates.vercel_deploy_url = `https://${deployment.url}`;
          await admin.from("deploy_jobs").update(updates).eq("id", jobId);
          return NextResponse.json({ job: { ...job, status: newStatus } });
        }
      }
    }

    return NextResponse.json({ job });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
