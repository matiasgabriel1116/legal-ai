'use client';

import { Card } from '@/components/ui/card';
import { Users, FileText, BarChart } from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/ui/languageContext';

export default function AdminDashboard({ stats }: { stats: { users: number; docs: number } }) {
  const { t } = useLanguage();

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">{t('Admin Dashboard')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/users">
          <Card className="p-6 hover:bg-accent/50 transition-colors cursor-pointer">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">{t('Total Users')}</p>
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
                <p className="text-sm text-muted-foreground">{t('Total Documents')}</p>
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
                <p className="text-sm text-muted-foreground">{t('Analytics')}</p>
                <p className="text-sm text-muted-foreground">{t('View Reports')}</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}