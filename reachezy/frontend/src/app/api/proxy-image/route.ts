import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side image proxy for PDF generation.
 * Fetches an external image (S3 presigned URL, CDN, etc.) and returns the raw
 * bytes as a same-origin response — bypassing browser CORS restrictions.
 *
 * Usage: GET /api/proxy-image?url=<encoded_url>
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[proxy-image] Failed to fetch:', err);
    return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 });
  }
}
