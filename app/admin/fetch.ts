'use server';

import { createAdminClient } from '@/lib/server/admin';
import { createServerSupabaseClient } from '@/lib/server/server';

export async function getAdminStats() {
  const supabase = await createAdminClient();

  const { data: userCount } = await supabase
    .from('users')
    .select('id', { count: 'exact' });

  const { data: docsCount } = await supabase
    .from('vector_documents')
    .select('id', { count: 'exact' });

  return {
    users: userCount?.length || 0,
    docs: docsCount?.length || 0
  };
}

export async function getUserRole() {
  const supabase = await createServerSupabaseClient();
  const { data: userInfo } = await supabase
    .from('users')
    .select('role')
    .single<{ role: string }>();

  return userInfo?.role || null;
}