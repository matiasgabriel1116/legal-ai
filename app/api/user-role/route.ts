import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/server/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ role: null }, { status: 401 });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single<{ role: string }>();

    return NextResponse.json({ role: userData?.role ?? 'lawyer' });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ role: null }, { status: 500 });
  }
}