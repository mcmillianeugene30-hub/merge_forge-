"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { UnifiedIssue } from "@/lib/types";

interface BoardCardProps {
  issue: UnifiedIssue;
}

export function BoardCard({ issue }: BoardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: issue.id,
    data: {
      type: "issue",
      issue,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-2xl border bg-card p-3 shadow-sm cursor-grab active:cursor-grabbing",
        "transition-all duration-150",
        isDragging && "opacity-50 ring-2 ring-primary"
      )}
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2">{issue.title}</h4>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {issue.source_type}
          </Badge>
        </div>

        {issue.body && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {issue.body.slice(0, 120)}
            {issue.body.length > 120 ? "..." : ""}
          </p>
        )}

        <div className="flex flex-wrap gap-1">
          {issue.source_repo_name && (
            <Badge variant="outline" className="text-xs">
              {issue.source_repo_name}
            </Badge>
          )}
          {issue.github_issue_number && (
            <Badge variant="outline" className="text-xs">
              #{issue.github_issue_number}
            </Badge>
          )}
          {issue.issue_type && issue.issue_type !== "issue" && (
            <Badge variant="secondary" className="text-xs capitalize">
              {issue.issue_type}
            </Badge>
          )}
          {issue.labels.slice(0, 2).map((label) => (
            <Badge key={label} variant="secondary" className="text-xs">
              {label}
            </Badge>
          ))}
        </div>

        {issue.github_issue_url && (
          <a
            href={issue.github_issue_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            ↗ open
          </a>
        )}
      </div>
    </div>
  );
}
