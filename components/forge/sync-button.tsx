"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface SyncButtonProps {
  forgeId: string;
  onSynced?: () => void;
}

export function SyncButton({ forgeId, onSynced }: SyncButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleSync = () => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/forge/${forgeId}/sync`, {
          method: "POST",
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Sync failed");
        }

        toast.success("Sync complete — issues and PRs imported");
        onSynced?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Sync failed");
      }
    });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 mr-2" />
          Sync GitHub
        </>
      )}
    </Button>
  );
}
