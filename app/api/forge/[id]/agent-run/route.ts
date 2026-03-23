import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const { id: forgeId } = await params;
  const body = await req.json();
  const { sessionId, goal, repoName, projectName, isPrivate } = body;

  if (!sessionId || !goal || !repoName || !projectName) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const admin = await getSupabaseAdmin();
  const { data: session } = await admin
    .from('builder_sessions')
    .select('id, prompt, target_stack')
    .eq('id', sessionId)
    .eq('forge_id', forgeId)
    .single();

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  const { data: run, error } = await admin
    .from('agent_runs')
    .insert({
      session_id: sessionId,
      forge_id: forgeId,
      created_by: user.id,
      status: 'queued',
      plan: {},
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ runId: run.id });
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const { id: forgeId } = await params;
  const { searchParams } = new URL(req.url);
  const runId = searchParams.get('runId');

  if (!runId) return Response.json({ error: 'runId required' }, { status: 400 });

  const admin = await getSupabaseAdmin();
  const { data: run } = await admin
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .eq('forge_id', forgeId)
    .single();

  if (!run) return Response.json({ error: 'Run not found' }, { status: 404 });

  const { data: session } = await admin
    .from('builder_sessions')
    .select('id, prompt, target_stack, forge_id')
    .eq('id', run.session_id)
    .single();

  const { data: analyses } = await admin
    .from('repo_analysis_cache')
    .select('summary')
    .eq('forge_id', forgeId)
    .limit(10);

  const knowledge = {
    repos: (analyses ?? []).map((a: any) => ({ repo_name: '', summary: a.summary })),
    sharedConcepts: [],
    conflicts: [],
    opportunities: [],
  };

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (event: AgentSSEEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {}
      };

      try {
        const { runAgentPipeline } = await import('@/lib/agents/orchestrator');
        const { data: ghAccount } = await admin
          .from('github_accounts')
          .select('access_token')
          .eq('user_id', run.created_by)
          .single();

        const repoName = `mf-${Date.now()}`;
        const projectName = `mergeforge-${Date.now()}`;

        await runAgentPipeline({
          runId, forgeId, sessionId: run.session_id,
          goal: session?.prompt ?? 'Build an app',
          targetStack: (session?.target_stack ?? 'nextjs,supabase') as any,
          knowledge, repoName, projectName, isPrivate: true,
          supabase: admin,
          onEvent: enqueue,
        });

        enqueue({ type: 'complete', agent: 'orchestrator', message: 'Pipeline complete' } as AgentSSEEvent);
        controller.enqueue(encoder.encode('data: {"type":"stream_end"}\n\n'));
        controller.close();
      } catch (err: any) {
        enqueue({ type: 'error', agent: 'orchestrator', message: err.message } as AgentSSEEvent);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Transfer-Encoding': 'chunked',
    },
  });
}
