import { SupabaseClient } from '@supabase/supabase-js';
import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { callAIJSON } from '@/lib/ai-client';
import { testRunnerSystemPrompt, testRunnerUserPrompt } from '@/lib/agent-prompts';
import { AgentSSEEvent } from '@/lib/types';
import { ArchitectPlan } from './architect';
import { MAX_TEST_FIX_ATTEMPTS } from '@/lib/constants';

export async function runTestRunnerAgent(params: {
  runId: string;
  plan: ArchitectPlan;
  supabase: SupabaseClient;
  onEvent: (event: AgentSSEEvent) => void;
}): Promise<{ passed: number; failed: number; fixed: number }> {
  const { runId, plan, supabase, onEvent } = params;

  const { data: results } = await supabase
    .from('agent_test_results')
    .select('*')
    .eq('run_id', runId)
    .eq('status', 'pending');

  if (!results || results.length === 0) {
    onEvent({ type: 'progress', agent: 'test_runner', message: 'No tests to run' });
    return { passed: 0, failed: 0, fixed: 0 };
  }

  onEvent({ type: 'start', agent: 'test_runner', message: `Running ${results.length} test suites...` });
  await supabase.from('agent_runs').update({ current_agent: 'test_runner' }).eq('id', runId);

  const { data: allFiles } = await supabase
    .from('agent_files')
    .select('*')
    .eq('run_id', runId);

  const tmpDir = path.join(os.tmpdir(), `mergeforge-tests-${runId.slice(0, 8)}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  // Write all source + test files to temp dir
  for (const f of (allFiles ?? []) as any[]) {
    const fullPath = path.join(tmpDir, f.path);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, f.content);
  }

  // Write vitest config
  fs.writeFileSync(path.join(tmpDir, 'vitest.config.ts'), `
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node', globals: true } });
`);

  // Write package.json
  fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
    name: 'tests', private: true, scripts: { test: 'vitest run' },
    devDependencies: { vitest: '^3.0.0', '@testing-library/react': '^16.0.0', '@testing-library/jest-dom': '^6.0.0', 'jsdom': '^25.0.0' }
  }, null, 2));

  // Install deps
  try {
    execSync('npm install --silent', { cwd: tmpDir, stdio: 'pipe' });
  } catch {}

  let passed = 0, failed = 0, fixed = 0;

  for (const result of results as any[]) {
    await supabase.from('agent_test_results').update({ status: 'running' }).eq('id', result.id);
    onEvent({ type: 'test_start', agent: 'test_runner', message: `Running ${result.test_file_path}`, filePath: result.test_file_path });

    const testPath = path.join(tmpDir, result.test_file_path);
    if (!fs.existsSync(testPath)) {
      await supabase.from('agent_test_results').update({ status: 'error', error_detail: 'Test file not found' }).eq('id', result.id);
      failed++;
      continue;
    }

    try {
      const output = execSync(`npx vitest run "${testPath}" --reporter=verbose 2>&1`, { cwd: tmpDir, timeout: 60000 }).toString();
      await supabase.from('agent_test_results').update({ status: 'passed', output }).eq('id', result.id);
      const sourceFile = (allFiles ?? []).find((f: any) => f.path === result.source_file_path);
      if (sourceFile) await supabase.from('agent_files').update({ test_status: 'passing' }).eq('id', sourceFile.id);
      onEvent({ type: 'test_pass', agent: 'test_runner', message: `PASSED: ${result.test_file_path}`, filePath: result.test_file_path });
      passed++;
    } catch (err: any) {
      const errorOutput = (err.stdout ?? err.message).toString();
      await supabase.from('agent_test_results').update({ status: 'failed', error_detail: errorOutput }).eq('id', result.id);
      const sourceFile = (allFiles ?? []).find((f: any) => f.path === result.source_file_path);
      if (sourceFile) await supabase.from('agent_files').update({ test_status: 'failing' }).eq('id', sourceFile.id);
      onEvent({ type: 'test_fail', agent: 'test_runner', message: `FAILED: ${result.test_file_path}`, filePath: result.test_file_path, metadata: { output: errorOutput } });

      let attempt = 0;
      while (attempt < MAX_TEST_FIX_ATTEMPTS) {
        attempt++;
        const testContent = fs.readFileSync(testPath, 'utf-8');
        const srcContent = sourceFile?.content ?? '';

        const fixResult = await callAIJSON<{ fixTarget: 'test' | 'source'; fixedContent: string; reasoning: string }>({
          role: 'test',
          systemPrompt: testRunnerSystemPrompt(),
          userPrompt: testRunnerUserPrompt(result.test_file_path, testContent, result.source_file_path, srcContent, errorOutput, attempt),
          maxTokens: 4000,
          temperature: 0.1,
        });

        if (fixResult.fixTarget === 'test') {
          fs.writeFileSync(testPath, fixResult.fixedContent);
          await supabase.from('agent_files').update({ content: fixResult.fixedContent }).eq('run_id', runId).eq('path', result.test_file_path);
        } else if (sourceFile) {
          fs.writeFileSync(path.join(tmpDir, result.source_file_path), fixResult.fixedContent);
          await supabase.from('agent_files').update({ content: fixResult.fixedContent, status: 'fixed' }).eq('id', sourceFile.id);
        }

        try {
          execSync(`npx vitest run "${testPath}" --reporter=verbose 2>&1`, { cwd: tmpDir, timeout: 60000 });
          await supabase.from('agent_test_results').update({ status: 'passed' }).eq('id', result.id);
          if (sourceFile) await supabase.from('agent_files').update({ test_status: 'passing' }).eq('id', sourceFile.id);
          fixed++;
          onEvent({ type: 'test_pass', agent: 'test_runner', message: `Fixed and passed: ${result.test_file_path}`, filePath: result.test_file_path });
          break;
        } catch {
          onEvent({ type: 'test_fail', agent: 'test_runner', message: `Retry ${attempt} still failing: ${result.test_file_path}`, filePath: result.test_file_path });
        }
      }
      failed++;
    }
  }

  // Cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });

  await supabase.from('agent_runs').update({ tests_passed: passed, tests_failed: (results.length - passed) }).eq('id', runId);
  onEvent({ type: 'progress', agent: 'test_runner', message: `Tests complete: ${passed} passed, ${results.length - passed} failed, ${fixed} fixed` });
  return { passed, failed, fixed };
}
