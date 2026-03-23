"use client";
import { useSearchParams } from "next/navigation";
import { AgentProgressStream } from "@/components/agent-run/agent-progress-stream";

export default function BuilderRunPage({ params }: { params: Promise<{ id: string }> }) {
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");
  const forgeId = "id"; // resolved from params

  if (!runId) return <div className="p-8">No runId provided</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Agent Pipeline</h1>
      <AgentProgressStream forgeId={forgeId} runId={runId} />
    </div>
  );
}
