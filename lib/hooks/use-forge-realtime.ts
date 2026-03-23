"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseForgeRealtimeOptions {
  forgeId: string;
  onChange: () => void;
}

/**
 * Subscribe to realtime changes for a forge.
 * Stabilize the onChange callback with useCallback in the parent component
 * to avoid re-subscribing on every render.
 */
export function useForgeRealtime({ forgeId, onChange }: UseForgeRealtimeOptions) {
  const supabase = createClient();

  useEffect(() => {
    if (!forgeId) return;

    const channel = supabase
      .channel(`forge:${forgeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unified_issues", filter: `forge_id=eq.${forgeId}` },
        () => onChange()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pr_activity", filter: `forge_id=eq.${forgeId}` },
        () => onChange()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_events", filter: `forge_id=eq.${forgeId}` },
        () => onChange()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [forgeId, onChange, supabase]);
}
