"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { AgentSSEEvent, AgentFile, AgentRun } from "@/lib/types";

export function useAgentRun({
  forgeId,
  runId,
  onEvent,
}: {
  forgeId: string;
  runId: string | null;
  onEvent?: (e: AgentSSEEvent) => void;
}) {
  const [events, setEvents] = useState<AgentSSEEvent[]>([]);
  const [files, setFiles] = useState<AgentFile[]>([]);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const esRef = useRef<EventSource | null>(null);

  const currentAgent = events.length > 0
    ? events[events.length - 1].agent
    : null;

  const progress = (() => {
    const last = [...events].reverse().find(e => e.progress);
    if (!last?.progress) return null;
    return last.progress;
  })();

  const handleEvent = useCallback((e: AgentSSEEvent) => {
    setEvents(prev => [...prev, e]);
    if (e.type === 'complete') {
      setLastResult(e.metadata);
      setIsComplete(true);
      setIsStreaming(false);
    }
    if (e.type === 'stream_end') {
      setIsComplete(true);
      setIsStreaming(false);
    }
    if (e.type === 'error') {
      setError(e.message);
      setIsStreaming(false);
    }
    if (e.filePath) {
      setFiles(prev => {
        const existing = prev.findIndex(f => f.path === e.filePath);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], content: (e.fileContent ?? prev[existing].content) as string } as AgentFile;
          return updated;
        }
        return [...prev, { path: e.filePath!, content: (e.fileContent ?? '') as string } as AgentFile];
      });
    }
    onEvent?.(e);
  }, [onEvent]);

  const refreshRun = useCallback(async () => {
    if (!runId) return;
    const res = await fetch(`/api/forge/${forgeId}/agent-run/${runId}`);
    if (res.ok) {
      const data = await res.json();
      setRun(data.run);
      setFiles(data.files ?? []);
    }
  }, [forgeId, runId]);

  useEffect(() => {
    if (!runId) return;
    setIsStreaming(true);
    setIsComplete(false);
    setError(null);

    const es = new EventSource(`/api/forge/${forgeId}/agent-run?runId=${runId}`);
    esRef.current = es;

    es.onmessage = (evt) => {
      if (evt.data === '') return;
      try {
        const data = JSON.parse(evt.data);
        handleEvent(data);
      } catch {}
    };

    es.onerror = () => {
      setError("Stream connection lost");
      setIsStreaming(false);
      es.close();
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [forgeId, runId, handleEvent]);

  return { events, files, run, isStreaming, isComplete, error, lastResult, currentAgent, progress, refreshRun };
}
