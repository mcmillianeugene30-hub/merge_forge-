"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Rocket, Github, CheckCircle2, AlertCircle } from "lucide-react";
import { slugifyName } from "@/lib/pipeline-utils";

interface Props {
  forgeId: string;
  sessionId: string;
  forgeName: string;
}

const AGENTS = ['Architect', 'Codegen', 'Reviewer', 'TS Mechanic', 'Lint Mechanic', 'Test Writer', 'Test Runner', 'Deploy'];

export function AgentPipelineLauncher({ forgeId, sessionId, forgeName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [goal, setGoal] = useState("");
  const [repoName, setRepoName] = useState(slugifyName(forgeName) + "-app");
  const [projectName, setProjectName] = useState(slugifyName(forgeName) + "-app");
  const [isPrivate, setIsPrivate] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) { toast.error("Please describe what you want to build"); return; }

    startTransition(async () => {
      const res = await fetch(`/api/forge/${forgeId}/agent-run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, goal, repoName, projectName, isPrivate }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to start"); return; }
      router.push(`/forge/${forgeId}/builder/run?runId=${data.runId}`);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {['groq', 'openrouter', 'gemini', 'openai'].map(p => (
          <span key={p} className="text-xs px-2 py-1 rounded-full bg-muted flex items-center gap-1">
            {process.env[`NEXT_PUBLIC_${p.toUpperCase()}_CONFIGURED`] === 'true'
              ? <CheckCircle2 className="w-3 h-3 text-green-500" />
              : <AlertCircle className="w-3 h-3 text-yellow-500" />}
            {p}
          </span>
        ))}
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">What do you want to build?</label>
        <textarea
          value={goal}
          onChange={e => setGoal(e.target.value)}
          placeholder="A Slack bot that summarizes GitHub PRs using AI..."
          className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">GitHub Repo Name</label>
          <input value={repoName} onChange={e => setRepoName(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Vercel Project Name</label>
          <input value={projectName} onChange={e => setProjectName(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} />
        Private GitHub repository
      </label>

      <div className="flex gap-1 overflow-x-auto pb-2">
        {AGENTS.map((a, i) => (
          <span key={a} className="text-xs px-2 py-1 rounded-full bg-muted shrink-0">
            {a}{i < AGENTS.length - 1 ? <span className="ml-1 text-muted-foreground">→</span> : null}
          </span>
        ))}
      </div>

      <button type="submit" disabled={isPending}
        className="w-full flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
        <Rocket className="w-4 h-4" />
        {isPending ? "Launching..." : "Launch 8-Agent Pipeline"}
      </button>
    </form>
  );
}
