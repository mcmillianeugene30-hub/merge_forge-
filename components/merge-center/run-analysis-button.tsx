"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitMerge, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface RunAnalysisButtonProps {
  forgeId: string;
  onComplete?: () => void;
}

export function RunAnalysisButton({ forgeId, onComplete }: RunAnalysisButtonProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const run = () => {
    startTransition(async () => {
      const res = await fetch(`/api/forge/${forgeId}/merge-center`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Analysis failed");
      } else {
        toast.success("Analysis complete");
        onComplete?.();
        router.refresh();
      }
    });
  };

  return (
    <Button onClick={run} disabled={pending} variant="default">
      {pending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GitMerge className="w-4 h-4 mr-2" />}
      {pending ? "Analyzing..." : "Run Merge Analysis"}
    </Button>
  );
}
