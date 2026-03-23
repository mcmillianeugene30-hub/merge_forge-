"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { AgentSSEEvent, AgentFile } from "@/lib/types";

export function useAgentEventsRealtime(
  runId: string | null,
  onNewEvent: (e: AgentSSEEvent) => void,
  onFileUpdate: (f: AgentFile) => void
) {
  useEffect(() => {
    if (!runId) return;

    const channel = supabase
      .channel(`agent-run-${runId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_events',
        filter: `run_id=eq.${runId}`,
      }, (payload) => {
        onNewEvent(payload.new as AgentSSEEvent);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'agent_files',
        filter: `run_id=eq.${runId}`,
      }, (payload) => {
        onFileUpdate(payload.new as AgentFile);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'agent_files',
        filter: `run_id=eq.${runId}`,
      }, (payload) => {
        onFileUpdate(payload.new as AgentFile);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId, onNewEvent, onFileUpdate]);
}
