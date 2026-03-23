import { SupabaseClient } from '@supabase/supabase-js';
import { callAI } from '@/lib/ai-client';
import { codegenSystemPrompt, codegenUserPrompt } from '@/lib/agent-prompts';
import { AgentSSEEvent, AgentFile } from '@/lib/types';
import { ArchitectPlan } from './architect';
import { inferLanguageFromPath, stripCodeFences, buildAppContext, getRelevantFilesForCodegen } from '@/lib/pipeline-utils';

export async function runCodegenAgent(params: {
  runId: string;
  plan: ArchitectPlan;
  supabase: SupabaseClient;
  onEvent: (event: AgentSSEEvent) => void;
}): Promise<void> {
  const { runId, plan, supabase, onEvent } = params;

  onEvent({ type: 'start', agent: 'codegen', message: `Generating ${plan.files.length} files...` });

  await supabase.from('agent_runs').update({ current_agent: 'codegen' }).eq('id', runId);

  const sortedFiles = [...plan.files].sort((a, b) => {
    if (a.critical !== b.critical) return a.critical ? -1 : 1;
    const order = ['config', 'source', 'test'];
    const ai = order.indexOf(a.fileType);
    const bi = order.indexOf(b.fileType);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    return a.path.localeCompare(b.path);
  });

  const appContext = buildAppContext(plan);
  const generatedFiles: Array<{ path: string; content: string }> = [];

  // Insert all files upfront
  await supabase.from('agent_files').insert(
    sortedFiles.map(f => ({
      run_id: runId,
      path: f.path,
      content: '',
      language: inferLanguageFromPath(f.path),
      file_type: f.fileType,
      status: 'pending',
    }))
  );

  let completedCount = 0;
  let errorCount = 0;

  for (const file of sortedFiles) {
    await supabase.from('agent_files').update({ status: 'generating' }).eq('run_id', runId).eq('path', file.path);

    onEvent({
      type: 'file_start',
      agent: 'codegen',
      message: `Generating ${file.path}`,
      filePath: file.path,
      progress: { completed: completedCount, total: plan.files.length },
    });

    try {
      const relevantFiles = getRelevantFilesForCodegen(file.path, file.imports, generatedFiles);

      const result = await callAI({
        role: 'codegen',
        systemPrompt: codegenSystemPrompt(),
        userPrompt: codegenUserPrompt(file.path, file.purpose, file.fileType, plan, plan.files.map(f => f.path), relevantFiles, appContext),
        maxTokens: 6000,
        temperature: 0.15,
      });

      let content = stripCodeFences(result.content);

      // QUALITY GATE
      const hasPlaceholder = /(\/\/ TODO|placeholder|Placeholder\(\))/i.test(content) || content.length < 50;
      if (hasPlaceholder) {
        const retry = await callAI({
          role: 'codegen',
          systemPrompt: codegenSystemPrompt(),
          userPrompt: codegenUserPrompt(file.path, file.purpose, file.fileType, plan, plan.files.map(f => f.path), relevantFiles, appContext) +
            '\n\nIMPORTANT: The previous response was incomplete or contained placeholders. Write the FULL, COMPLETE file with ALL implementation.',
          maxTokens: 6000,
          temperature: 0.15,
        });
        content = stripCodeFences(retry.content);
      }

      await supabase.from('agent_files').update({
        content,
        status: 'done',
        language: inferLanguageFromPath(file.path),
      }).eq('run_id', runId).eq('path', file.path);

      generatedFiles.push({ path: file.path, content });
      completedCount++;

      onEvent({
        type: 'file_done',
        agent: 'codegen',
        message: `Generated ${file.path}`,
        filePath: file.path,
        fileContent: content,
        progress: { completed: completedCount, total: plan.files.length },
        provider: result.provider,
      });

      await supabase.from('agent_runs').update({ completed_files: completedCount }).eq('id', runId);
    } catch (err: any) {
      await supabase.from('agent_files').update({
        status: 'error',
        error_detail: err.message,
      }).eq('run_id', runId).eq('path', file.path);

      errorCount++;
      onEvent({ type: 'file_error', agent: 'codegen', message: `Error generating ${file.path}: ${err.message}`, filePath: file.path });
      await supabase.from('agent_runs').update({ failed_files: errorCount }).eq('id', runId);
    }
  }

  onEvent({
    type: 'progress',
    agent: 'codegen',
    message: `Codegen complete: ${completedCount} files generated, ${errorCount} errors`,
  });
}
