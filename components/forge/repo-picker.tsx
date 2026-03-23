"use client";

import { useState, useEffect } from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GithubRepo {
  id: number;
  full_name: string;
  private: boolean;
  default_branch: string;
}

interface RepoPickerProps {
  forgeId: string;
  onLinked?: () => void;
}

export function RepoPicker({ forgeId, onLinked }: RepoPickerProps) {
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function fetchRepos() {
      try {
        const res = await fetch("/api/github/repos");
        if (!res.ok) {
          throw new Error("Failed to load GitHub repos");
        }
        const json = await res.json();
        setRepos(json.repos ?? []);
      } catch (err) {
        setError("Failed to load GitHub repos");
      } finally {
        setLoading(false);
      }
    }
    fetchRepos();
  }, []);

  const toggle = (id: number) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const all: Record<number, boolean> = {};
    repos.forEach((r) => (all[r.id] = true));
    setSelected(all);
  };

  const clearAll = () => {
    setSelected({});
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  const submit = () => {
    startTransition(async () => {
      const chosen = repos.filter((r) => selected[r.id]);
      if (chosen.length === 0) {
        toast.error("Please select at least one repo");
        return;
      }

      try {
        const res = await fetch(`/api/forge/${forgeId}/repos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repos: chosen }),
        });

        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error || "Failed to link repos");
        }

        toast.success(`Linked ${chosen.length} repos`);
        setSelected({});
        onLinked?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to link repos");
      }
    });
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (repos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No GitHub repos found. Make sure your GitHub account is connected in
        Settings.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select all
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear
          </Button>
        </div>
        <span className="text-sm text-muted-foreground">
          {selectedCount} selected
        </span>
      </div>

      <div className="max-h-72 overflow-auto rounded-xl border divide-y">
        {repos.map((repo) => (
          <label
            key={repo.id}
            className={cn(
              "flex items-center justify-between p-3 cursor-pointer transition-colors",
              selected[repo.id] && "bg-primary/5"
            )}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{repo.full_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {repo.private ? "private" : "public"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {repo.default_branch}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={!!selected[repo.id]}
              onChange={() => toggle(repo.id)}
              className="ml-4 rounded border-input accent-primary"
            />
          </label>
        ))}
      </div>

      <Button
        onClick={submit}
        disabled={selectedCount === 0 || isPending}
        className="w-full"
      >
        {isPending
          ? `Linking ${selectedCount} repos...`
          : `Link ${selectedCount} selected repos`}
      </Button>
    </div>
  );
}
