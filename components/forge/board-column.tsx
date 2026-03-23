"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { BoardCard } from "./board-card";
import type { BoardStatus, UnifiedIssue } from "@/lib/types";
import { cn } from "@/lib/utils";

interface BoardColumnProps {
  id: BoardStatus;
  title: string;
  issues: UnifiedIssue[];
}

export function BoardColumn({ id, title, issues }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "column",
      status: id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-2xl border bg-muted/30 p-3 transition-colors min-h-[520px]",
        isOver && "bg-primary/5 ring-2 ring-primary ring-inset"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          {title}
        </h3>
        <span className="rounded-full bg-background border text-xs px-2 py-0.5">
          {issues.length}
        </span>
      </div>

      <SortableContext
        items={issues.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex-1 space-y-2">
          {issues.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="border-2 border-dashed border-border rounded-xl w-full py-8 text-center text-sm text-muted-foreground">
                Drop issues here
              </div>
            </div>
          ) : (
            issues.map((issue) => (
              <BoardCard key={issue.id} issue={issue} />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
