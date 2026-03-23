import { SupabaseClient } from '@supabase/supabase-js';
import { callAIJSON } from '@/lib/ai-client';
import { architectSystemPrompt, architectUserPrompt } from '@/lib/agent-prompts';
import { AgentSSEEvent, TargetStack, ForgeKnowledge, BuilderPlan } from '@/lib/types';

export type ArchitectFile = {
  path: string;
  purpose: string;
  language: string;
  imports: string[];
  critical: boolean;
  fileType: 'source' | 'test' | 'config' | 'schema' | 'env' | 'readme';
};

export type ArchitectPlan = BuilderPlan & {
  appName: string;
  files: ArchitectFile[];
  estimatedFiles: number;
};

export async function runArchitectAgent(params: {
  runId: string;
  forgeId: string;
  sessionId: string;
  goal: string;
  targetStack: TargetStack;
  knowledge: ForgeKnowledge;
  supabase: SupabaseClient;
  onEvent: (event: AgentSSEEvent) => void;
}): Promise<ArchitectPlan> {
  const { runId, forgeId, sessionId, goal, targetStack, knowledge, supabase, onEvent } = params;

  onEvent({ type: 'start', agent: 'architect', message: 'Architect analyzing repos and designing architecture...' });

  await supabase.from('agent_events').insert({
    run_id: runId, agent: 'architect', event_type: 'start', message: 'Starting architecture analysis'
  });

  const existingEnvVars = [...new Set(knowledge.repos.flatMap(r => (r as any).envVars ?? []))];

  const result = await callAIJSON<ArchitectPlan>({
    role: 'architect',
    systemPrompt: architectSystemPrompt(),
    userPrompt: architectUserPrompt(goal, targetStack as unknown as string, knowledge as any, existingEnvVars),
    maxTokens: 6000,
    temperature: 0.1,
    jsonMode: true,
  });

  const plan = result;

  if (!plan.files || !Array.isArray(plan.files) || plan.files.length === 0) {
    throw new Error('Architect returned invalid plan: missing files array');
  }

  const provider = result._provider;
  onEvent({
    type: 'progress',
    agent: 'architect',
    message: `Plan created using ${provider} — ${plan.files.length} files planned`,
    provider,
  });

  if (plan.files.length < 15) {
    onEvent({
      type: 'progress',
      agent: 'architect',
      message: `Warning: only ${plan.files.length} files planned — architect may have underestimated`,
    });
  }

  await supabase.from('agent_runs').update({
    plan: plan as any,
    total_files: plan.files.length,
    current_agent: 'architect',
  }).eq('id', runId);

  await supabase.from('agent_events').insert({
    run_id: runId, agent: 'architect', event_type: 'complete',
    message: `Architect complete: ${plan.files.length} files planned, appName: ${plan.appName}`,
  });

  return plan;
}
