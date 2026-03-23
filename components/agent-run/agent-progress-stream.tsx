"use client";
import { useAgentRun } from "@/lib/hooks/use-agent-run";
import { AgentSSEEvent } from "@/lib/types";

interface Props {
  forgeId: string;
  runId: string;
  onComplete?: (result: any) => void;
}

const AGENT_COLORS: Record<string, string> = {
  architect: 'border-blue-500',
  codegen: 'border-green-500',
  reviewer: 'border-yellow-500',
  ts_mechanic: 'border-purple-500',
  lint_mechanic: 'border-orange-500',
  test_writer: 'border-pink-500',
  test_runner: 'border-red-500',
  deploy: 'border-emerald-500',
  orchestrator: 'border-indigo-500',
};

export function AgentProgressStream({ forgeId, runId, onComplete }: Props) {
  const { events, files, run, isStreaming, isComplete, error, currentAgent, progress, lastResult } = useAgentRun({ forgeId, runId });

  if (error) return <div className="text-red-500 p-4">Error: {error}</div>;

  return (
    <div className="space-y-4">
      {currentAgent && (
        <div className="flex items-center gap-2 flex-wrap">
          {['architect', 'codegen', 'reviewer', 'ts_mechanic', 'lint_mechanic', 'test_writer', 'test_runner', 'deploy'].map(a => (
            <span key={a}
              className={`text-xs px-2 py-1 rounded-full border-2 ${AGENT_COLORS[a]} ${
                currentAgent === a ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}>
              {a.replace('_', ' ')}
            </span>
          ))}
        </div>
      )}

      {progress && (
        <div className="space-y-1">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary transition-all"
              style={{ width: `${Math.round((progress.completed / Math.max(progress.total, 1)) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{progress.completed}/{progress.total} files</span>
            {progress.testsPass !== undefined && <span>{progress.testsPass} tests passing</span>}
          </div>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto space-y-1 text-sm">
        {events.map((e, i) => (
          <div key={i} className={`border-l-2 ${AGENT_COLORS[e.agent] ?? 'border-muted'} pl-2 py-0.5`}>
            <span className="text-xs font-medium text-muted-foreground">{e.agent}</span>
            <span className="ml-2">{e.message}</span>
            {e.provider && <span className="ml-2 text-xs text-muted-foreground">via {e.provider}</span>}
          </div>
        ))}
      </div>

      {isComplete && lastResult && onComplete && (
        <div className="p-4 border rounded-lg bg-green-500/10">
          <h3 className="font-bold">Build Complete</h3>
          <p>{lastResult.fileCount} files generated</p>
          {lastResult.testsPassed !== undefined && <p>{lastResult.testsPassed} tests passing{lastResult.testsFailed > 0 ? `, ${lastResult.testsFailed} failing` : ''}</p>}
          {lastResult.repoUrl && <a href={lastResult.repoUrl} target="_blank" className="text-blue-500 text-sm">View on GitHub →</a>}
          {lastResult.deployUrl && <a href={lastResult.deployUrl} target="_blank" className="text-blue-500 text-sm ml-4">View on Vercel →</a>}
        </div>
      )}
    </div>
  );
}
