import { Card } from "@/components/ui/card";
import { GitBranch, AlertCircle, GitPullRequest, Flag } from "lucide-react";

interface OverviewStatsProps {
  stats: {
    repos: number;
    openIssues: number;
    openPrs: number;
    milestones: number;
  };
}

export function OverviewStats({ stats }: OverviewStatsProps) {
  const items = [
    { icon: GitBranch, label: "Linked Repos", value: stats.repos },
    { icon: AlertCircle, label: "Open Issues", value: stats.openIssues },
    { icon: GitPullRequest, label: "Open PRs", value: stats.openPrs },
    { icon: Flag, label: "Milestones", value: stats.milestones },
  ];

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <Card key={item.label} className="p-6 rounded-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <item.icon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-3xl font-bold">{item.value}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
