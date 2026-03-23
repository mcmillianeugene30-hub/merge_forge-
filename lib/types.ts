export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Forge {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  status: "active" | "archived";
  created_at: string;
}

export interface ForgeMember {
  forge_id: string;
  user_id: string;
  role: "owner" | "member" | "viewer";
  created_at: string;
}

export interface ForgeMilestone {
  id: string;
  forge_id: string;
  title: string;
  due_date: string | null;
  status: "active" | "completed" | "archived";
  created_at: string;
}

export interface GithubAccount {
  id: string;
  user_id: string;
  github_user_id: number;
  github_login: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedRepo {
  id: string;
  forge_id: string;
  github_account_id: string;
  github_repo_full_name: string;
  github_repo_id: number;
  default_branch: string;
  private: boolean;
  last_synced_at: string | null;
  created_at: string;
}

export type BoardStatus = "todo" | "in-progress" | "review" | "done";

export interface UnifiedIssue {
  id: string;
  forge_id: string;
  source_repo_id: string | null;
  github_issue_number: number | null;
  title: string;
  body: string | null;
  status: string;
  labels: string[];
  assignee_ids: string[];
  milestone: string | null;
  linked_pr_url: string | null;
  github_issue_url: string | null;
  source_type: "github" | "virtual";
  created_at: string;
  updated_at: string;
  // Phase 2 fields
  position?: number;
  source_repo_name?: string | null;
  issue_type?: "issue" | "task" | "bug" | "feature";
  created_by?: string | null;
}

export interface PrActivity {
  id: string;
  forge_id: string;
  repo_id: string;
  pr_number: number;
  title: string;
  state: string;
  author: string;
  pr_url: string;
  related_issue_numbers: number[];
  updated_at: string;
  created_at: string;
  // Phase 2 fields
  mergeable_state?: string | null;
  head_ref?: string | null;
  base_ref?: string | null;
}

export interface ActivityEvent {
  id: string;
  forge_id: string;
  repo_id: string | null;
  event_type: string;
  title: string;
  body: string | null;
  actor: string;
  source_url: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Phase 3: Builder types
export type BuilderStatus = 'draft' | 'analyzing' | 'planning' | 'generating' | 'completed' | 'failed';

export type TargetStack = {
  frontend: string;
  backend: string;
  styling: string;
  auth?: string;
  database?: string;
};

export type RepoAnalysisSummary = {
  repo: string;
  stack: string[];
  dependencies: string[];
  envVars: string[];
  services: string[];
  routes: string[];
  dbModels: string[];
  notes: string[];
};

export type ForgeKnowledge = {
  repos: RepoAnalysisSummary[];
  sharedConcepts: string[];
  conflicts: string[];
  opportunities: string[];
};

export type BuilderPlan = {
  summary: string;
  architecture: {
    frontend: string[];
    backend: string[];
    database: string[];
    integrations: string[];
  };
  pages: Array<{ path: string; title: string; purpose: string }>;
  routes: Array<{ path: string; method: string; purpose: string }>;
  schema: Array<{ table: string; columns: string[] }>;
  env_vars: string[];
  tasks: string[];
};

export type BuilderSession = {
  id: string;
  forge_id: string;
  created_by: string;
  prompt: string;
  target_stack: TargetStack;
  status: BuilderStatus;
  summary: string | null;
  plan: BuilderPlan | Record<string, never>;
  created_at: string;
  updated_at: string;
};

export type BuilderArtifact = {
  id: string;
  session_id: string;
  path: string;
  content: string;
  artifact_type: 'code' | 'plan' | 'schema' | 'env' | 'readme';
  created_at: string;
};

export type RepoAnalysisCache = {
  id: string;
  forge_id: string;
  linked_repo_id: string;
  summary: RepoAnalysisSummary;
  file_map: object[];
  dependencies: string[];
  env_vars: string[];
  services: string[];
  updated_at: string;
};

// Phase 4 — Deploy & Merge types
export type DeployTarget = 'github' | 'vercel' | 'zip';
export type DeployStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface DeployJob {
  id: string;
  session_id: string;
  forge_id: string;
  created_by: string;
  target: DeployTarget;
  status: DeployStatus;
  github_repo_url: string | null;
  vercel_deploy_url: string | null;
  vercel_project_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface MergeGroup {
  label: string;
  pr_numbers: number[];
  issue_numbers: number[];
  reason: string;
}

export interface MergeSuggestion {
  priority: 'high' | 'medium' | 'low';
  action: string;
  detail: string;
}

export interface MergeRisk {
  severity: 'high' | 'medium' | 'low';
  description: string;
  affected_items: string[];
}

export interface MergeSequenceStep {
  step: number;
  pr_number: number;
  repo: string;
  reason: string;
  depends_on: number[];
}

export interface MergeAnalysis {
  id: string;
  forge_id: string;
  created_by: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  pr_ids: string[];
  groups: MergeGroup[];
  suggestions: MergeSuggestion[];
  risks: MergeRisk[];
  merge_sequence: MergeSequenceStep[];
  raw_prompt: string | null;
  created_at: string;
  updated_at: string;
}

export type AgentName = 'architect' | 'codegen' | 'reviewer' | 'ts_mechanic' | 'lint_mechanic' | 'test_writer' | 'test_runner' | 'deploy' | 'orchestrator';
export type AgentEventType = 'start' | 'progress' | 'file_start' | 'file_done' | 'file_error' | 'fix_start' | 'fix_done' | 'test_start' | 'test_pass' | 'test_fail' | 'lint_start' | 'lint_done' | 'deploy_start' | 'deploy_done' | 'complete' | 'error';
export type AgentRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type AgentFileStatus = 'pending' | 'generating' | 'done' | 'error' | 'fixed' | 'lint_fixed' | 'test_written';
export type AgentFileType = 'source' | 'test' | 'config' | 'schema' | 'env' | 'readme';
export type TestStatus = 'pending' | 'written' | 'passing' | 'failing' | 'skipped';
export type AIProvider = 'groq' | 'openrouter' | 'gemini' | 'openai';

export interface AIProviderConfig {
  name: AIProvider;
  baseUrl: string;
  apiKeyEnv: string;
  models: Record<string, string>;
  supportsJsonMode: boolean;
  costTier: 'free' | 'paid';
}

export interface AgentRun {
  id: string; session_id: string; forge_id: string; created_by: string;
  status: AgentRunStatus; current_agent: string | null;
  total_files: number; completed_files: number; failed_files: number;
  tests_written: number; tests_passed: number; tests_failed: number;
  lint_errors_fixed: number;
  plan: BuilderPlan; error_message: string | null;
  started_at: string | null; completed_at: string | null;
  created_at: string; updated_at: string;
}

export interface AgentFile {
  id: string; run_id: string; path: string; content: string;
  language: string; file_type: AgentFileType; status: AgentFileStatus;
  attempts: number; lint_errors: number; test_status: TestStatus | null;
  error_detail: string | null; created_at: string; updated_at: string;
}

export interface AgentTestResult {
  id: string; run_id: string; test_file_path: string; source_file_path: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  output: string | null; error_detail: string | null;
  attempt: number; created_at: string; updated_at: string;
}

export interface AgentSSEEvent {
  type: AgentEventType; agent: AgentName; message: string;
  filePath?: string; fileContent?: string;
  progress?: { completed: number; total: number; testsPass?: number; testsFail?: number };
  provider?: AIProvider;
  metadata?: Record<string, unknown>;
}
