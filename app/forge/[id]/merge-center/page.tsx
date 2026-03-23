import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { GitPullRequest, AlertCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RunAnalysisButton } from "@/components/merge-center/run-analysis-button";
import { MergeGroupsCard } from "@/components/merge-center/merge-groups-card";
import { MergeSuggestionsCard } from "@/components/merge-center/merge-suggestions-card";
import { MergeRisksCard } from "@/components/merge-center/merge-risks-card";
import { MergeSequenceCard } from "@/components/merge-center/merge-sequence-card";
import { MergeHistoryList } from "@/components/merge-center/merge-history-list";
import type { MergeAnalysis } from "@/lib/types";

export default async function MergeCenterPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const admin = await getSupabaseAdmin();

  const [{ data: forge }, { data: prs }, { data: issues }, { data: latestAnalysis }, { data: history }] =
    await Promise.all([
      supabase.from("forges").select("id, name").eq("id", id).single(),
      admin.from("pr_activity").select("*").eq("forge_id", id).eq("state", "open").order("updated_at", { ascending: false }),
      admin.from("unified_issues").select("*").eq("forge_id", id).neq("status", "done").order("position", { ascending: true }).limit(50),
      admin.from("merge_analyses").select("*").eq("forge_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      admin.from("merge_analyses").select("*").eq("forge_id", id).order("created_at", { ascending: false }).limit(10),
    ]);

  if (!forge) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/forge/${id}`} className="text-sm text-muted-foreground hover:underline">← {forge.name}</Link>
          <h1 className="text-2xl font-bold mt-1">Merge Center</h1>
          <p className="text-muted-foreground text-sm">AI-powered PR analysis and merge sequencing across repos.</p>
        </div>
        <RunAnalysisButton forgeId={id} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <GitPullRequest className="w-4 h-4" />
            <CardTitle className="text-base">Open PRs</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{prs?.length ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <AlertCircle className="w-4 h-4" />
            <CardTitle className="text-base">Open Issues</CardTitle>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{issues?.length ?? 0}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Clock className="w-4 h-4" />
            <CardTitle className="text-base">Last Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestAnalysis ? formatDistanceToNow(new Date(latestAnalysis.created_at), { addSuffix: true }) : "Never"}
            </div>
          </CardContent>
        </Card>
      </div>

      {((!prs || prs.length === 0) && (!issues || issues.length === 0)) ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nothing to analyze yet. Use the Repos tab to sync GitHub issues and PRs first.
            <div className="mt-2">
              <Link href={`/forge/${id}`} className="text-primary text-sm hover:underline">Go to Board →</Link>
            </div>
          </CardContent>
        </Card>
      ) : latestAnalysis && latestAnalysis.status === "completed" ? (
        <>
          <div className="grid lg:grid-cols-2 gap-6">
            <MergeGroupsCard groups={(latestAnalysis as MergeAnalysis).groups} />
            <MergeSuggestionsCard suggestions={(latestAnalysis as MergeAnalysis).suggestions} />
            <MergeRisksCard risks={(latestAnalysis as MergeAnalysis).risks} />
            <MergeSequenceCard sequence={(latestAnalysis as MergeAnalysis).merge_sequence} />
          </div>
          <MergeHistoryList analyses={(history ?? []) as MergeAnalysis[]} forgeId={id} />
        </>
      ) : (
        <MergeHistoryList analyses={(history ?? []) as MergeAnalysis[]} forgeId={id} />
      )}
    </div>
  );
}
