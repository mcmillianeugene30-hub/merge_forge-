import type { BoardStatus, UnifiedIssue } from "@/lib/types";

export function groupIssuesByStatus(
  issues: UnifiedIssue[]
): Record<BoardStatus, UnifiedIssue[]> {
  const groups: Record<BoardStatus, UnifiedIssue[]> = {
    "todo": [],
    "in-progress": [],
    "review": [],
    "done": [],
  };

  for (const issue of issues) {
    const status = issue.status as BoardStatus;
    if (groups[status]) {
      groups[status].push(issue);
    } else {
      // Default to todo if status is unknown
      groups["todo"].push(issue);
    }
  }

  // Sort each group by position
  for (const status of Object.keys(groups) as BoardStatus[]) {
    groups[status].sort((a, b) => (a.position ?? 1000) - (b.position ?? 1000));
  }

  return groups;
}

export function getNewPosition(
  items: UnifiedIssue[],
  targetIndex: number
): number {
  if (items.length === 0) {
    return 1000;
  }

  if (targetIndex <= 0) {
    // Inserting at the beginning
    const first = items[0];
    return (first.position ?? 1000) / 2;
  }

  if (targetIndex >= items.length) {
    // Inserting at the end
    const last = items[items.length - 1];
    return (last.position ?? 1000) + 1000;
  }

  // Inserting between two items
  const prev = items[targetIndex - 1];
  const next = items[targetIndex];
  return ((prev.position ?? 1000) + (next.position ?? 1000)) / 2;
}

export function rebalancePositions(items: UnifiedIssue[]): UnifiedIssue[] {
  return items.map((item, index) => ({
    ...item,
    position: (index + 1) * 1000,
  }));
}
