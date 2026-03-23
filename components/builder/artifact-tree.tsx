import Link from "next/link";
import { Folder, File, FileCode, FileText } from "lucide-react";
import { groupArtifactsByDirectory, artifactLanguage } from "@/lib/builder";
import type { BuilderArtifact } from "@/lib/types";

function FileIcon({ artifact }: { artifact: BuilderArtifact }) {
  const lang = artifactLanguage(artifact);
  if (["typescript", "javascript", "sql", "json"].includes(lang)) {
    return <FileCode className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  if (["markdown"].includes(lang)) {
    return <FileText className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  return <File className="h-3.5 w-3.5 text-muted-foreground" />;
}

export function ArtifactTree({
  forgeId,
  sessionId,
  artifacts,
  selectedPath,
}: {
  forgeId: string;
  sessionId: string;
  artifacts: BuilderArtifact[];
  selectedPath?: string;
}) {
  const groups = groupArtifactsByDirectory(artifacts);

  if (!artifacts || artifacts.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">No artifacts generated yet</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="border-b px-4 py-3">
        <h2 className="font-semibold">Generated Files</h2>
      </div>
      <div className="max-h-[600px] overflow-y-auto p-2">
        {Object.entries(groups)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([dir, files]) => (
            <div key={dir} className="mb-3">
              <div className="flex items-center gap-1 px-2 py-1">
                <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase text-muted-foreground">
                  {dir}
                </span>
              </div>
              <div className="space-y-0.5">
                {files.map((artifact) => {
                  const filename = artifact.path.split("/").pop() ?? artifact.path;
                  const isSelected = artifact.path === selectedPath;
                  return (
                    <Link
                      key={artifact.path}
                      href={`/forge/${forgeId}/builder/${sessionId}?path=${encodeURIComponent(artifact.path)}`}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                        isSelected
                          ? "bg-primary/10 text-primary font-medium"
                          : "hover:bg-muted/40"
                      }`}
                    >
                      <FileIcon artifact={artifact} />
                      <span className="truncate">{filename}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {artifact.artifact_type}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
