import { SupabaseClient } from '@supabase/supabase-js';
import * as ts from 'typescript';
import { callAI } from '@/lib/ai-client';
import { tsMechanicSystemPrompt, tsMechanicUserPrompt } from '@/lib/agent-prompts';
import { AgentSSEEvent } from '@/lib/types';
import { ArchitectPlan } from './architect';
import { stripCodeFences } from '@/lib/pipeline-utils';
import { MAX_FIX_ATTEMPTS } from '@/lib/constants';

export async function runTsMechanicAgent(params: {
  runId: string;
  plan: ArchitectPlan;
  supabase: SupabaseClient;
  onEvent: (event: AgentSSEEvent) => void;
}): Promise<{ fixed: number; gaveUp: number }> {
  const { runId, plan, supabase, onEvent } = params;

  const { data: files } = await supabase
    .from('agent_files')
    .select('*')
    .eq('run_id', runId)
    .in('status', ['done', 'fixed', 'error']);

  const fileMap: Record<string, string> = {};
  (files ?? []).forEach((f: any) => { fileMap[f.path] = f.content; });

  const allPaths = Object.keys(fileMap);

  function checkFile(path: string, content?: string): string[] {
    const src = content ?? fileMap[path];
    if (!src) return [];
    const sourceFile = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true);
    const program = ts.createProgram([path], {}, {
      getSourceFile: (f) => f === path ? sourceFile : undefined,
      fileExists: (f) => f in fileMap || f === path,
      readFile: (f) => fileMap[f] ?? undefined,
      getDefaultLibFileName: () => 'lib.d.ts',
      writeFile: () => {},
      getCurrentDirectory: () => '',
      getDirectories: () => [],
      getCanonicalFileName: (f) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
    } as any);
    const diagnostics = [
      ...program.getSyntacticDiagnostics(sourceFile),
      ...program.getSemanticDiagnostics(sourceFile),
    ];
    return diagnostics.map(d => {
      const pos = sourceFile.getLineAndCharacterOfPosition(d.start ?? 0);
      return `Line ${pos.line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, '\n')}`;
    });
  }

  const errorsByFile: Record<string, string[]> = {};
  for (const path of allPaths) {
    const errors = checkFile(path);
    if (errors.length > 0) errorsByFile[path] = errors;
  }

  const errorFiles = Object.keys(errorsByFile);
  if (errorFiles.length === 0) {
    onEvent({ type: 'progress', agent: 'ts_mechanic', message: 'TypeScript check passed — no errors found' });
    return { fixed: 0, gaveUp: 0 };
  }

  onEvent({ type: 'start', agent: 'ts_mechanic', message: `TypeScript Mechanic fixing ${errorFiles.length} files with TS errors...` });
  await supabase.from('agent_runs').update({ current_agent: 'ts_mechanic' }).eq('id', runId);

  let fixed = 0, gaveUp = 0;

  for (const filePath of errorFiles) {
    const file = (files ?? []).find((f: any) => f.path === filePath);
    if (!file) continue;
    let errors = errorsByFile[filePath];
    let attempt = 0;
    let currentContent = file.content;

    while (attempt < MAX_FIX_ATTEMPTS && errors.length > 0) {
      attempt++;
      onEvent({ type: 'fix_start', agent: 'ts_mechanic', message: `TS fix attempt ${attempt}: ${filePath}`, filePath });

      const result = await callAI({
        role: 'mechanic',
        systemPrompt: tsMechanicSystemPrompt(),
        userPrompt: tsMechanicUserPrompt(filePath, currentContent, errors, allPaths, attempt),
        maxTokens: 5000,
        temperature: 0.1,
      });

      currentContent = stripCodeFences(result.content);
      fileMap[filePath] = currentContent;
      errors = checkFile(filePath, currentContent);

      if (errors.length === 0) {
        await supabase.from('agent_files').update({ content: currentContent, status: 'fixed' }).eq('id', file.id);
        onEvent({ type: 'fix_done', agent: 'ts_mechanic', message: `TS fixed: ${filePath}`, filePath });
        fixed++;
        break;
      }
    }

    if (errors.length > 0) {
      await supabase.from('agent_files').update({
        error_detail: `TS errors remain after ${MAX_FIX_ATTEMPTS} attempts: ${errors.slice(0, 3).join('; ')}`,
      }).eq('id', file.id);
      gaveUp++;
    }
  }

  return { fixed, gaveUp };
}
