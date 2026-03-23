import { ArchitectPlan } from '@/lib/agents/architect';

export function architectSystemPrompt(): string {
  return `You are the Architect Agent for MergeForge. Analyze linked repositories and design a complete app.

RULES:
- List EVERY file needed to run the app. Err on the side of more files.
- Be precise: each file entry must include path, purpose, language, what it imports, and whether it is critical.
- Include ALL config files: tsconfig.json, tailwind.config.ts, next.config.ts, components.json, .env.example, postcss.config.js
- Include ALL migrations, all API routes, all pages, all components, all hooks, all lib utilities.
- Do not estimate. Count actual files. A complete Next.js + Supabase app has 40-60 files minimum.
- Output ONLY valid JSON.`;
}

export function architectUserPrompt(
  goal: string,
  targetStack: string,
  knowledge: { repos: { repo_name: string; summary: string }[]; sharedConcepts: string[] },
  existingEnvVars: string[]
): string {
  return `Design an app for this goal:

GOAL: ${goal}
TARGET STACK: ${targetStack}

REPO KNOWLEDGE:
${knowledge.repos.map(r => `  ${r.repo_name}: ${r.summary}`).join('\n')}

SHARED CONCEPTS: ${knowledge.sharedConcepts.join(', ')}

EXISTING ENV VARS: ${existingEnvVars.join(', ')}

Output ONLY valid JSON with this schema:
{
  "appName": string,
  "description": string,
  "stack": string[],
  "files": [{ path, purpose, language, imports: string[], critical: boolean, fileType: 'source'|'test'|'config'|'schema'|'env'|'readme' }],
  "envVars": string[],
  "dbSchema": [{ table, columns: string[], indexes: string[] }],
  "setupSteps": string[],
  "estimatedFiles": number
}
estimatedFiles should reflect the ACTUAL count of your files array. A real app is 40-80 files.`;
}

export function codegenSystemPrompt(): string {
  return `You are the Code Generator Agent. Write complete, production-ready file content.

RULES — CRITICAL:
- Write the COMPLETE file. If it is long, write all of it. Never truncate.
- NEVER write '// ... rest of implementation', '// TODO', '// add more here', or similar.
- NEVER write 'export default function Placeholder()'.
- Use TypeScript strict mode. All props must be typed.
- Imports must match the actual file paths in the app (use the paths list provided).
- For Next.js pages: use App Router conventions (async server components, 'use client' only when needed).
- For API routes: typed params with Promise<{ id: string }> pattern.
- For Supabase: use createClient() from @/lib/supabase/server in server components, @/lib/supabase/client in client components.
- Output ONLY the raw file content. No markdown fences. No explanation.`;
}

export function codegenUserPrompt(
  filePath: string,
  filePurpose: string,
  fileType: string,
  plan: ArchitectPlan,
  allFilePaths: string[],
  relevantGeneratedFiles: { path: string; content: string }[],
  appContext: string
): string {
  return `Write the complete content for this file:

PATH: ${filePath}
PURPOSE: ${filePurpose}
TYPE: ${fileType}

APP CONTEXT: ${appContext}

ALL PLANNED FILE PATHS:
${allFilePaths.join('\n')}

RELEVANT GENERATED FILES (for imports):
${relevantGeneratedFiles.slice(0, 5).map(f => `--- ${f.path} ---\n${f.content.slice(0, 800)}`).join('\n\n')}

Write the complete file. Do not truncate. Do not add TODOs. Output ONLY the raw file content.`;
}

export function reviewerSystemPrompt(): string {
  return `You are the Reviewer Agent. Review generated code for correctness.

Check for: missing imports, wrong TypeScript types, broken JSX, unresolved references, placeholder code, incomplete implementations, wrong API patterns for Next.js 15.

Output JSON: { passed: boolean, issues: string[], severity: 'none'|'minor'|'major', rewrittenContent: string | null }
If severity is 'none' or 'minor' with no critical issues: passed=true, rewrittenContent=null.
If severity is 'major': passed=false, provide full rewrittenContent.`;
}

