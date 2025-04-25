'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Users, FileText, LineChart, BarChart } from 'lucide-react';
import { useLanguage } from '@/components/ui/languageContext';

const iconMap = {
  'users': Users,
  'file-text': FileText,
  'line-chart': LineChart,
  'bar-chart': BarChart
};

interface SidebarNavItem {
  title: string;
  href: string;
  icon: keyof typeof iconMap;
}

const sidebarNavItems: SidebarNavItem[] = [
  {
    title: 'Overview',
    href: '/admin',
    icon: 'line-chart'
  },
  {
    title: 'Users',
    href: '/admin/users',
    icon: 'users'
  },
  {
    title: 'Common Documents',
    href: '/admin/common_docs',
    icon: 'file-text'
  },
  {
    title: 'Lawyers Documents',
    href: '/admin/lawyers_docs',
    icon: 'file-text'
  },
  {
    title: 'Analytics',
    href: '/admin/analytics',
    icon: 'bar-chart'
  }
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <div className="container grid flex-1 gap-12 md:grid-cols-[200px_1fr] px-4 py-6 lg:px-6 lg:py-8">
        <aside className="hidden w-[200px] flex-col md:flex">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {sidebarNavItems.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <Button
                  key={item.href}
                  variant={pathname === item.href ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.href}>
                    {Icon && <Icon className="mr-2 h-4 w-4" />}
                    {t(item.title as any)}
                  </Link>
                </Button>
              );
            })}
          </nav>
        </aside>
        <main className="flex w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
