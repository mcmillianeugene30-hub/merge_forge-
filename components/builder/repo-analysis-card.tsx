"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import type { RepoAnalysisCache } from "@/lib/types";

export function RepoAnalysisCard({
  forgeId,
  analyses,
}: {
  forgeId: string;
  analyses: RepoAnalysisCache[];
}) {
  const [isPending, startTransition] = useTransition();

  function rerun() {
    startTransition(async () => {
      const res = await fetch(`/api/forge/${forgeId}/builder/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "Analysis failed");
        return;
      }

      toast.success("Analysis updated");
      window.location.reload();
    });
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Repo Analysis</h2>
        <button
          onClick={rerun}
          disabled={isPending}
          className="inline-flex items-center gap-1 text-xs"
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-3 w-3 ${isPending ? "animate-spin" : ""}`} />
          Re-analyze
        </button>
      </div>
      <div className="p-4">
        {!analyses || analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No analysis yet — run your first plan to analyze repos
          </p>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <div key={a.id} className="space-y-1">
                <p className="font-mono text-sm">{a.summary?.repo ?? "Unknown repo"}</p>
                <div className="flex flex-wrap gap-1">
                  {(a.services ?? []).slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {(a.env_vars ?? []).length} env vars •{" "}
                  {new Date(a.updated_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
