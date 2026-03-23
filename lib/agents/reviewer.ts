import { SupabaseClient } from '@supabase/supabase-js';
import { callAIJSON } from '@/lib/ai-client';
import { reviewerSystemPrompt, reviewerUserPrompt } from '@/lib/agent-prompts';
import { AgentSSEEvent } from '@/lib/types';
import { ArchitectPlan } from './architect';
import { stripCodeFences } from '@/lib/pipeline-utils';

type ReviewResult = { passed: boolean; issues: string[]; severity: 'none' | 'minor' | 'major'; rewrittenContent: string | null };

export async function runReviewerAgent(params: {
  runId: string;
  plan: ArchitectPlan;
  supabase: SupabaseClient;
  onEvent: (event: AgentSSEEvent) => void;
}): Promise<{ reviewed: number; rewritten: number; skipped: number }> {
  const { runId, plan, supabase, onEvent } = params;

  const { data: files } = await supabase
    .from('agent_files')
    .select('*')
    .eq('run_id', runId)
    .eq('status', 'done')
    .order('path');

  const sourceAndConfig = (files ?? []).filter((f: any) =>
    f.file_type === 'source' || f.file_type === 'config'
  );

  const criticalFiles = sourceAndConfig.filter((f: any) =>
    plan.files.find((p: any) => p.path === f.path && p.critical)
  );
  const nonCriticalFiles = sourceAndConfig.filter((f: any) =>
    !plan.files.find((p: any) => p.path === f.path && p.critical)
  );

  onEvent({ type: 'start', agent: 'reviewer', message: `Reviewing ${sourceAndConfig.length} files (critical first)...` });
  await supabase.from('agent_runs').update({ current_agent: 'reviewer' }).eq('id', runId);

  let reviewed = 0, rewritten = 0, skipped = 0;

  for (const file of [...criticalFiles, ...nonCriticalFiles]) {
    const result = await callAIJSON<ReviewResult>({
      role: 'reviewer',
      systemPrompt: reviewerSystemPrompt(),
      userPrompt: reviewerUserPrompt(file.path, file.content, plan, plan.files.map((p: any) => p.path)),
      maxTokens: 3000,
      temperature: 0.1,
    });

    if (result.severity === 'none') { reviewed++; continue; }
    if (result.severity === 'minor') { reviewed++; continue; }

    if (result.severity === 'major' && result.rewrittenContent) {
      const cleaned = stripCodeFences(result.rewrittenContent);
      await supabase.from('agent_files').update({ content: cleaned, status: 'fixed' }).eq('id', file.id);
      onEvent({ type: 'fix_done', agent: 'reviewer', message: `Reviewer rewrote ${file.path}: ${result.issues[0]}`, filePath: file.path });
      rewritten++;
    } else {
      onEvent({ type: 'file_error', agent: 'reviewer', message: `Issues in ${file.path}: ${result.issues.join(', ')}`, filePath: file.path });
    }
    reviewed++;
  }

  onEvent({ type: 'progress', agent: 'reviewer', message: `Review complete: ${reviewed} reviewed, ${rewritten} rewritten` });
  return { reviewed, rewritten, skipped };
}
