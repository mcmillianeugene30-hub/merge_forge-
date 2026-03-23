import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { ActivityEvent } from "@/lib/types";

interface ActivityFeedPreviewProps {
  events: ActivityEvent[];
}

const eventTypeColors: Record<string, string> = {
  issue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  pr: "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
  commit: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  comment: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  sync: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
};

export function ActivityFeedPreview({ events }: ActivityFeedPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!events || events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No synced activity yet.</p>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <Badge
                  className={cn(
                    "mt-0.5 shrink-0",
                    eventTypeColors[event.event_type] || eventTypeColors.sync
                  )}
                >
                  {event.event_type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {event.actor} · {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
