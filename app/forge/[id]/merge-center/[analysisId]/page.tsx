import { notFound } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MergeGroupsCard } from "@/components/merge-center/merge-groups-card";
import { MergeSuggestionsCard } from "@/components/merge-center/merge-suggestions-card";
import { MergeRisksCard } from "@/components/merge-center/merge-risks-card";
import { MergeSequenceCard } from "@/components/merge-center/merge-sequence-card";
import type { MergeAnalysis } from "@/lib/types";

export default async function MergeAnalysisDetailPage({
  params,
}: { params: Promise<{ id: string; analysisId: string }> }) {
  const user = await requireUser();
  const { id, analysisId } = await params;
  const supabase = await createClient();

  const [{ data: forge }, { data: analysis }] = await Promise.all([
    supabase.from("forges").select("id, name").eq("id", id).single(),
    supabase.from("merge_analyses").select("*").eq("id", analysisId).eq("forge_id", id).single(),
  ]);

  if (!forge || !analysis) notFound();

  const a = analysis as MergeAnalysis;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/forge/${id}`} className="hover:underline">← {forge.name}</Link>
          <span>/</span>
          <Link href={`/forge/${id}/merge-center`} className="hover:underline">← Merge Center</Link>
        </div>
        <h1 className="text-2xl font-bold">Analysis</h1>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${a.status === "completed" ? "bg-green-100 text-green-700" : a.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.status}</span>
          <span>{a.groups.length} groups · {a.suggestions.length} suggestions · {a.risks.length} risks · {a.merge_sequence.length} steps</span>
          <span>{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <MergeGroupsCard groups={a.groups} />
        <MergeSuggestionsCard suggestions={a.suggestions} />
        <MergeRisksCard risks={a.risks} />
        <MergeSequenceCard sequence={a.merge_sequence} />
      </div>
    </div>
  );
}
