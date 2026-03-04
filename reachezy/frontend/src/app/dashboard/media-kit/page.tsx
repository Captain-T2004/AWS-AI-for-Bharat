'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useDashboard } from '@/contexts/DashboardContext';
import type { MediaKitProps } from '@/components/MediaKit';

const MediaKit = dynamic(() => import('@/components/MediaKit'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  ),
});

type RawCreator = MediaKitProps['creator'] & {
  rate_card?: MediaKitProps['rates'];
  style_profile?: MediaKitProps['styleProfile'];
};

type MediaKitData = {
  creator: RawCreator;
  benchmarks: MediaKitProps['benchmarks'];
  videos: MediaKitProps['videos'];
  thumbnail_urls: string[];
};

export default function DashboardMediaKitPage() {
  const { profile, setPageTitle } = useDashboard();
  const [data, setData] = useState<MediaKitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setPageTitle('Media Kit Preview');
  }, [setPageTitle]);

  const loadKit = useCallback(async () => {
    if (!profile) return;
    try {
      const kit = await api.getMediaKit(profile.username);
      setData(kit);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { loadKit(); }, [loadKit]);

  const shareUrl = typeof window !== 'undefined' && profile
    ? `${window.location.origin}/${profile.username}`
    : '';

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-y-auto h-full">
      {/* In-page action bar */}
      {profile && (
        <div className="flex items-center justify-end gap-3 px-8 py-4 border-b border-slate-100 bg-white/60 backdrop-blur-sm sticky top-0 z-10">
          <button
            onClick={() => { navigator.clipboard.writeText(shareUrl); }}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
          >
            <span className="material-symbols-outlined text-base">content_copy</span>
            Copy Link
          </button>
          <Link
            href={`/${profile.username}`}
            target="_blank"
            className="btn-primary text-sm py-2"
          >
            <span className="material-symbols-outlined text-sm">open_in_new</span>
            Preview Public Kit
          </Link>
        </div>
      )}

      {error || !data ? (
        <div className="flex flex-col items-center justify-center h-full gap-6 p-12">
          <div className="size-20 bg-slate-50 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-slate-300">description</span>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Your media kit isn&apos;t ready yet</h3>
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
          benchmarks={data.benchmarks}
          thumbnailUrls={data.thumbnail_urls ?? []}
          rates={data.creator?.rate_card ?? undefined}
          styleProfile={data.creator?.style_profile ?? undefined}
        />
      )}
    </div>
  );
}
