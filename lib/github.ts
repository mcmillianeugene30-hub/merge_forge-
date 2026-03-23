import { Octokit } from "@octokit/rest";

export function getOctokit(token: string) {
  return new Octokit({ auth: token });
}

export async function listAllRepos(token: string) {
  const octokit = getOctokit(token);
  const response = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    affiliation: "owner,collaborator,organization_member",
    sort: "updated",
  });

  return response.map((repo) => ({
    id: repo.id,
    full_name: repo.full_name,
    private: repo.private,
    default_branch: repo.default_branch,
  }));
}

export async function listRepoIssues(token: string, owner: string, repo: string) {
  const octokit = getOctokit(token);
  const response = await octokit.paginate(octokit.issues.listForRepo, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });

  return response.map((issue) => ({
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    labels: issue.labels.map((l) => l.name),
    html_url: issue.html_url,
    updated_at: issue.updated_at,
  }));
}

export async function listRepoPRs(token: string, owner: string, repo: string) {
  const octokit = getOctokit(token);
  const response = await octokit.paginate(octokit.pulls.list, {
    owner,
    repo,
    state: "open",
    per_page: 100,
  });

  return response.map((pr) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    user: pr.user?.login ?? "unknown",
    html_url: pr.html_url,
    body: pr.body,
    updated_at: pr.updated_at,
  }));
}
