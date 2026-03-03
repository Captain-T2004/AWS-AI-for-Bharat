/**
 * GET /api/auth/demo-creators — Returns the 3 featured demo creators for the selector modal.
 * No auth required (public endpoint for login page).
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// The 3 featured demo creators covering nano / mid / macro tiers
const DEMO_CREATORS = [
  {
    username: 'priyabeauty',
    display_name: 'Priya Sharma',
    niche: 'Beauty/Cosmetics',
    city: 'Lucknow',
    followers_count: 30000,
    tier: 'Nano Creator',
    emoji: '💄',
    avatar_url: '/assets/creators/priyabeauty.jpg',
    bio: 'Skincare routines & affordable glam for Indian skin tones.',
  },
  {
    username: 'rahulfashion',
    display_name: 'Rahul Verma',
    niche: 'Fashion',
    city: 'Mumbai',
    followers_count: 55000,
    tier: 'Mid-tier Creator',
    emoji: '👗',
    avatar_url: '/assets/creators/rahulfashion.jpg',
    bio: 'Streetwear meets desi swag. Mumbai-based style curator.',
  },
  {
    username: 'snehacomedy',
    display_name: 'Sneha Patel',
    niche: 'Comedy/Entertainment',
    city: 'Ahmedabad',
    followers_count: 80000,
    tier: 'Macro Creator',
    emoji: '😂',
    avatar_url: '/assets/creators/snehacomedy.jpg',
    bio: 'Gujju girl making reels your masi will forward.',
  },
];

export async function GET() {
  return NextResponse.json({ creators: DEMO_CREATORS });
}
