import type {
  BuilderStatus,
  BuilderArtifact,
  TargetStack,
} from "@/lib/types";

export function getBuilderStatusLabel(status: BuilderStatus): string {
  switch (status) {
    case "draft": return "Draft";
    case "analyzing": return "Analyzing repos...";
    case "planning": return "Creating plan...";
    case "generating": return "Generating files...";
    case "completed": return "Complete";
    case "failed": return "Failed";
    default: return status;
  }
}

export function getBuilderStatusColor(status: BuilderStatus): string {
  switch (status) {
    case "completed": return "text-green-600";
    case "failed": return "text-red-600";
    case "draft": return "text-muted-foreground";
    case "analyzing":
    case "planning":
    case "generating": return "text-amber-600";
    default: return "text-foreground";
  }
}

export function groupArtifactsByDirectory(
  artifacts: BuilderArtifact[]
): Record<string, BuilderArtifact[]> {
  const groups: Record<string, BuilderArtifact[]> = {};

  for (const artifact of artifacts) {
    const parts = artifact.path.split("/");
    const dir = parts.length > 1 ? parts[0] : "root";

    if (!groups[dir]) groups[dir] = [];
    groups[dir].push(artifact);
  }

  for (const dir of Object.keys(groups)) {
    groups[dir].sort((a, b) => a.path.localeCompare(b.path));
  }

  return groups;
}

export function artifactLanguage(artifact: BuilderArtifact): string {
  const ext = artifact.path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "ts": return "typescript";
    case "tsx": return "typescript";
    case "js": return "javascript";
    case "jsx": return "javascript";
    case "sql": return "sql";
    case "json": return "json";
    case "md": return "markdown";
    case "mdx": return "markdown";
    case "css": return "css";
    case "toml": return "toml";
    default: return "text";
  }
}

export function buildDefaultTargetStack(): TargetStack {
  return {
    frontend: "Next.js 15",
    backend: "Supabase",
    styling: "Tailwind CSS + shadcn/ui",
    auth: "Supabase Auth",
    database: "PostgreSQL",
  };
}
