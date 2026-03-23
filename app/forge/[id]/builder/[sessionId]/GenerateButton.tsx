"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function GenerateButton({ forgeId, sessionId }: { forgeId: string; sessionId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleGenerate() {
    startTransition(async () => {
      const res = await fetch(`/api/forge/${forgeId}/builder/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error || "Generation failed");
        return;
      }

      toast.success("Files generated!");
      router.refresh();
    });
  }

  return (
    <button onClick={handleGenerate} disabled={isPending} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border">
      {isPending ? "Generating..." : "Generate files"}
    </button>
  );
}
