'use server';

import { createAdminClient } from '@/lib/server/admin';

export const fetchUsers = async () => {
    const supabaseAdmin = createAdminClient();

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, full_name, email, role, subscription_type')
      .order('subscription_type', { ascending: false })

    console.log("@@@ data => ", users);
    if (error) throw error;
    return users as [];
};

export const handleSubscriptionToggle = async (userId: string, isPremium: string) => {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('users')
    .update({ subscription_type: isPremium } as any)
    .eq('id', userId);
  
  if (error) throw error;
};

export const handleDeleteUser = async (userId: string) => {
  const supabase = createAdminClient();
  
  const { error: dbError } = await supabase
    .from('users')
    .delete()
    .eq('id', userId); 

  if (dbError) throw dbError;

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  
  if (authError) throw authError;
};

export const inviteUserByEmail = async (email: string) => {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.inviteUserByEmail(email);
  
  if (error) throw error;
};