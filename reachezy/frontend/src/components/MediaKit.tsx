'use client';

import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { formatINR, getFollowerBucket } from '@/lib/constants';
import BenchmarkDisplay from './BenchmarkDisplay';
import StyleDNA from './StyleDNA';
import TopicCloud from './TopicCloud';

interface Creator {
  username: string;
  full_name: string;
  biography: string;
  profile_picture_url: string;
  followers_count: number;
  media_count: number;
  niche: string;
  city: string;
}

interface Rates {
  reel_rate: number;
  story_rate: number;
  post_rate: number;
  accepts_barter: boolean;
}

interface Benchmarks {
  niche_percentile: { reel: number; story: number; post: number };
  overall_percentile: { reel: number; story: number; post: number };
  source: string;
  sample_size?: number;
}

interface StyleProfile {
  dominant_energy: string;
  energy_score: number;
  dominant_aesthetic: string;
  primary_content_type: string;
  style_summary: string;
  consistency_score: number;
  topics: string[];
  face_visible_pct: number;
  text_overlay_pct: number;
  settings: { name: string; pct: number }[];
}

interface Video {
  id: string;
  thumbnail_url: string;
  title: string;
}

interface MediaKitProps {
  creator: Creator;
  videos: Video[];
  benchmarks: Benchmarks | null;
  thumbnailUrls: string[];
  rates?: Rates;
  styleProfile?: StyleProfile | null;
}

