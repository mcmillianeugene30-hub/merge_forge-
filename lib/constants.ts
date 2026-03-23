export const APP_NAME = "MergeForge";

export const FORGE_ROLES = ["owner", "member", "viewer"] as const;

export const ISSUE_STATUSES = ["todo", "in-progress", "review", "done"] as const;

export const EVENT_TYPES = ["issue", "pr", "commit", "comment", "sync"] as const;

export const GITHUB_OAUTH_SCOPES = "repo read:user user:email";

import type { BoardStatus } from "@/lib/types";

export const BOARD_COLUMNS: Array<{
  id: BoardStatus;
  title: string;
  description: string;
}> = [
  {
    id: "todo",
    title: "To Do",
    description: "Not started yet",
  },
  {
    id: "in-progress",
    title: "In Progress",
    description: "Actively being worked on",
  },
  {
    id: "review",
    title: "Review",
    description: "Awaiting review or approval",
  },
  {
    id: "done",
    title: "Done",
    description: "Completed",
  },
];

export const ISSUE_TYPES: Array<{ id: string; label: string }> = [
  { id: "issue", label: "Issue" },
  { id: "task", label: "Task" },
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature" },
];

export const AGENT_NAMES: Record<AgentName, string> = {
  architect: 'Architect', codegen: 'Code Generator', reviewer: 'Reviewer',
  ts_mechanic: 'TypeScript Mechanic', lint_mechanic: 'Lint Mechanic',
  test_writer: 'Test Writer', test_runner: 'Test Runner',
  deploy: 'Deploy', orchestrator: 'Orchestrator',
};

export const MAX_FIX_ATTEMPTS = 3;
export const MAX_TEST_FIX_ATTEMPTS = 2;

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    costTier: 'free',
    supportsJsonMode: true,
    models: {
      architect: 'llama-3.3-70b-versatile',
      codegen: 'llama-3.1-8b-instant',
      reviewer: 'llama-3.3-70b-versatile',
      mechanic: 'llama-3.3-70b-versatile',
      test: 'llama-3.1-8b-instant',
    },
  },
  {
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    costTier: 'free',
    supportsJsonMode: false,
    models: {
      architect: 'meta-llama/llama-3.3-70b-instruct:free',
      codegen: 'google/gemma-3-27b-it:free',
      reviewer: 'deepseek/deepseek-r1:free',
      mechanic: 'meta-llama/llama-3.3-70b-instruct:free',
      test: 'google/gemma-3-27b-it:free',
    },
  },
  {
    name: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeyEnv: 'GEMINI_API_KEY',
    costTier: 'free',
    supportsJsonMode: false,
    models: {
      architect: 'gemini-2.0-flash',
      codegen: 'gemini-1.5-flash',
      reviewer: 'gemini-2.0-flash',
      mechanic: 'gemini-2.0-flash',
      test: 'gemini-1.5-flash',
    },
  },
  {
    name: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    costTier: 'paid',
    supportsJsonMode: true,
    models: {
      architect: 'gpt-4o-mini',
      codegen: 'gpt-4o-mini',
      reviewer: 'gpt-4o-mini',
      mechanic: 'gpt-4o-mini',
      test: 'gpt-4o-mini',
    },
  },
];

