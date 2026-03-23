import { getOctokit } from "@/lib/github";

export type TreeItem = {
  path: string | undefined;
  type: string | undefined;
  sha: string | undefined;
  size: number | null;
};

const IMPORTANT_FILES = [
  "package.json", "pnpm-lock.yaml", "package-lock.json", "yarn.lock",
  "requirements.txt", "pyproject.toml", "Gemfile",
  "Dockerfile", "docker-compose.yml", "docker-compose.yaml",
  ".env.example", ".env.local.example", ".env.sample",
  "README.md", "README.mdx",
  "next.config.js", "next.config.ts", "next.config.mjs",
  "tsconfig.json", "tailwind.config.js", "tailwind.config.ts",
  "supabase/config.toml", "prisma/schema.prisma",
];

function matchesImportantFile(path: string): boolean {
  const filename = path.split("/").pop() ?? "";
  return (IMPORTANT_FILES as string[]).includes(filename) ||
    (IMPORTANT_FILES as string[]).some(f => path.endsWith("/" + f));
}

export async function getRepoTreeRecursive(
  token: string,
  owner: string,
  repo: string,
  branch?: string
) {
  const octokit = getOctokit(token);

  // Get repo metadata to find default branch
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = branch ?? repoData.default_branch ?? "main";

  // Get branch commit SHA
  const { data: branchData } = await octokit.rest.repos.getBranch({
    owner,
    repo,
    branch: defaultBranch,
  });
  const treeSha = branchData.commit.commit.tree.sha;

  // Get full recursive tree
  const { data } = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: "true",
  });

  return data.tree ?? [];
}

export async function getImportantFilesFromRepo(
  token: string,
  owner: string,
  repo: string,
  branch?: string
) {
  const tree = await getRepoTreeRecursive(token, owner, repo, branch);

  const blobs = (tree as TreeItem[]).filter(
    (item) => item.type === "blob" && item.path && matchesImportantFile(item.path)
  ).slice(0, 25);

  const files: Array<{ path: string; content: string }> = [];
  const octokit = getOctokit(token);

  for (const blob of blobs) {
    if (!blob.path || !blob.sha) continue;
    try {
      const { data } = await octokit.rest.git.getBlob({
        owner,
        repo,
        file_sha: blob.sha,
      });
      const content = Buffer.from(data.content, "base64").toString("utf8");
      files.push({ path: blob.path, content });
    } catch {
      // skip files we can't fetch
    }
  }

  return { tree: tree as TreeItem[], files };
}

export function extractPackageSignals(
  files: Array<{ path: string; content: string }>
) {
  const dependencies: string[] = [];
  const envVars: string[] = [];
  const services: string[] = [];
  const routes: string[] = [];

  const envVarRegex = /[A-Z][A-Z0-9_]{2,}/g;

  for (const file of files) {
    const { path, content } = file;

    if (path === "package.json") {
      try {
        const pkg = JSON.parse(content);
        const allDeps = [
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
        ];
        dependencies.push(...allDeps);
      } catch { /* ignore */ }
    }

    if (
      path?.startsWith(".env") ||
      path?.includes(".env")
    ) {
      const matches = content.match(envVarRegex);
      if (matches) envVars.push(...matches);
    }

    const lc = content.toLowerCase();
    if (lc.includes("supabase")) services.push("supabase");
    if (lc.includes("next")) services.push("next.js");
    if (lc.includes("@octokit")) services.push("github-api");
    if (lc.includes("openai")) services.push("openai");
    if (lc.includes("groq")) services.push("groq");
    if (lc.includes("stripe")) services.push("stripe");
    if (lc.includes("prisma")) services.push("prisma");
    if (lc.includes("drizzle")) services.push("drizzle");
    if (lc.includes("redis")) services.push("redis");
    if (lc.includes("resend") || lc.includes("sendgrid") || lc.includes("nodemailer")) {
      services.push("email");
    }

    if (path?.includes("app/api/") || path?.includes("pages/api/")) {
      routes.push(path);
    }
  }

  return {
    dependencies: [...new Set(dependencies)].sort(),
    envVars: [...new Set(envVars)].sort(),
    services: [...new Set(services)].sort(),
    routes: [...new Set(routes)].sort(),
  };
}

export function buildRepoAnalysisSummary(
  repoFullName: string,
  files: Array<{ path: string; content: string }>,
  signals: ReturnType<typeof extractPackageSignals>
) {
  const { dependencies, envVars, services, routes } = signals;

  const stack: string[] = [];
  if (services.includes("next.js")) stack.push("Next.js");
  if (dependencies.some(d => d.startsWith("react"))) stack.push("React");
  if (dependencies.some(d => d.startsWith("vue"))) stack.push("Vue");
  if (dependencies.some(d => d.startsWith("svelte"))) stack.push("Svelte");
  if (dependencies.some(d => d.includes("express"))) stack.push("Express");
  if (dependencies.some(d => d.includes("fastapi"))) stack.push("FastAPI");
  if (dependencies.some(d => d.includes("django"))) stack.push("Django");
  if (dependencies.some(d => d.includes("rails")) || dependencies.some(d => d.includes("ruby"))) stack.push("Rails");

  return {
    repo: repoFullName,
    stack,
    dependencies,
    envVars,
    services,
    routes,
    dbModels: [] as string[],
    notes: files.map(f => "Indexed: " + f.path),
  };
}
