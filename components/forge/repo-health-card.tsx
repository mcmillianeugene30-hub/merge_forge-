import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import type { LinkedRepo } from "@/lib/types";

interface RepoHealthCardProps {
  repos: LinkedRepo[];
}

export function RepoHealthCard({ repos }: RepoHealthCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Linked Repositories</CardTitle>
      </CardHeader>
      <CardContent>
        {!repos || repos.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No repositories linked yet.
          </p>
        ) : (
          <div className="space-y-3">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm truncate">
                    {repo.github_repo_full_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {repo.private ? "private" : "public"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {repo.last_synced_at
                        ? `Synced ${formatDistanceToNow(new Date(repo.last_synced_at), { addSuffix: true })}`
                        : "Never synced"}
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled>
                  Sync
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
