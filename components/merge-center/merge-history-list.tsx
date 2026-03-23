import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import type { MergeAnalysis } from "@/lib/types";

interface MergeHistoryListProps {
  analyses: MergeAnalysis[];
  forgeId?: string;
}

const statusBadge = (status: string) => {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    running: "bg-amber-100 text-amber-700",
    pending: "bg-amber-100 text-amber-700",
  };
  return <Badge className={styles[status] ?? ""}>{status}</Badge>;
};

export function MergeHistoryList({ analyses, forgeId }: MergeHistoryListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis History</CardTitle>
      </CardHeader>
      <CardContent>
        {analyses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No analyses run yet.</p>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <div key={a.id} className="border-b pb-3 last:border-b-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {statusBadge(a.status)}
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {forgeId && a.status === "completed" && (
                    <Link href={`/forge/${forgeId}/merge-center/${a.id}`} className="text-xs text-primary">
                      View details →
                    </Link>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {a.groups.length} groups · {a.suggestions.length} suggestions · {a.risks.length} risks
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