export default function MediaKit({
  creator,
  videos,
  benchmarks,
  thumbnailUrls,
  rates,
  styleProfile,
}: MediaKitProps) {
  const followerBucket = getFollowerBucket(creator.followers_count);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const kitRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (url) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleDownloadPDF = async () => {
    if (!kitRef.current) { window.print(); return; }
    setDownloading(true);
    try {
      const canvas = await html2canvas(kitRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#f8fafc',
        onclone: (_doc, clonedEl) => {
          clonedEl.querySelectorAll<HTMLElement>('.pdf-hide').forEach(el => {
            el.style.display = 'none';
          });
        },
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;
      const imgH = (canvas.height * usableW) / canvas.width;

      if (imgH <= usableH) {
        // Fits on one page as-is
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableW, imgH);
      } else if (imgH <= usableH * 1.5) {
        // Slightly too tall — scale down to fit one page
        const scale = usableH / imgH;
        const finalW = usableW * scale;
        const finalH = usableH;
        const xOffset = margin + (usableW - finalW) / 2;
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', xOffset, margin, finalW, finalH);
      } else {
        // Multi-page: crop canvas into clean per-page slices
        const pxPerMm = canvas.width / usableW;
        const sliceHeightPx = Math.floor(usableH * pxPerMm);
        let yOffset = 0;
        let pageNum = 0;
        while (yOffset < canvas.height) {
          if (pageNum > 0) pdf.addPage();
          const thisSlicePx = Math.min(sliceHeightPx, canvas.height - yOffset);
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = thisSlicePx;
          const ctx = sliceCanvas.getContext('2d')!;
          ctx.drawImage(canvas, 0, yOffset, canvas.width, thisSlicePx, 0, 0, canvas.width, thisSlicePx);
          const sliceH = (thisSlicePx * usableW) / canvas.width;
          pdf.addImage(sliceCanvas.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, usableW, sliceH);
          yOffset += sliceHeightPx;
          pageNum++;
        }
      }

      pdf.save(`${creator.username}-media-kit.pdf`);
    } catch (err) {
      console.error('PDF generation failed, falling back to print:', err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div ref={kitRef} className="mx-auto max-w-4xl px-4 py-12 sm:px-6 space-y-8">
      {/* ── Profile Header Card ── */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 p-8 sm:p-12 text-center relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center overflow-hidden rounded-[1.5rem] bg-slate-50 border-4 border-white shadow-lg ring-1 ring-slate-100">
            {creator.profile_picture_url ? (
              <img src={creator.profile_picture_url} alt={creator.username} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/10 text-5xl font-black text-primary">
                {creator.full_name?.[0] || creator.username[0]}
              </div>
            )}
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            {creator.full_name || `@${creator.username}`}
            <span className="material-symbols-outlined text-primary ml-2 align-middle text-2xl" aria-hidden="true">verified</span>
          </h1>
          <p className="mt-2 text-lg text-slate-500 font-medium">@{creator.username}</p>
          
          {creator.biography && (
            <p className="mx-auto mt-6 max-w-xl text-base text-slate-600 leading-relaxed">
              {creator.biography}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center rounded-xl bg-primary/10 px-4 py-2 text-sm font-bold text-primary tracking-wide uppercase">
              {creator.niche}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200">
              <span className="material-symbols-outlined text-lg" aria-hidden="true">location_on</span>
              {creator.city}
            </span>
          </div>
        </div>
      </div>

      {/* ── Stats + Actions Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
          <p className="text-3xl font-black text-slate-900">{formatFollowers(creator.followers_count)}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Followers</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
          <p className="text-3xl font-black text-slate-900">{creator.media_count}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">Posts</p>
        </div>
        <button onClick={handleCopyLink} className="pdf-hide btn-secondary justify-center group flex items-center h-full rounded-2xl border border-slate-100 shadow-sm">
          {copied ? (
            <><span className="material-symbols-outlined mr-2 text-emerald-500">check_circle</span> <span className="text-emerald-600 font-bold">Link Copied!</span></>
          ) : (
            <><span className="material-symbols-outlined mr-2 group-hover:scale-110 transition-transform">ios_share</span> Share Kit</>
          )}
        </button>
        <button onClick={handleDownloadPDF} disabled={downloading} className="pdf-hide btn-primary justify-center shadow-primary-sm group flex items-center h-full rounded-2xl disabled:opacity-60">
          {downloading ? (
            <><span className="material-symbols-outlined mr-2 animate-spin">progress_activity</span> Generating...</>
          ) : (
            <><span className="material-symbols-outlined mr-2 group-hover:-translate-y-0.5 transition-transform">picture_as_pdf</span> Download PDF</>
          )}
        </button>
        <style jsx global>{`
          @media print {
            body * { visibility: hidden; }
            .mx-auto.max-w-4xl, .mx-auto.max-w-4xl * { visibility: visible; }
            .mx-auto.max-w-4xl { position: absolute; left: 0; top: 0; width: 100%; max-width: 100%; padding: 20px; }
            nav, header, footer, button, .btn-primary, .btn-secondary { display: none !important; }
            @page { size: A4; margin: 15mm; }
          }
        `}</style>
      </div>

      {/* ── Rate Card (full width) ── */}
      {rates && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">monetization_on</span>
              <h2 className="text-xl font-bold text-slate-900">Rate Card</h2>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Benchmark Tier</p>
              <p className="text-sm font-semibold text-primary">{followerBucket}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Reel / Short', value: rates.reel_rate },
              { label: 'Story (24h)', value: rates.story_rate },
              { label: 'Static Post', value: rates.post_rate }
            ].map(r => (
              <div key={r.label} className="rounded-[1.5rem] bg-background-light p-6 text-center border border-slate-100 transition-transform hover:-translate-y-1">
                <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-2">{r.label}</p>
                <p className="text-3xl font-black text-slate-900">{formatINR(r.value)}</p>
              </div>
            ))}
          </div>

          {rates.accepts_barter && (
            <div className="mb-8 flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3">
              <span className="material-symbols-outlined text-emerald-600 text-lg">handshake</span>
              <span className="text-sm font-bold text-emerald-800">Open to barter & product exchange collaborations</span>
            </div>
          )}

          {benchmarks && (
            <div className="mt-8">
              <BenchmarkDisplay
                benchmarks={benchmarks}
                niche={creator.niche}
                followerBucket={followerBucket}
                rates={{ reel: rates.reel_rate, story: rates.story_rate, post: rates.post_rate }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Content Style (full width) ── */}
      {styleProfile && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
            <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">psychology</span>
            <h2 className="text-xl font-bold text-slate-900">Content Style</h2>
          </div>
          <StyleDNA styleProfile={styleProfile} />

          {styleProfile.topics && styleProfile.topics.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Dominant Topics</h3>
              <TopicCloud topics={styleProfile.topics} />
            </div>
          )}
        </div>
      )}

      {/* ── Top Content Portfolio (full width) ── */}
      <div className="pdf-hide bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <span className="material-symbols-outlined text-primary text-xl" aria-hidden="true">play_circle</span>
          <h2 className="text-xl font-bold text-slate-900">Top Content</h2>
        </div>

        {thumbnailUrls.length > 0 || videos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(thumbnailUrls.length > 0 ? thumbnailUrls.slice(0, 6) : videos.slice(0, 6)).map((item, idx) => (
              <div key={idx} className="aspect-[9/16] overflow-hidden rounded-[1.5rem] bg-slate-100 ring-1 ring-slate-200 shadow-sm group relative">
                {typeof item === 'string' ? (
                  <img src={item} alt={`Content ${idx + 1}`} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-slate-300">movie</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <span className="material-symbols-outlined text-white">play_arrow</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex aspect-[9/16] items-center justify-center rounded-[1.5rem] bg-slate-50 border border-slate-100 border-dashed">
                <span className="material-symbols-outlined text-3xl text-slate-200">video_camera_back</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
