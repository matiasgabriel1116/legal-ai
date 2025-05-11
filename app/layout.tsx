import React, { type ReactNode, Suspense } from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Footer from '@/app/components/ui/Footer/Footer';
import RootErrorBoundary from '@/app/components/errorBoundary/ErrorBoundaryPage';
import { getSession } from '@/lib/server/supabase';
import NavBar from '@/app/components/ui/Navbar/TopBar';
import SnackbarMessages from './components/ui/SnackbarMessage';
import { ThemeProvider } from '@/components/ui/theme-provider';

import './global.css';
import { LanguageProvider } from '@/components/ui/languageContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false,
  variable: '--font-Inter'
});
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://localhost:3000/'),
  title: 'Supabase SSR Auth Example',
  description:
    'An example demonstrating server-side rendering with authentication using Supabase.'
};

export default function RootLayout({
  children,
  modal
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <html lang="en" dir='ltr' suppressHydrationWarning style={{ height: '100%' }}>
      <RootErrorBoundary>
        <body
          className={inter.className}
          style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
          }}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <LanguageProvider>
            {/* We pass the promise here and resolve it with react.use in the child to prevent the async request from blocking the UI */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
                <NavBar session={getSession()} />
                {children}
                {modal}
                <Footer />
              </div>
              <Suspense fallback={null}>
                <SnackbarMessages />
              </Suspense> 
            </LanguageProvider>
          </ThemeProvider>
        </body>
      </RootErrorBoundary>
    </html>
  );
}
