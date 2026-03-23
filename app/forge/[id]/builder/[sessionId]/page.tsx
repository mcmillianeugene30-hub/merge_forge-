import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { ArtifactTree } from "@/components/builder/artifact-tree";
import { ArtifactViewer } from "@/components/builder/artifact-viewer";
import { DeployPanel } from "@/components/builder/deploy-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Artifact, BuilderSession } from "@/lib/types";

export default async function BuilderSessionPage({
  params,
}: {
  params: Promise<{ id: string; sessionId: string }>;
}) {
  const user = await requireUser();
  const { id: forgeId, sessionId } = await params;
  const supabase = await createClient();
  const admin = await getSupabaseAdmin();

  const [{ data: forge }, { data: session }, { data: artifacts }, { data: deployJobs }] =
    await Promise.all([
      supabase.from("forges").select("id, name").eq("id", forgeId).single(),
      admin.from("builder_sessions").select("*").eq("id", sessionId).eq("forge_id", forgeId).single(),
      admin.from("builder_artifacts").select("*").eq("session_id", sessionId).order("path", { ascending: true }),
      admin.from("deploy_jobs").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
    ]);

  if (!forge || !session) notFound();

  const s = session as BuilderSession;
  const artifactList = (artifacts ?? []) as Artifact[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Forge: {forge.name}</p>
          <h1 className="text-2xl font-bold">Builder Session</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={s.status === "completed" ? "default" : s.status === "failed" ? "destructive" : "secondary"}>
              {s.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{artifactList.length} artifacts</span>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{s.prompt}</p>
          {s.summary && (
            <p className="text-sm mt-2 font-medium">{s.summary}</p>
          )}
        </CardContent>
      </Card>

      {artifactList.length > 0 && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1">
              <ArtifactTree artifacts={artifactList} />
            </div>
            <div className="lg:col-span-2">
              <ArtifactViewer artifacts={artifactList} />
            </div>
          </div>

          {s.status === "completed" && (
            <DeployPanel
              forgeId={forgeId}
              sessionId={sessionId}
              forgeName={forge.name}
              existingJobs={(deployJobs ?? []) as any}
            />
          )}
        </>
      )}
    </div>
  );
}
