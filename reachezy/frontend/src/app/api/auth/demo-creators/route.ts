/**
 * GET /api/auth/demo-creators — Returns the 3 featured demo creators for the selector modal.
 * Fetches live data from the database so profile changes are reflected immediately.
 * No auth required (public endpoint for login page).
 */
import { NextResponse } from 'next/server';
import { query } from '@/lib/server-db';

export const dynamic = 'force-dynamic';

// Fallback metadata not stored in DB (tier label, emoji)
const DEMO_META: Record<string, { tier: string; emoji: string }> = {
  priyabeauty:  { tier: 'Nano Creator',    emoji: '💄' },
  rahulfashion: { tier: 'Mid-tier Creator', emoji: '👗' },
  snehacomedy:  { tier: 'Macro Creator',    emoji: '😂' },
};

export async function GET() {
  try {
    const result = await query(
      `SELECT username, display_name, niche, city, followers_count, bio, profile_picture_url
       FROM creators
       WHERE username IN ('priyabeauty', 'rahulfashion', 'snehacomedy')
       ORDER BY ARRAY_POSITION(ARRAY['priyabeauty','rahulfashion','snehacomedy'], username)`,
      []
    );

    const creators = result.rows.map((row) => ({
      username: row.username,
      display_name: row.display_name,
      niche: row.niche,
      city: row.city,
      followers_count: row.followers_count,
      bio: row.bio,
      // Use S3 profile picture if available, otherwise fall back to local asset
      avatar_url: row.profile_picture_url || `/assets/creators/${row.username}.jpg`,
      ...DEMO_META[row.username],
    }));

    return NextResponse.json({ creators });
  } catch (e) {
    console.error('Error fetching demo creators:', e);

    // Graceful fallback so the login page still works if DB is unreachable
    return NextResponse.json({
      creators: [
        { username: 'priyabeauty',  display_name: 'Priya Sharma',  niche: 'Beauty/Cosmetics',      city: 'Lucknow',   followers_count: 30000, tier: 'Nano Creator',    emoji: '💄', avatar_url: '/assets/creators/priyabeauty.jpg',  bio: 'Skincare routines & affordable glam for Indian skin tones.' },
        { username: 'rahulfashion', display_name: 'Rahul Verma',   niche: 'Fashion',               city: 'Mumbai',    followers_count: 55000, tier: 'Mid-tier Creator', emoji: '👗', avatar_url: '/assets/creators/rahulfashion.jpg', bio: 'Streetwear meets desi swag. Mumbai-based style curator.' },
        { username: 'snehacomedy',  display_name: 'Sneha Patel',   niche: 'Comedy/Entertainment',  city: 'Ahmedabad', followers_count: 80000, tier: 'Macro Creator',    emoji: '😂', avatar_url: '/assets/creators/snehacomedy.jpg',  bio: 'Gujju girl making reels your masi will forward.' },
      ],
    });
  }
}
