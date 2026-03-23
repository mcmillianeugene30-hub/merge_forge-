import Link from "next/link";
import { Bot } from "lucide-react";
import { getBuilderStatusLabel, getBuilderStatusColor } from "@/lib/builder";
import type { BuilderSession } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

export function BuilderSessionList({
  forgeId,
  sessions,
}: {
  forgeId: string;
  sessions: BuilderSession[];
}) {
  if (!sessions || sessions.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No sessions yet"
        description="Run your first analysis above"
      />
    );
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="font-semibold">Builder Sessions</h2>
      </div>
      <div className="divide-y">
        {[...sessions]
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map((session) => (
            <Link
              key={session.id}
              href={`/forge/${forgeId}/builder/${session.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{session.prompt}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs font-medium ml-4 ${getBuilderStatusColor(session.status)}`}
              >
                {getBuilderStatusLabel(session.status)}
              </span>
            </Link>
          ))}
      </div>
    </div>
  );
}
