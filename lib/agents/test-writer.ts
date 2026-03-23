import { SupabaseClient } from '@supabase/supabase-js';
import { callAI } from '@/lib/ai-client';
import { testWriterSystemPrompt, testWriterUserPrompt } from '@/lib/agent-prompts';
import { AgentSSEEvent } from '@/lib/types';
import { ArchitectPlan } from './architect';
import { stripCodeFences, inferLanguageFromPath } from '@/lib/pipeline-utils';

function getTestFilePath(sourcePath: string): string {
  if (sourcePath.startsWith('lib/')) {
    const testDir = sourcePath.replace('lib/', 'lib/__tests__/').replace(/\.ts$/, '.test.ts');
    const parts = testDir.split('/');
    parts.splice(parts.length - 1, 0, '__tests__');
    return parts.join('/').replace('__tests__/__tests__', '__tests__');
  }
  if (sourcePath.startsWith('components/')) {
    return sourcePath.replace('components/', 'components/__tests__/').replace(/\.tsx?$/, '.test.$1');
  }
  if (sourcePath.startsWith('app/api/')) {
    return '__tests__/api/' + sourcePath.replace('app/api/', '').replace(/\//g, '-') + '.test.ts';
  }
  return '__tests__/' + sourcePath.replace(/\//g, '-');
}

function isTestable(file: any): boolean {
  if (file.file_type !== 'source') return false;
  if (file.path.includes('/migrations/')) return false;
  if (file.path.includes('.env')) return false;
  if (file.path.includes('tailwind.config') || file.path.includes('next.config') || file.path.includes('components.json')) return false;
  if (!file.content.includes('export')) return false;
  return true;
}

export async function runTestWriterAgent(params: {
  runId: string;
  plan: ArchitectPlan;
  supabase: SupabaseClient;
  onEvent: (event: AgentSSEEvent) => void;
}): Promise<{ testsWritten: number }> {
  const { runId, plan, supabase, onEvent } = params;

  const { data: files } = await supabase
    .from('agent_files')
    .select('*')
    .eq('run_id', runId)
    .in('status', ['done', 'fixed', 'lint_fixed']);

  const testable = (files ?? []).filter(isTestable);

  onEvent({ type: 'start', agent: 'test_writer', message: `Test Writer generating tests for ${testable.length} files...` });
  await supabase.from('agent_runs').update({ current_agent: 'test_writer' }).eq('id', runId);

  let testsWritten = 0;

  for (const file of testable as any[]) {
    const testPath = getTestFilePath(file.path);
    onEvent({ type: 'file_start', agent: 'test_writer', message: `Writing tests for ${file.path}`, filePath: testPath });

    const result = await callAI({
      role: 'test',
      systemPrompt: testWriterSystemPrompt(),
      userPrompt: testWriterUserPrompt(file.path, file.content, plan),
      maxTokens: 3000,
      temperature: 0.2,
    });

    const content = stripCodeFences(result.content);

    await supabase.from('agent_files').upsert({
      run_id: runId,
      path: testPath,
      content,
      language: inferLanguageFromPath(testPath),
      file_type: 'test',
      status: 'test_written',
    }, { onConflict: 'run_id,path' });

    await supabase.from('agent_files').update({ test_status: 'written' }).eq('id', file.id);

    await supabase.from('agent_test_results').insert({
      run_id: runId,
      test_file_path: testPath,
      source_file_path: file.path,
      status: 'pending',
    });

    onEvent({ type: 'file_done', agent: 'test_writer', message: `Tests written: ${testPath}`, filePath: testPath });
    testsWritten++;
  }

  await supabase.from('agent_runs').update({ tests_written: testsWritten }).eq('id', runId);
  onEvent({ type: 'progress', agent: 'test_writer', message: `${testsWritten} test files written` });
  return { testsWritten };
}
