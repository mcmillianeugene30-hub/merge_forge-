"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import type { LinkedRepo } from "@/lib/types";

interface CreateIssueDialogProps {
  forgeId: string;
  repos: LinkedRepo[];
  onCreated?: () => void;
}

export function CreateIssueDialog({
  forgeId,
  repos,
  onCreated,
}: CreateIssueDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sourceRepoId, setSourceRepoId] = useState("");
  const [createInGithub, setCreateInGithub] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (createInGithub && !sourceRepoId) {
      toast.error("Please select a repository");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/forge/${forgeId}/issues`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            sourceRepoId: createInGithub ? sourceRepoId : null,
            createInGithub,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          toast.error(json.error ?? "Failed to create issue");
          return;
        }

        toast.success("Issue created");
        setTitle("");
        setBody("");
        setSourceRepoId("");
        setCreateInGithub(false);
        setOpen(false);
        onCreated?.();
      } catch (error) {
        toast.error("Something went wrong");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Issue</DialogTitle>
          <DialogDescription>
            Add a virtual issue or create directly in GitHub
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium">
              Title
            </label>
            <Input
              id="title"
              placeholder="Issue title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="body" className="text-sm font-medium">
              Description (optional)
            </label>
            <Textarea
              id="body"
              placeholder="Describe the issue..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              disabled={isPending}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="createInGithub"
              checked={createInGithub}
              onChange={(e) => setCreateInGithub(e.target.checked)}
              className="rounded border-input"
            />
            <label htmlFor="createInGithub" className="text-sm">
              Also create this issue in GitHub
            </label>
          </div>
          {createInGithub && (
            <div className="space-y-2">
              <label htmlFor="sourceRepoId" className="text-sm font-medium">
                Repository
              </label>
              {repos.length === 0 ? (
                <p className="text-sm text-destructive">
                  No repos linked — add repos in the Repos tab first
                </p>
              ) : (
                <select
                  id="sourceRepoId"
                  value={sourceRepoId}
                  onChange={(e) => setSourceRepoId(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select a repository</option>
                  {repos.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.github_repo_full_name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isPending ||
                !title.trim() ||
                (createInGithub && !sourceRepoId)
              }
            >
              {isPending ? "Creating..." : "Create Issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