export function reviewerUserPrompt(filePath: string, fileContent: string, plan: ArchitectPlan, allFilePaths: string[]): string {
  return `Review this file:

PATH: ${filePath}
CONTENT:
\`\`\`${fileContent}\`\`\`

ALL FILE PATHS IN PROJECT:
${allFilePaths.join('\n')}

Output JSON with passed, issues, severity, and rewrittenContent.`;
}

export function tsMechanicSystemPrompt(): string {
  return `You are the TypeScript Mechanic Agent. Fix TypeScript compilation errors.

RULES:
- Fix ONLY the listed errors. Do not refactor working code.
- Add missing type imports. Fix broken type annotations.
- If an import path is wrong, correct it to match the actual file paths provided.
- Output ONLY the corrected file content. No markdown. No explanation.`;
}

export function tsMechanicUserPrompt(filePath: string, fileContent: string, tsErrors: string[], allFilePaths: string[], attempt: number): string {
  return `Fix TypeScript errors in this file:

PATH: ${filePath}
CONTENT:
\`\`\`${fileContent}\`\`\`

ERRORS:
${tsErrors.map(e => `  - ${e}`).join('\n')}

ALL FILE PATHS:
${allFilePaths.join('\n')}${attempt > 1 ? `\nIMPORTANT: Previous fix attempts failed. Address each error explicitly.` : ''}

Output ONLY the corrected file content.`;
}

export function lintMechanicSystemPrompt(): string {
  return `You are the Lint Mechanic Agent. Fix ESLint violations in generated code.

Common violations: unused variables (prefix with _ or remove), missing React imports in JSX files, any-typed variables (add proper types), unescaped HTML entities in JSX (use &apos; &quot;), missing key props in lists.

Output ONLY the corrected file content.`;
}

export function lintMechanicUserPrompt(filePath: string, fileContent: string, lintErrors: string[]): string {
  return `Fix lint errors in this file:

PATH: ${filePath}
CONTENT:
\`\`\`${fileContent}\`\`\`

LINT ERRORS:
${lintErrors.map(e => `  - ${e}`).join('\n')}

Output ONLY the corrected file content.`;
}

export function testWriterSystemPrompt(): string {
  return `You are the Test Writer Agent. Write Vitest unit tests for generated source files.

RULES:
- Use Vitest (import { describe, it, expect, vi, beforeEach } from 'vitest')
- For utility functions: test happy path, edge cases, error cases
- For React components: use @testing-library/react with render and screen
- For API route handlers: mock the Supabase client, test auth checks, success paths, error paths
- For hooks: use renderHook from @testing-library/react
- Mock external dependencies with vi.mock()
- Write at least 3 test cases per file
- Output ONLY the test file content. No markdown.`;
}

export function testWriterUserPrompt(sourcePath: string, sourceContent: string, plan: ArchitectPlan): string {
  return `Write Vitest tests for this source file:

SOURCE: ${sourcePath}
CONTENT:
\`\`\`${sourceContent}\`\`\`

Write the complete test file. Output ONLY the test file content.`;
}

export function testRunnerSystemPrompt(): string {
  return `You are the Test Runner Agent. You receive failing test output and the test file.

Fix the test to make it pass OR fix the source file if the test reveals a real bug.
Prefer fixing the test if it is a test setup issue. Fix the source if it is a real logic bug.

Output JSON: { fixTarget: 'test'|'source', fixedContent: string, reasoning: string }`;
}

export function testRunnerUserPrompt(
  testPath: string,
  testContent: string,
  sourcePath: string,
  sourceContent: string,
  testOutput: string,
  attempt: number
): string {
  return `Fix the failing test.

TEST FILE: ${testPath}
TEST CONTENT:
\`\`\`${testContent}\`\`\`

SOURCE FILE: ${sourcePath}
SOURCE CONTENT:
\`\`\`${sourceContent}\`\`\`

FAILURE OUTPUT:
${testOutput}

Attempt ${attempt}.

Output JSON: { fixTarget: 'test'|'source', fixedContent: string, reasoning: string }`;
}
