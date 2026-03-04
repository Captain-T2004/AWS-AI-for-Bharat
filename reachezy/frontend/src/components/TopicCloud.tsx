'use client';

interface TopicCloudProps {
  topics: string[];
}

interface TopicStyle { bg: string; text: string }

const PALETTE: TopicStyle[] = [
  { bg: '#e0e7ff', text: '#4338ca' }, // indigo
  { bg: '#fae8ff', text: '#a21caf' }, // fuchsia
  { bg: '#dbeafe', text: '#1d4ed8' }, // blue
  { bg: '#d1fae5', text: '#047857' }, // emerald
  { bg: '#ffedd5', text: '#c2410c' }, // orange
  { bg: '#fce7f3', text: '#be185d' }, // pink
  { bg: '#ccfbf1', text: '#0f766e' }, // teal
  { bg: '#fef3c7', text: '#b45309' }, // amber
  { bg: '#cffafe', text: '#0e7490' }, // cyan
  { bg: '#ffe4e6', text: '#e11d48' }, // rose
];

const SIZES = [
  { p: '10px 16px', f: '1rem', w: 600 },
  { p: '8px 14px', f: '0.875rem', w: 500 },
  { p: '8px 12px', f: '0.875rem', w: 500 },
  { p: '6px 12px', f: '0.75rem', w: 500 },
  { p: '6px 10px', f: '0.75rem', w: 400 },
];

export default function TopicCloud({ topics }: TopicCloudProps) {
  if (!topics || topics.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-gray-400">
        No topics detected yet.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {topics.map((topic, idx) => {
        const size = SIZES[Math.min(idx, SIZES.length - 1)];
        const color = PALETTE[idx % PALETTE.length];

        return (
          <div
            key={topic}
            className="rounded-full transition-transform hover:scale-105"
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: color.bg, 
              color: color.text,
              border: `1.5px solid ${color.text}30`,
              padding: size.p,
              fontSize: size.f,
              fontWeight: size.w,
            }}
          >
            {topic}
          </div>
        );
      })}
    </div>
  );
}
