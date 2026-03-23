import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Forge } from "@/lib/types";

interface ForgeHeaderProps {
  forge: Forge;
}

export function ForgeHeader({ forge }: ForgeHeaderProps) {
  return (
    <div className="space-y-4">
      <Link
        href="/dashboard"
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Dashboard
      </Link>
      <div className="flex items-center gap-4">
        <h1 className="text-3xl font-bold">{forge.name}</h1>
        <Badge
          variant={forge.status === "active" ? "default" : "secondary"}
          className={forge.status === "active" ? "bg-green-600" : ""}
        >
          {forge.status}
        </Badge>
      </div>
      {forge.description && (
        <p className="text-muted-foreground">{forge.description}</p>
      )}
    </div>
  );
}
