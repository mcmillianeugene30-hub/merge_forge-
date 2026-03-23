"use client";

import { useState, useCallback, useMemo } from "react";
import { useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { BoardColumn } from "./board-column";
import { BoardCard } from "./board-card";
import { CreateIssueDialog } from "./create-issue-dialog";
import { useBoardRealtime } from "@/lib/hooks/use-board-realtime";
import { groupIssuesByStatus, getNewPosition } from "@/lib/board";
import { BOARD_COLUMNS } from "@/lib/constants";
import type { BoardStatus, UnifiedIssue, LinkedRepo } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface BoardViewProps {
  forgeId: string;
  initialIssues: UnifiedIssue[];
  repos: LinkedRepo[];
}

export function BoardView({ forgeId, initialIssues, repos }: BoardViewProps) {
  const [issues, setIssues] = useState<UnifiedIssue[]>(initialIssues);
  const [activeIssue, setActiveIssue] = useState<UnifiedIssue | null>(null);
  const [isPending, startTransition] = useTransition();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const grouped = useMemo(
    () => groupIssuesByStatus(issues),
    [issues]
  );

  const refreshBoard = useCallback(() => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/forge/${forgeId}/issues`);
        if (!res.ok) {
          toast.error("Failed to refresh board");
          return;
        }
        const json = await res.json();
        setIssues(json.issues ?? []);
      } catch (error) {
        toast.error("Failed to refresh board");
      }
    });
  }, [forgeId]);

  useBoardRealtime(forgeId, refreshBoard);

  const findIssueById = (id: string): UnifiedIssue | null => {
    return issues.find((issue) => issue.id === id) ?? null;
  };

  const findColumnByItemId = (id: string): BoardStatus | null => {
    // Check if it's a column ID
    const columnIds = BOARD_COLUMNS.map((col) => col.id);
    if (columnIds.includes(id as BoardStatus)) {
      return id as BoardStatus;
    }
    // Otherwise find the issue and return its status
    const issue = findIssueById(id);
    return issue ? (issue.status as BoardStatus) : null;
  };

  const persistMove = async (
    issueId: string,
    status: BoardStatus,
    position: number
  ) => {
    try {
      const res = await fetch(`/api/forge/${forgeId}/issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, position }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Failed to update issue");
        // Refresh to revert optimistic update
        refreshBoard();
      }
    } catch (error) {
      toast.error("Failed to update issue");
      refreshBoard();
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const issue = findIssueById(active.id as string);
    if (issue) {
      setActiveIssue(issue);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIssue = findIssueById(activeId);
    if (!activeIssue) return;

    const overStatus = findColumnByItemId(overId);
    if (!overStatus) return;

    // Only update if moving to a different column
    if (activeIssue.status !== overStatus) {
      setIssues((prev) => {
        return prev.map((issue) =>
          issue.id === activeId
            ? { ...issue, status: overStatus }
            : issue
        );
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveIssue(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeIssue = findIssueById(activeId);
    if (!activeIssue) return;

    const targetStatus = findColumnByItemId(overId);
    if (!targetStatus) return;

    // Get the issues in the target column (excluding the active one)
    const targetIssues = issues.filter(
      (i) => i.status === targetStatus && i.id !== activeId
    );

    // Calculate new position
    const overIndex = targetIssues.findIndex((i) => i.id === overId);
    const newPosition = getNewPosition(
      targetIssues,
      overIndex >= 0 ? overIndex + 1 : targetIssues.length
    );

    // Optimistically update
    setIssues((prev) => {
      if (activeIssue.status === targetStatus) {
        // Same column reorder
        const oldIndex = prev.findIndex((i) => i.id === activeId);
        const newIndex = prev.findIndex((i) => i.id === overId);
        return arrayMove(prev, oldIndex, newIndex).map((issue, idx) => ({
          ...issue,
          position: (idx + 1) * 1000,
        }));
      } else {
        // Cross-column move
        return prev.map((issue) =>
          issue.id === activeId
            ? { ...issue, status: targetStatus, position: newPosition }
            : issue
        );
      }
    });

    // Persist to server
    persistMove(activeId, targetStatus, newPosition);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Unified Board</h2>
          <p className="text-sm text-muted-foreground">
            Drag to update status. Changes sync in realtime.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshBoard}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            )}
          </Button>
          <CreateIssueDialog
            forgeId={forgeId}
            repos={repos}
            onCreated={refreshBoard}
          />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid gap-3 xl:grid-cols-4 lg:grid-cols-2">
          {BOARD_COLUMNS.map((col) => (
            <BoardColumn
              key={col.id}
              id={col.id}
              title={col.title}
              issues={grouped[col.id]}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
          {activeIssue ? <BoardCard issue={activeIssue} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
