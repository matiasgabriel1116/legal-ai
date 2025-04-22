
import React from 'react';
import { Card } from '@/components/ui/card';
import { getSession } from '@/lib/server/supabase';
import { redirect } from 'next/navigation';
import { Users, FileText, BarChart } from 'lucide-react';
import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/server/server';
import { createAdminClient } from '@/lib/server/admin';
import { type Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  ShieldX,
  AlertOctagon,
  Lock,
  Loader2
} from 'lucide-react';

export const metadata: Metadata = {
  title: '🔒 Admin Panel 🕵️‍♂️',
  description:
    'This is definitely not the admin panel. Just move along, nothing interesting to see here... *whistles innocently*',
  keywords: [
    'completely normal page',
    'nothing suspicious',
    'just move along',
    'ordinary page',
    'completely ordinary',
    'no secrets',
    'boring page',
    'nothing to see here'
  ],
  robots: {
    follow: true,
    index: true
  }
};

async function getAdminStats() {
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

async function getUserRole() {
  const supabase = await createServerSupabaseClient();
  const { data: userInfo } = await supabase
    .from('users')
    .select('role')
    .single<{ role: string }>();

  return userInfo?.role || null;
}

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect('/signin');
  }

  const userRole = await getUserRole();
  if (!userRole) {
    redirect('/');
  }

  if (userRole === 'lawyer') {
    return (
      <div className="min-h-[calc(100vh-44px)] md:min-h-[calc(100vh-44px)] flex flex-col bg-gradient-to-br from-[#ee7752] via-[#e73c7e] to-[#23a6d5] to-[#23d5ab] bg-[length:400%_400%] animate-gradient relative">
        {/* Noise overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
          }}
        />

        <div className="flex-1 max-w-[1200px] mx-auto flex flex-col items-center justify-center my-10 p-4 md:p-8 rounded-xl text-center w-full bg-background/95 dark:bg-background/90 shadow-xl border border-border/30 relative z-10 animate-fadeIn">
          {/* Glowing border */}
          <div className="absolute inset-0 rounded-xl border-2 border-transparent animate-borderGlow pointer-events-none -z-10" />

          {/* Floating warnings */}
          {[...Array(10)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl text-destructive/40"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${Math.random() * 10 + 5}s ease-in-out infinite`
              }}
            >
              ⚠️
            </div>
          ))}

          <AlertTriangle className="w-24 h-24 text-destructive animate-shake" />

          <h1 className="text-3xl md:text-5xl font-bold text-destructive mt-4 inline-block align-middle animate-glowText">
            🚨 Access Denied! 🚫
          </h1>

          <h2 className="text-xl md:text-3xl mt-6 text-foreground font-bold flex items-center justify-center flex-wrap">
            <AlertOctagon className="w-6 h-6 md:w-8 md:h-8 mr-2 shrink-0 text-destructive" />
            You do not have permission to access this page! 😠
          </h2>

          <p className="text-base md:text-xl text-muted-foreground flex items-center justify-center flex-wrap mt-2 mb-6">
            <ShieldAlert className="w-5 h-5 mr-2 shrink-0 text-destructive" />
            Don&apos;t worry, we have already sent a notification to our security
            department.
            <ShieldX className="w-5 h-5 ml-2 shrink-0 text-destructive" />
          </p>

          <div className="w-full max-w-md space-y-4 mb-6">
            <Input placeholder="Hint: It doesn't work" className="bg-card" />

            <Input
              type="password"
              placeholder="Try 123456 (it still doesn't work)"
              className="bg-card"
            />
          </div>

          <Button
            asChild
            className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
          >
            <Link href="/admin" target="_blank" className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Try to log in
            </Link>
          </Button>

          <Button
            asChild
            variant="destructive"
            className="mt-4 hover:scale-110 hover:rotate-3 transition-all"
          >
            <Link href="/" className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              <span>Leave this page now!</span>
            </Link>
          </Button>

          <div className="mt-8 flex items-center justify-center animate-fadePulse">
            <Lock className="w-5 h-5 text-destructive animate-glitch" />
            <p className="text-muted-foreground ml-2 relative">
              This page is protected and monitored
            </p>
          </div>
        </div>
      </div>
    );
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