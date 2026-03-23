"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Zap, LayoutDashboard, Settings, GitBranch, Loader2 } from "lucide-react";
import type { Forge } from "@/lib/types";

export function AppSidebar() {
  const pathname = usePathname();

  const { data: forges, isLoading } = useQuery({
    queryKey: ["forges"],
    queryFn: async () => {
      const res = await fetch("/api/forges");
      if (!res.ok) throw new Error("Failed to fetch forges");
      const data = await res.json();
      return (data.forges ?? []) as Forge[];
    },
  });

  return (
    <aside className="hidden md:flex flex-col w-56 border-r border-border bg-card h-screen sticky top-0">
      <div className="p-4 border-b border-border">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Zap className="h-6 w-6 text-orange-500" />
          <span className="text-lg font-bold">
            Merge<span className="text-orange-500">Forge</span>
          </span>
        </Link>
      </div>

      <nav className="p-4 space-y-1">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/dashboard"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </nav>

      <div className="p-4 border-t border-border">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Your Forges
        </div>
        {isLoading ? (
          <div className="space-y-2">
            <div className="h-8 rounded-lg bg-muted animate-pulse" />
            <div className="h-8 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : forges && forges.length > 0 ? (
          <div className="space-y-1">
            {forges.map((forge) => (
              <Link
                key={forge.id}
                href={`/forge/${forge.id}`}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors",
                  pathname === `/forge/${forge.id}`
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <GitBranch className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{forge.name}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No forges yet</p>
        )}
      </div>
    </aside>
  );
}
