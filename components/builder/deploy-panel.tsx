"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DeployPanelProps {
  forgeId: string;
  sessionId: string;
  forgeName: string;
  existingJobs: Array<{
    id: string;
    status: string;
    deployed_url: string | null;
    created_at: string;
    completed_at: string | null;
  }>;
}

export function DeployPanel({ forgeId, sessionId, forgeName, existingJobs }: DeployPanelProps) {
  const [deploying, setDeploying] = useState(false);

  async function deployToVercel() {
    setDeploying(true);
    try {
      const res = await fetch(`/api/forge/${forgeId}/builder/deploy-vercel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error("Deploy failed");
      toast.success("Deployment started!");
    } catch {
      toast.error("Failed to start deployment");
    } finally {
      setDeploying(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deploy</CardTitle>
        <CardDescription>Ship your generated app to the web</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {existingJobs.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Previous Deployments</p>
            {existingJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center justify-between text-sm border rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <Badge variant={job.status === "completed" ? "default" : job.status === "failed" ? "destructive" : "secondary"}>
                    {job.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{new Date(job.created_at).toLocaleDateString()}</span>
                </div>
                {job.deployed_url && (
                  <a href={job.deployed_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                    Open →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
        <Button onClick={deployToVercel} disabled={deploying} className="w-full">
          {deploying ? "Deploying..." : "Deploy to Vercel"}
        </Button>
      </CardContent>
    </Card>
  );
}
