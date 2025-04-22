import React from 'react';
import { Card } from '@/components/ui/card';
import { getSession } from '@/lib/server/supabase';
import { redirect } from 'next/navigation';
import { Users, FileText, BarChart } from 'lucide-react';
import Link from 'next/link';
// import { createAdmi } from '@/lib/server/server';
import { createAdminClient } from '@/lib/server/admin';

async function getAdminStats() {
  const supabase = await createAdminClient();

  const { data: userCount } = await supabase
    .from('users')
    .select('id', { count: 'exact' });

  console.log("@@@ userCount => ", userCount)

  const { data: docsCount } = await supabase
    .from('vector_documents')
    .select('id', { count: 'exact' });

  return {
    users: userCount?.length || 0,
    docs: docsCount?.length || 0
  };
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect('/signin');
  }

  const stats = await getAdminStats();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/users">
          <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{stats.users}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/lawyers_docs">
          <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{stats.docs}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/admin/analytics">
          <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4">
              <BarChart className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Analytics</p>
                <p className="text-sm text-muted-foreground">View Reports</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}