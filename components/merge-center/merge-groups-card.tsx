import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MergeGroup } from "@/lib/types";

interface MergeGroupsCardProps {
  groups: MergeGroup[];
}

export function MergeGroupsCard({ groups }: MergeGroupsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Merge Groups</CardTitle>
        <CardDescription>Related PRs and issues that should be merged together.</CardDescription>
      </CardHeader>
      <CardContent>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">No groups identified — run an analysis to get started.</p>
        ) : (
          <div className="space-y-4">
            {groups.map((group, i) => (
              <div key={i} className="rounded-xl border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{group.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {group.pr_numbers.length} PRs · {group.issue_numbers.length} issues
                  </Badge>
                </div>
                {group.pr_numbers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {group.pr_numbers.map(n => (
                      <Badge key={n} variant="outline" className="text-xs">#{n}</Badge>
                    ))}
                  </div>
                )}
                {group.issue_numbers.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {group.issue_numbers.map(n => (
                      <Badge key={n} variant="secondary" className="text-xs">#{n}</Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{group.reason}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
