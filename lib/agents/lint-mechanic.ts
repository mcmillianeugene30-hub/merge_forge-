import { SupabaseClient } from '@supabase/supabase-js';
import { ESLint } from 'eslint';
import { callAI } from '@/lib/ai-client';
import { lintMechanicSystemPrompt, lintMechanicUserPrompt } from '@/lib/agent-prompts';
import { AgentSSEEvent } from '@/lib/types';
import { stripCodeFences } from '@/lib/pipeline-utils';

export async function runLintMechanicAgent(params: {
  runId: string;
  supabase: SupabaseClient;
  onEvent: (event: AgentSSEEvent) => void;
}): Promise<{ filesFixed: number; totalErrorsFixed: number }> {
  const { runId, supabase, onEvent } = params;

  const { data: files } = await supabase
    .from('agent_files')
    .select('*')
    .eq('run_id', runId)
    .in('status', ['done', 'fixed'])
    .in('language', ['typescript', 'javascript']);

  if (!files || files.length === 0) {
    onEvent({ type: 'progress', agent: 'lint_mechanic', message: 'No TypeScript files to lint' });
    return { filesFixed: 0, totalErrorsFixed: 0 };
  }

  onEvent({ type: 'lint_start', agent: 'lint_mechanic', message: `Linting ${files.length} TypeScript/JavaScript files...` });
  await supabase.from('agent_runs').update({ current_agent: 'lint_mechanic' }).eq('id', runId);

  const eslint = new ESLint({
    baseConfig: {
      rules: {
        '@typescript-eslint/no-unused-vars': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        'react/jsx-no-useless-fragment': 'warn',
        'react-hooks/exhaustive-deps': 'warn',
      },
    },
    fix: false,
    useEslintrc: false,
  });

  let filesFixed = 0, totalErrorsFixed = 0;

  for (const file of files as any[]) {
    const results = await eslint.lintText(file.content, { filePath: file.path });
    const errors = results[0]?.messages ?? [];
    if (errors.length === 0) continue;

    const formatted = errors.map((e: any) => `Line ${e.line}: [${e.ruleId}] ${e.message}`);

    const result = await callAI({
      role: 'mechanic',
      systemPrompt: lintMechanicSystemPrompt(),
      userPrompt: lintMechanicUserPrompt(file.path, file.content, formatted),
      maxTokens: 5000,
      temperature: 0.1,
    });

    const fixed = stripCodeFences(result.content);
    await supabase.from('agent_files').update({
      content: fixed,
      status: 'lint_fixed',
      lint_errors: errors.length,
    }).eq('id', file.id);

    filesFixed++;
    totalErrorsFixed += errors.length;
  }

  await supabase.from('agent_runs').update({ lint_errors_fixed: totalErrorsFixed }).eq('id', runId);
  onEvent({ type: 'lint_done', agent: 'lint_mechanic', message: `${totalErrorsFixed} lint errors fixed across ${filesFixed} files` });
  return { filesFixed, totalErrorsFixed };
}
