import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  async function signInWithGitHub() {
    "use server";
    const supabase = await createClient();
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard`;
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo,
      },
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <Zap className="h-8 w-8 text-orange-500" />
            <span className="text-2xl font-bold">
              Merge<span className="text-orange-500">Forge</span>
            </span>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-bold mb-2">Welcome to MergeForge</h1>
            <p className="text-sm text-muted-foreground mb-8">
              Sign in with your GitHub account to continue
            </p>
            <form action={signInWithGitHub}>
              <Button type="submit" size="lg" className="w-full">
                Continue with GitHub
              </Button>
            </form>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              By signing in you agree to our terms
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
