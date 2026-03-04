'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/auth';
import { DashboardProvider, useDashboard } from '@/contexts/DashboardContext';
import DashboardShell from '@/components/DashboardShell';

function LayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { profile, loading, pageTitle } = useDashboard();

  useEffect(() => {
    if (getUserRole() === 'brand') router.replace('/brand/dashboard');
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-slate-600">Could not load your profile.</p>
        <button onClick={() => router.replace('/login')} className="btn-primary text-sm">
          Sign In
        </button>
      </div>
    );
  }

  return (
    <DashboardShell
      username={profile.username}
      displayName={profile.display_name}
      profilePictureUrl={profile.profile_picture_url}
      title={pageTitle}
    >
      {children}
    </DashboardShell>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <LayoutInner>{children}</LayoutInner>
    </DashboardProvider>
  );
}
