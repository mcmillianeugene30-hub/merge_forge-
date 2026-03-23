import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from "lucide-react";
import type { MergeRisk } from "@/lib/types";

interface MergeRisksCardProps {
  risks: MergeRisk[];
}

const severityConfig = {
  high: { icon: AlertTriangle, iconClass: "text-red-500", badgeClass: "bg-red-100 text-red-700" },
  medium: { icon: AlertCircle, iconClass: "text-amber-500", badgeClass: "bg-amber-100 text-amber-700" },
  low: { icon: Info, iconClass: "text-slate-500", badgeClass: "bg-slate-100 text-slate-600" },
};

export function MergeRisksCard({ risks }: MergeRisksCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Risks & Conflicts</CardTitle>
        <CardDescription>Potential issues to resolve before merging.</CardDescription>
      </CardHeader>
      <CardContent>
        {risks.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>No risks identified.</span>
          </div>
        ) : (
          <div className="space-y-3">
            {risks.map((risk, i) => {
              const cfg = severityConfig[risk.severity] ?? severityConfig.low;
              const Icon = cfg.icon;
              return (
                <div key={i} className="rounded-xl border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${cfg.iconClass}`} />
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${cfg.badgeClass}`}>
                      {risk.severity}
                    </span>
                    <span className="font-medium text-sm">{risk.description}</span>
                  </div>
                  {risk.affected_items.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Affects: {risk.affected_items.slice(0, 5).join(", ")}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
