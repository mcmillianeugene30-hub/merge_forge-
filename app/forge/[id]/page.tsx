import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SyncButton } from "@/components/forge/sync-button";
import { BoardView } from "@/components/forge/board-view";
import { RepoPicker } from "@/components/forge/repo-picker";
import { RepoHealthCard } from "@/components/forge/repo-health-card";
import { OverviewStats } from "@/components/forge/overview-stats";
import { ActivityFeedPreview } from "@/components/forge/activity-feed-preview";
import { RunAnalysisButton } from "@/components/merge-center/run-analysis-button";
import { MergeGroupsCard } from "@/components/merge-center/merge-groups-card";
import { MergeSuggestionsCard } from "@/components/merge-center/merge-suggestions-card";
import { MergeRisksCard } from "@/components/merge-center/merge-risks-card";
import { MergeSequenceCard } from "@/components/merge-center/merge-sequence-card";
import { MergeHistoryList } from "@/components/merge-center/merge-history-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MergeAnalysis } from "@/lib/types";

export default async function ForgeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();
  const admin = await getSupabaseAdmin();

  const [
    { data: forge },
    { count: repoCount },
    { count: openIssueCount },
    { count: openPrCount },
    { count: milestoneCount },
    { data: repos },
    { data: activity },
    { data: issues },
    { data: latestMerge },
  ] = await Promise.all([
    supabase.from("forges").select("id, name, description, status").eq("id", id).single(),
    admin.from("linked_repos").select("*", { count: "exact", head: true }).eq("forge_id", id),
    admin.from("unified_issues").select("*", { count: "exact", head: true }).eq("forge_id", id).neq("status", "done"),
    admin.from("pr_activity").select("*", { count: "exact", head: true }).eq("forge_id", id).eq("state", "open"),
    admin.from("forge_milestones").select("*", { count: "exact", head: true }).eq("forge_id", id),
    admin.from("linked_repos").select("*").eq("forge_id", id).order("created_at", { ascending: false }),
    admin.from("activity_events").select("*").eq("forge_id", id).order("created_at", { ascending: false }).limit(8),
    admin.from("unified_issues").select("*").eq("forge_id", id).order("position", { ascending: true }),
    admin.from("merge_analyses").select("*").eq("forge_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (!forge) notFound();

  const stats = {
    repos: repoCount ?? 0,
    openIssues: openIssueCount ?? 0,
    openPrs: openPrCount ?? 0,
    milestones: milestoneCount ?? 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{forge.name}</h1>
            <Badge variant="outline">{forge.status}</Badge>
          </div>
          {forge.description && <p className="text-muted-foreground text-sm mt-1">{forge.description}</p>}
        </div>
        <SyncButton forgeId={id} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="repos">Repos</TabsTrigger>
          <TabsTrigger value="merge-center">Merge Center</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="builder">Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewStats stats={stats} />
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader><CardTitle>Features</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  <p>• Unified Kanban board across {stats.repos} linked repos</p>
                  <p>• AI-powered merge sequencing and PR analysis</p>
                  <p>• GitHub sync for issues and pull requests</p>
                  <p>• App builder: generate full-stack apps from architecture plans</p>
                </CardContent>
              </Card>
              <ActivityFeedPreview events={(activity ?? []) as any[]} />
            </div>
            <RepoHealthCard repos={(repos ?? []) as any[]} />
          </div>
        </TabsContent>

        <TabsContent value="board">
          <BoardView forgeId={id} initialIssues={(issues ?? []) as any[]} repos={(repos ?? []) as any[]} />
        </TabsContent>

        <TabsContent value="repos">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Link Repositories</CardTitle></CardHeader>
              <CardContent><RepoPicker forgeId={id} /></CardContent>
            </Card>
            <RepoHealthCard repos={(repos ?? []) as any[]} />
          </div>
        </TabsContent>

        <TabsContent value="merge-center" className="space-y-4">
          {latestMerge && (latestMerge as MergeAnalysis).status === "completed" ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Latest Analysis</h2>
                  <p className="text-sm text-muted-foreground">AI-powered merge sequencing results</p>
                </div>
                <RunAnalysisButton forgeId={id} />
              </div>
              <div className="grid lg:grid-cols-2 gap-4">
                <MergeGroupsCard groups={(latestMerge as MergeAnalysis).groups} />
                <MergeSuggestionsCard suggestions={(latestMerge as MergeAnalysis).suggestions} />
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/forge/${id}/merge-center`} className="text-sm text-primary underline">View full analysis →</Link>
              </div>
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Merge Center</CardTitle>
                <CardDescription>AI-powered PR relationship analysis and merge sequencing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <RunAnalysisButton forgeId={id} />
                <div>
                  <Link href={`/forge/${id}/merge-center`} className="text-sm text-primary underline">Open Merge Center →</Link>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity">
          <ActivityFeedPreview events={(activity ?? []) as any[]} />
        </TabsContent>

        <TabsContent value="builder">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>App Builder</CardTitle>
                <CardDescription>Generate full-stack apps from architecture plans</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href={`/forge/${id}/builder`}>Open Builder →</Link>
                </Button>
              </CardContent>
            </Card>
            <Card className="border-dashed">
              <CardHeader><CardTitle>Deploy Options</CardTitle></CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>• Download as .zip</p>
                <p>• Push to GitHub (new repo)</p>
                <p>• Deploy to Vercel (one-click)</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
