import 'server-only';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';
import { authOptions } from './auth';
import { supabase } from './supabase';
import security from './security.cjs';
export async function getActor() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Silakan masuk untuk melanjutkan.');
  const { data, error } = await supabase.from('app_users').select('id,username,name,role,branch_id,is_active').eq('id', session.user.id).maybeSingle();
  if (error || !data?.is_active) throw new Error('Sesi tidak berlaku. Silakan masuk kembali.');
  return data;
}
export async function getScope({ admin = false, requireOne = true } = {}) {
  const actor = await getActor();
  if (admin) security.requireAdmin(actor);
  let query = supabase.from('branches').select('*').order('code');
  if (actor.role !== 'super_admin') query = query.eq('id', actor.branch_id);
  const { data: branches, error } = await query;
  if (error) throw new Error('Gagal memuat cabang.');
  const selected = (await cookies()).get('waled_branch')?.value || (actor.role === 'super_admin' ? 'all' : actor.branch_id);
  return { actor, branchId: security.resolveBranch(actor, selected, branches, requireOne), branches, selected };
}
export const scoped = (query, branchId) => branchId ? query.eq('branch_id', branchId) : query;
export function unwrap({ data, error }) { if (error) throw new Error(error.message); return data; }
export async function fetchAll(buildQuery) {
  const all = [];
  for (let offset = 0; ; offset += 500) {
    const data = unwrap(await buildQuery().range(offset, offset + 499));
    all.push(...data);
    if (data.length < 500) return all;
  }
}
