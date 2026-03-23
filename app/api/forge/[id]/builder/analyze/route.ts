import { NextRequest, NextResponse } from "next/server";
import type { User } from '@supabase/supabase-js';
import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getImportantFilesFromRepo, extractPackageSignals, buildRepoAnalysisSummary } from "@/lib/github-ingest";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;
    const { id: forgeId } = await params;
    const supabase = await createClient();
    const admin = await getSupabaseAdmin();

    // Get GitHub token
    const { data: githubAccount } = await supabase
      .from("github_accounts")
      .select("access_token")
      .eq("user_id", user.id)
      .single();

    if (!githubAccount?.access_token) {
      return NextResponse.json(
        { error: "GitHub account not connected" },
        { status: 400 }
      );
    }

    // Get linked repos
    const { data: linkedRepos } = await admin
      .from("linked_repos")
      .select("*")
      .eq("forge_id", forgeId);

    if (!linkedRepos || linkedRepos.length === 0) {
      return NextResponse.json(
        { error: "No linked repos for this forge" },
        { status: 400 }
      );
    }

    const results = [];

    for (const repo of linkedRepos) {
      const [owner, name] = repo.github_repo_full_name.split("/");
      if (!owner || !name) continue;

      try {
        const { files } = await getImportantFilesFromRepo(
          githubAccount.access_token,
          owner,
          name,
          repo.default_branch ?? undefined
        );

        const signals = extractPackageSignals(files);
        const summary = buildRepoAnalysisSummary(repo.github_repo_full_name, files, signals);

        const { data: cacheEntry } = await admin
          .from("repo_analysis_cache")
          .upsert(
            {
              forge_id: forgeId,
              linked_repo_id: repo.id,
              summary,
              file_map: files.map(f => ({ path: f.path })),
              dependencies: signals.dependencies,
              env_vars: signals.envVars,
              services: signals.services,
            },
            { onConflict: "forge_id,linked_repo_id" }
          )
          .select()
          .single();

        results.push(cacheEntry);
      } catch (err) {
        console.error(`Failed to analyze ${repo.github_repo_full_name}:`, err);
      }
    }

    return NextResponse.json({ success: true, analyses: results });
  } catch (err) {
    console.error("analyze error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
