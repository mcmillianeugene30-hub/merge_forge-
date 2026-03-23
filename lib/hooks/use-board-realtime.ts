"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribe to realtime changes for the forge board.
 * Stabilize the onChange callback with useCallback in the parent component
 * to avoid re-subscribing on every render.
 */
export function useBoardRealtime(
  forgeId: string,
  onRefresh: () => void
) {
  const supabase = createClient();

  useEffect(() => {
    if (!forgeId) return;

    const channel = supabase
      .channel(`forge-board-${forgeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "unified_issues",
          filter: `forge_id=eq.${forgeId}`,
        },
        () => onRefresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pr_activity",
          filter: `forge_id=eq.${forgeId}`,
        },
        () => onRefresh()
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_events",
          filter: `forge_id=eq.${forgeId}`,
        },
        () => onRefresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [forgeId, onRefresh, supabase]);
}
