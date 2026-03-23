import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import type { MergeSequenceStep } from "@/lib/types";

interface MergeSequenceCardProps {
  sequence: MergeSequenceStep[];
}

export function MergeSequenceCard({ sequence }: MergeSequenceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Merge Sequence</CardTitle>
        <CardDescription>Recommended order to merge PRs with minimum conflicts.</CardDescription>
      </CardHeader>
      <CardContent>
        {sequence.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sequence — run an analysis first.</p>
        ) : (
          <ol className="space-y-4">
            {sequence.map((step) => (
              <li key={step.step} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {step.step}
                </div>
                <div>
                  <span className="font-medium">PR #{step.pr_number}</span>
                  <span className="text-sm text-muted-foreground ml-1">in {step.repo}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.reason}</p>
                  {step.depends_on.length > 0 && (
                    <p className="text-xs text-amber-600 mt-0.5">
                      Depends on: {step.depends_on.map(n => `PR #${n}`).join(", ")}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
