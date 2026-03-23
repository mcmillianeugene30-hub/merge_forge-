import { NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;
  const { id: forgeId, runId } = await params;
  const admin = await getSupabaseAdmin();

  const { data: run } = await admin
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .eq('forge_id', forgeId)
    .single();

  if (!run) return Response.json({ error: 'Not found' }, { status: 404 });

  const { data: files } = await admin
    .from('agent_files')
    .select('*')
    .eq('run_id', runId)
    .order('path');

  const { data: events } = await admin
    .from('agent_events')
    .select('*')
    .eq('run_id', runId)
    .order('created_at')
    .limit(100);

  const { data: testResults } = await admin
    .from('agent_test_results')
    .select('*')
    .eq('run_id', runId);

  return Response.json({ run, files: files ?? [], events: events ?? [], testResults: testResults ?? [] });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; runId: string }> }) {
  const userOrRes = await requireAuth();
  if (userOrRes instanceof Response) return userOrRes;
  const user = userOrRes as User;
  const { id: _forgeId, runId } = await params;
  const admin = await getSupabaseAdmin();
  await admin.from('agent_runs').update({ status: 'cancelled' }).eq('id', runId);
  return Response.json({ success: true });
}
