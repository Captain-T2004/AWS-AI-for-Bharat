'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getUserSession } from '@/lib/auth';
import CreatorCard from '@/components/CreatorCard';
import AppNavbar from '@/components/AppNavbar';

interface StyleProfile {
  dominant_energy?: string;
  dominant_aesthetic?: string;
  primary_content_type?: string;
  topics?: string[];
}

interface Rates {
  reel_rate: number;
  story_rate: number;
  post_rate: number;
  accepts_barter: boolean;
}

interface Creator {
  creator_id: string;
  username: string;
  display_name: string;
  bio: string;
  niche: string;
  city: string;
  followers_count: number;
  media_count: number;
  profile_picture_url: string | null;
  style_profile: StyleProfile | null;
  rates: Rates | null;
}

export default function BrandWishlistPage() {
  const router = useRouter();
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const session = getUserSession();
    if (!session || session.role !== 'brand') {
      router.replace('/login?role=brand');
    }
  }, [router]);

  const loadWishlist = useCallback(async () => {
    try {
      const data = await api.getWishlist();
      setCreators(data.wishlist || []);
    } catch (err) {
      console.error('Load wishlist error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWishlist();
  }, [loadWishlist]);

  const handleToggleSave = async (creatorId: string) => {
    setSavingId(creatorId);
    try {
      await api.removeFromWishlist(creatorId);
      setCreators((prev) => prev.filter((c) => c.creator_id !== creatorId));
    } catch (err) {
      console.error('Remove from wishlist error:', err);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppNavbar savedCount={creators.length} />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Saved Creators
          </h1>
          <p className="mt-2 text-gray-600">
            Your shortlisted creators for campaigns
          </p>
        </div>

        {loading && (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
            <p className="text-gray-600">Loading saved creators...</p>
          </div>
        )}

        {!loading && creators.length === 0 && (
          <div className="py-16 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
            <p className="mt-4 text-gray-500">No saved creators yet</p>
            <p className="text-sm text-gray-400">
              Search for creators and click the heart to save them
            </p>
            <Link
              href="/influencer-search"
              className="btn-primary mt-6 inline-block"
            >
              Find Creators
            </Link>
          </div>
        )}

        {!loading && creators.length > 0 && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {creators.length} saved creator{creators.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {creators.map((creator) => (
                <CreatorCard
                  key={creator.creator_id}
                  creator={creator}
                  isSaved={true}
                  onToggleSave={handleToggleSave}
                  savingId={savingId}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
