import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { AgentPipelineLauncher } from "@/components/agent-run/agent-pipeline-launcher";

export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id: forgeId } = await params;

  const admin = await getSupabaseAdmin();
  const { data: forge } = await admin.from("forges").select("*").eq("id", forgeId).single();
  if (!forge) notFound();

  const { data: sessions } = await admin
    .from("builder_sessions")
    .select("*")
    .eq("forge_id", forgeId)
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: activeRuns } = await admin
    .from("agent_runs")
    .select("*")
    .eq("forge_id", forgeId)
    .in("status", ["queued", "running"])
    .limit(1);

  const { data: analyses } = await admin
    .from("repo_analysis_cache")
    .select("repo_name, summary, artifact_type, created_at")
    .eq("forge_id", forgeId)
    .limit(5);

  const { data: linkedRepos } = await admin
    .from("forge_repos")
    .select("id")
    .eq("forge_id", forgeId);

  const activeRun = activeRuns?.[0];

  return (
    <div className="space-y-6">
      {activeRun && (
        <div className="p-4 border border-blue-500/30 bg-blue-500/10 rounded-lg">
          <p className="text-sm">
            Pipeline running —{" "}
            <a href={`/forge/${forgeId}/builder/run?runId=${activeRun.id}`} className="underline">
              view progress
            </a>
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">AI Builder</h2>
          <AgentPipelineLauncher
            forgeId={forgeId}
            sessionId=""
            forgeName={forge.name}
          />
        </div>

        {analyses && analyses.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Repo Analysis</h2>
            {analyses.map((a: any) => (
              <div key={a.repo_name} className="p-3 border rounded-lg">
                <p className="text-sm font-medium">{a.repo_name}</p>
                <p className="text-xs text-muted-foreground mt-1">{a.summary}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {sessions && sessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Build History</h2>
          <div className="space-y-2">
            {sessions.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="text-sm font-medium">{s.prompt?.slice(0, 60)}...</p>
                  <p className="text-xs text-muted-foreground">{s.status} — {new Date(s.created_at).toLocaleDateString()}</p>
                </div>
                {s.status === "completed" && s.summary && (
                  <span className="text-xs text-green-500">✓ {s.summary.slice(0, 40)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
