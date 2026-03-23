import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight } from "lucide-react";

export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: githubAccount } = await supabase
    .from("github_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Welcome to MergeForge</h1>
          <p className="text-muted-foreground">
            Complete these steps to get started
          </p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Connect GitHub */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  1
                </div>
                <h2 className="text-lg font-semibold">Connect GitHub</h2>
              </div>
              {githubAccount ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="secondary">Not connected</Badge>
              )}
            </div>

            {githubAccount ? (
              <p className="text-sm text-muted-foreground">
                Connected as <span className="font-medium text-foreground">{githubAccount.github_login}</span>
              </p>
            ) : (
              <Button asChild>
                <a href="/api/github/auth">Connect GitHub account</a>
              </Button>
            )}
          </div>

          {/* Step 2: Create your first Forge */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
                  2
                </div>
                <h2 className="text-lg font-semibold">Create your first Forge</h2>
              </div>
            </div>

            {githubAccount ? (
              <Button asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            ) : (
              <div className="space-y-2">
                <Button disabled variant="outline">
                  Go to Dashboard
                </Button>
                <p className="text-xs text-muted-foreground">
                  Connect GitHub first
                </p>
              </div>
            )}
          </div>
        </div>

        {githubAccount && (
          <div className="text-center">
            <Button asChild size="lg">
              <Link href="/dashboard">
                Continue to Dashboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}

        {!githubAccount && (
          <p className="text-center text-sm text-muted-foreground">
            You can skip this and connect GitHub later from Settings
          </p>
        )}
      </div>
    </div>
  );
}
