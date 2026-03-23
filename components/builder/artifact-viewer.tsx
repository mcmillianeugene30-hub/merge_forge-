import { EmptyState } from "@/components/empty-state";
import { artifactLanguage } from "@/lib/builder";
import type { BuilderArtifact } from "@/lib/types";
import { FileSearch } from "lucide-react";

export function ArtifactViewer({
  artifact,
  sessionId,
  forgeId,
}: {
  artifact: BuilderArtifact | null;
  sessionId?: string;
  forgeId?: string;
}) {
  if (!artifact) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={FileSearch}
          title="Select a file"
          description="Choose a file from the tree to view its content"
        />
      </div>
    );
  }

  const lineCount = artifact.content.split("\n").length;
  const lang = artifactLanguage(artifact);

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <code className="font-mono text-sm truncate">{artifact.path}</code>
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs">
            {artifact.artifact_type}
          </span>
        </div>
        {sessionId && forgeId && (
          <a
            href={`/api/forge/${forgeId}/builder/export?sessionId=${sessionId}`}
            className="ml-2 text-xs text-muted-foreground hover:text-foreground whitespace-nowrap"
          >
            Download ↓
          </a>
        )}
      </div>
      <pre className="max-h-[680px] overflow-auto rounded-b-xl bg-muted/40 border p-4 text-xs font-mono leading-relaxed">
        <code>{artifact.content}</code>
      </pre>
      <div className="border-t px-4 py-2">
        <p className="text-xs text-muted-foreground">
          {lineCount} lines • {lang}
        </p>
      </div>
    </div>
  );
}
