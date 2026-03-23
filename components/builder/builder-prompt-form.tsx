"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Wand2 } from "lucide-react";
import { buildDefaultTargetStack } from "@/lib/builder";

export function BuilderPromptForm({ forgeId }: { forgeId: string }) {
  const [prompt, setPrompt] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function runPlan() {
    if (!prompt.trim()) return;

    startTransition(async () => {
      // Step 1: Analyze repos
      const analyzeRes = await fetch(`/api/forge/${forgeId}/builder/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const analyzeJson = await analyzeRes.json();

      if (!analyzeRes.ok) {
        toast.error(analyzeJson.error || "Repo analysis failed");
        return;
      }

      const repoCount = analyzeJson.analyses?.length ?? 0;
      toast.success(`Repos analyzed — ${repoCount} repos indexed`);

      // Step 2: Create plan
      const planRes = await fetch(`/api/forge/${forgeId}/builder/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          targetStack: buildDefaultTargetStack(),
        }),
      });

      const planJson = await planRes.json();

      if (!planRes.ok) {
        toast.error(planJson.error || "Plan creation failed");
        return;
      }

      toast.success("Plan created");
      router.push(`/forge/${forgeId}/builder/${planJson.sessionId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">
        Describe the app you want to build
      </label>
      <textarea
        className="w-full min-h-[120px] rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        placeholder="e.g. Build a project management dashboard that combines the auth from repo A and the issue tracker from repo B..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        MergeForge will analyze your linked repos, then plan and scaffold a new app.
      </p>
      <button
        onClick={runPlan}
        disabled={isPending || !prompt.trim()}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Running analysis + plan...
          </>
        ) : (
          <>
            <Wand2 className="mr-2 h-4 w-4" />
            Analyze repos + create plan
          </>
        )}
      </button>
    </div>
  );
}
