'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getUserRole } from '@/lib/auth';
import MediaKit from '@/components/MediaKit';
import DashboardShell from '@/components/DashboardShell';

interface MediaKitData {
  creator: {
    username: string;
    full_name: string;
    biography: string;
    profile_picture_url: string;
    followers_count: number;
    media_count: number;
    niche: string;
    city: string;
    style_profile?: unknown;
    rate_card?: {
      reel_rate: number;
      story_rate: number;
      post_rate: number;
      accepts_barter: boolean;
    } | null;
  };
  benchmarks: unknown;
  videos: { id: string; thumbnail_url: string; title: string }[];
  thumbnail_urls: string[];
}

export default function DashboardMediaKitPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [data, setData] = useState<MediaKitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (getUserRole() === 'brand') router.replace('/brand/dashboard');
  }, [router]);

  const loadKit = useCallback(async () => {
    try {
      const profile = await api.getProfile();
      setUsername(profile.username);
      setDisplayName(profile.display_name || profile.username);
      setProfilePic(profile.profile_picture_url || '');
      const kit = await api.getMediaKit(profile.username);
      setData(kit);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKit(); }, [loadKit]);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/${username}`
    : '';

  const headerRight = username ? (
    <div className="flex items-center gap-3">
      <button
        onClick={() => { navigator.clipboard.writeText(shareUrl); }}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
      >
        <span className="material-symbols-outlined text-base">content_copy</span>
        Copy Link
      </button>
      <Link
        href={`/${username}`}
        target="_blank"
        className="btn-primary text-sm py-2"
      >
        <span className="material-symbols-outlined text-sm">open_in_new</span>
        Preview Public Kit
      </Link>
    </div>
  ) : undefined;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background-light">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm text-slate-500">Loading your media kit…</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardShell
      username={username}
      displayName={displayName}
      profilePictureUrl={profilePic}
      title="Media Kit Preview"
      headerRight={headerRight}
    >
      <div className="overflow-y-auto h-full">
        {error || !data ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-12">
            <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">description</span>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Your media kit isn't ready yet</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                Upload at least one video so we can generate your media kit with AI-powered insights.
              </p>
            </div>
            <Link href="/upload" className="btn-primary">
              <span className="material-symbols-outlined text-sm">upload</span>
              Upload Videos
            </Link>
          </div>
        ) : (
          <MediaKit
            creator={data.creator}
            videos={data.videos ?? []}
            benchmarks={data.benchmarks as Parameters<typeof MediaKit>[0]['benchmarks']}
            thumbnailUrls={data.thumbnail_urls ?? []}
            rates={data.creator?.rate_card ?? undefined}
            styleProfile={data.creator?.style_profile as Parameters<typeof MediaKit>[0]['styleProfile']}
          />
        )}
      </div>
    </DashboardShell>
  );
}
