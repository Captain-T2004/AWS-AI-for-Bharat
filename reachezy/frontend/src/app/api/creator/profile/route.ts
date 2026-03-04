/**
 * GET /api/creator/profile — Returns creator profile for the logged-in user.
 * PUT /api/creator/profile — Updates niche/city.
 */
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/server-db';
import { getUserFromRequest } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve creator by creator_id or cognito_sub
    let result;
    if (user.creator_id) {
      result = await query(
        `SELECT id AS creator_id, cognito_sub, username, display_name, bio,
                followers_count, niche, city, profile_picture_url, media_count,
                style_profile, updated_at
         FROM creators WHERE id = $1`,
        [user.creator_id]
      );
    } else if (user.cognito_sub) {
      result = await query(
        `SELECT id AS creator_id, cognito_sub, username, display_name, bio,
                followers_count, niche, city, profile_picture_url, media_count,
                style_profile, updated_at
         FROM creators WHERE cognito_sub = $1`,
        [user.cognito_sub]
      );
    } else {
      return NextResponse.json({ error: 'No creator linked to this account' }, { status: 404 });
    }

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (e) {
    console.error('Error in GET /api/creator/profile:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { niche, city, display_name } = body;

    if (!user.creator_id) {
      return NextResponse.json({ error: 'No creator linked' }, { status: 404 });
    }

    // Build SET clause dynamically — only update provided fields
    const sets: string[] = [];
    const values: unknown[] = [];
    let param = 1;

    if (display_name !== undefined) { sets.push(`display_name = $${param++}`); values.push(display_name); }
    if (niche !== undefined)        { sets.push(`niche = $${param++}`);        values.push(niche); }
    if (city !== undefined)         { sets.push(`city = $${param++}`);         values.push(city); }

    if (sets.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    sets.push(`updated_at = NOW()`);
    values.push(user.creator_id);

    await query(
      `UPDATE creators SET ${sets.join(', ')} WHERE id = $${param}`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Error in PUT /api/creator/profile:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
