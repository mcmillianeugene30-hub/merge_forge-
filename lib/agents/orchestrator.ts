import { SupabaseClient } from '@supabase/supabase-js';
import { runArchitectAgent } from './architect';
import { runCodegenAgent } from './codegen';
import { runReviewerAgent } from './reviewer';
import { runTsMechanicAgent } from './ts-mechanic';
import { runLintMechanicAgent } from './lint-mechanic';
import { runTestWriterAgent } from './test-writer';
import { runTestRunnerAgent } from './test-runner';
import { runDeployAgent } from './deploy';
import { AgentSSEEvent, TargetStack, ForgeKnowledge } from '@/lib/types';

export async function runAgentPipeline(params: {
  runId: string;
  forgeId: string;
  sessionId: string;
  goal: string;
  targetStack: TargetStack;
  knowledge: ForgeKnowledge;
  repoName: string;
  projectName: string;
  isPrivate?: boolean;
  supabase: SupabaseClient;
  onEvent: (event: AgentSSEEvent) => void;
}): Promise<{ repoUrl: string | null; deployUrl: string | null; fileCount: number }> {
  const { runId, forgeId, sessionId, goal, targetStack, knowledge, repoName, projectName, isPrivate = true, supabase, onEvent } = params;

  await supabase.from('agent_runs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', runId);
  onEvent({ type: 'start', agent: 'orchestrator', message: '8-agent pipeline starting' });

  try {
    // 1. Architect
    onEvent({ type: 'start', agent: 'architect', message: 'Running Architect agent...' });
    const plan = await runArchitectAgent({ runId, forgeId, sessionId, goal, targetStack, knowledge, supabase, onEvent });
    await supabase.from('builder_artifacts').upsert({
      session_id: sessionId, path: 'plans/agent-plan.json',
      content: JSON.stringify(plan, null, 2), artifact_type: 'plan',
    }, { onConflict: 'session_id,path' });
    onEvent({ type: 'progress', agent: 'orchestrator', message: `Architect complete: ${plan.files.length} files planned, appName: ${plan.appName}` });

    // 2. Codegen
    onEvent({ type: 'start', agent: 'codegen', message: 'Running Code Generator agent...' });
    await runCodegenAgent({ runId, plan, supabase, onEvent });
    onEvent({ type: 'progress', agent: 'orchestrator', message: 'Codegen complete' });

    // 3. Reviewer
    onEvent({ type: 'start', agent: 'reviewer', message: 'Running Reviewer agent...' });
    const reviewResult = await runReviewerAgent({ runId, plan, supabase, onEvent });
    onEvent({ type: 'progress', agent: 'orchestrator', message: `Reviewer complete: ${reviewResult.rewritten} files rewritten` });

    // 4. TS Mechanic
    onEvent({ type: 'start', agent: 'ts_mechanic', message: 'Running TypeScript Mechanic agent...' });
    const tsResult = await runTsMechanicAgent({ runId, plan, supabase, onEvent });
    onEvent({ type: 'progress', agent: 'orchestrator', message: `TS Mechanic: ${tsResult.fixed} fixed, ${tsResult.gaveUp} gave up` });

    // 5. Lint Mechanic
    onEvent({ type: 'start', agent: 'lint_mechanic', message: 'Running Lint Mechanic agent...' });
    const lintResult = await runLintMechanicAgent({ runId, supabase, onEvent });
    onEvent({ type: 'progress', agent: 'orchestrator', message: `Lint Mechanic: ${lintResult.totalErrorsFixed} errors fixed in ${lintResult.filesFixed} files` });

    // 6. Test Writer
    onEvent({ type: 'start', agent: 'test_writer', message: 'Running Test Writer agent...' });
    const testResult = await runTestWriterAgent({ runId, plan, supabase, onEvent });
    onEvent({ type: 'progress', agent: 'orchestrator', message: `Test Writer: ${testResult.testsWritten} test files written` });

    // 7. Test Runner
    onEvent({ type: 'start', agent: 'test_runner', message: 'Running Test Runner agent...' });
    const runResult = await runTestRunnerAgent({ runId, plan, supabase, onEvent });
    onEvent({ type: 'progress', agent: 'orchestrator', message: `Test Runner: ${runResult.passed} passed, ${runResult.failed} failed, ${runResult.fixed} fixed` });

    // 8. Copy artifacts
    const { data: artifactFiles } = await supabase
      .from('agent_files')
      .select('*')
      .eq('run_id', runId)
      .in('status', ['done', 'fixed', 'lint_fixed', 'test_written'])
      .neq('file_type', 'test');

    const artifacts = (artifactFiles ?? []).map((f: any) => ({
      session_id: sessionId,
      path: f.path,
      content: f.content,
      artifact_type: f.path.endsWith('.sql') ? 'schema' : f.path.startsWith('.env') ? 'env' : 'code',
    }));

    if (artifacts.length > 0) {
      await supabase.from('builder_artifacts').upsert(artifacts, { onConflict: 'session_id,path' });
    }

    // 9. Deploy
    onEvent({ type: 'start', agent: 'deploy', message: 'Running Deploy agent...' });
    const { repoUrl, deployUrl, fileCount } = await runDeployAgent({
      runId, forgeId, sessionId, repoName, projectName, isPrivate, supabase, onEvent
    });

    await supabase.from('agent_runs').update({
      status: 'completed', completed_at: new Date().toISOString(), current_agent: null,
    }).eq('id', runId);

    await supabase.from('builder_sessions').update({
      status: 'completed',
      summary: `${fileCount} files generated. Tests: ${runResult.passed} passing.${repoUrl ? ' GitHub: ' + repoUrl : ''}${deployUrl ? ' Vercel: ' + deployUrl : ''}`,
    }).eq('id', sessionId);

    onEvent({
      type: 'complete', agent: 'orchestrator', message: 'Pipeline complete',
      metadata: { repoUrl, deployUrl, fileCount, testsPassed: runResult.passed, testsFailed: runResult.failed },
    });

    return { repoUrl, deployUrl, fileCount };
  } catch (err: any) {
    await supabase.from('agent_runs').update({ status: 'failed', error_message: err.message }).eq('id', runId);
    onEvent({ type: 'error', agent: 'orchestrator', message: `Pipeline failed: ${err.message}` });
    throw err;
  }
}
