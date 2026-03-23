import { NextResponse } from "next/server";
import type { User } from '@supabase/supabase-js';
import { requireAuth } from "@/lib/auth";
import { listAllRepos } from "@/lib/github";

export async function GET() {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await import("@/lib/supabase/server").then((m) =>
    m.createClient()
  );

  const { data: githubAccount } = await supabase
    .from("github_accounts")
    .select("access_token")
    .eq("user_id", user.id)
    .single();

  if (!githubAccount) {
    return NextResponse.json(
      { error: "GitHub account not connected" },
      { status: 400 }
    );
  }

  try {
    const repos = await listAllRepos(githubAccount.access_token);
    return NextResponse.json({ repos });
  } catch (error) {
    console.error("Failed to fetch GitHub repos:", error);
    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 }
    );
  }
}
