import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MergeSuggestion } from "@/lib/types";

interface MergeSuggestionsCardProps {
  suggestions: MergeSuggestion[];
}

const priorityStyles: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

export function MergeSuggestionsCard({ suggestions }: MergeSuggestionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Merge Suggestions</CardTitle>
        <CardDescription>AI-generated recommendations for merge order and approach.</CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No suggestions.</p>
        ) : (
          <div>
            {suggestions.map((s, i) => (
              <div key={i} className={`pb-3 ${i < suggestions.length - 1 ? "border-b" : ""}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${priorityStyles[s.priority] ?? ""}`}>
                    {s.priority}
                  </span>
                  <span className="text-sm font-medium">{s.action}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{s.detail}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
