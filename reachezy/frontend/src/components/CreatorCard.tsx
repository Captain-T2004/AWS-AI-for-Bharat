
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

interface CreatorCardProps {
  creator: Creator;
  isSaved: boolean;
  onToggleSave: (creatorId: string) => void;
  savingId?: string | null;
  showWishlist?: boolean;
}

const ENERGY_COLORS: Record<string, string> = {
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  moderate: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
  calm: 'bg-blue-100 text-blue-700',
  chaotic: 'bg-red-100 text-red-700',
  intense: 'bg-red-100 text-red-700',
};

const AESTHETIC_COLORS: Record<string, string> = {
  minimal: 'bg-gray-100 text-gray-700',
  vibrant: 'bg-pink-100 text-pink-700',
  'dark/moody': 'bg-slate-200 text-slate-700',
  dark: 'bg-slate-200 text-slate-700',
  pastel: 'bg-purple-100 text-purple-700',
  natural: 'bg-green-100 text-green-700',
  luxury: 'bg-amber-100 text-amber-700',
  corporate: 'bg-blue-100 text-blue-700',
  streetwear: 'bg-zinc-200 text-zinc-700',
};

function getPriceTier(rates: Rates): { label: string; color: string } {
  const avg = (rates.reel_rate + rates.story_rate + rates.post_rate) / 3;
  if (avg < 3000) return { label: '\u20B9', color: 'bg-green-100 text-green-700 border-green-200' };
  if (avg <= 8000) return { label: '\u20B9\u20B9', color: 'bg-blue-100 text-blue-700 border-blue-200' };
  if (avg <= 20000) return { label: '\u20B9\u20B9\u20B9', color: 'bg-purple-100 text-purple-700 border-purple-200' };
  return { label: '\u20B9\u20B9\u20B9\u20B9', color: 'bg-amber-100 text-amber-700 border-amber-200' };
}

const NICHE_ACCENTS: Record<string, string> = {
  'Fashion': 'border-l-pink-400',
  'Beauty/Cosmetics': 'border-l-rose-400',
  'Fitness/Health': 'border-l-green-400',
  'Food': 'border-l-orange-400',
  'Tech': 'border-l-blue-400',
  'Travel': 'border-l-teal-400',
  'Education': 'border-l-indigo-400',
  'Comedy/Entertainment': 'border-l-yellow-400',
  'Lifestyle': 'border-l-violet-400',
  'Parenting': 'border-l-sky-400',
};

export default function CreatorCard({
  creator,
  isSaved,
  onToggleSave,
  savingId,
  showWishlist = true,
}: CreatorCardProps) {
  const style = creator.style_profile || {};
  const energy = style.dominant_energy;
  const aesthetic = style.dominant_aesthetic;
  const contentType = style.primary_content_type;
  const topics = style.topics || [];
  const initial = (creator.display_name || creator.username)?.[0]?.toUpperCase() || '?';

  const formatFollowers = (count: number) => {
    if (count >= 100000) return `${(count / 100000).toFixed(1)}L`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className={`card flex flex-col border-l-4 transition-all duration-200 hover:border-primary-200 hover:shadow-md ${NICHE_ACCENTS[creator.niche] || 'border-l-gray-300'}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-purple-500 text-lg font-bold text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-900">
              {creator.display_name || creator.username}
            </h3>
            {showWishlist && (
              <button
                onClick={() => onToggleSave(creator.creator_id)}
                disabled={savingId === creator.creator_id}
                className="ml-auto shrink-0"
                title={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <svg
                  className={`h-5 w-5 transition-colors ${
                    isSaved
                      ? 'fill-red-500 text-red-500'
                      : 'fill-none text-gray-400 hover:text-red-400'
                  }`}
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                  />
                </svg>
              </button>
            )}
          </div>
          <p className="text-sm text-gray-500">@{creator.username}</p>
        </div>
      </div>

      {/* Niche + Location + Followers */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {creator.niche && (
          <span className="inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            {creator.niche}
          </span>
        )}
        {creator.city && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z" />
            </svg>
            {creator.city}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-1.997M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          {formatFollowers(creator.followers_count)}
        </span>
      </div>

      {/* Style Tags */}
      {(energy || aesthetic || contentType) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {energy && (
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${ENERGY_COLORS[energy] || 'bg-gray-100 text-gray-600'}`}>
              {energy} energy
            </span>
          )}
          {aesthetic && (
            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${AESTHETIC_COLORS[aesthetic] || 'bg-gray-100 text-gray-600'}`}>
              {aesthetic}
            </span>
          )}
          {contentType && (
            <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {contentType}
            </span>
          )}
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {topics.slice(0, 5).map((topic) => (
            <span
              key={topic}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {topic}
            </span>
          ))}
          {topics.length > 5 && (
            <span className="text-xs text-gray-400">+{topics.length - 5} more</span>
          )}
        </div>
      )}

      {/* Price Tier */}
      {creator.rates && (() => {
        const tier = getPriceTier(creator.rates);
        return (
          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-bold tracking-wide ${tier.color}`}>
              {tier.label}
            </span>
            <span className="text-xs text-gray-400">price range</span>
            {creator.rates.accepts_barter && (
              <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 border border-emerald-200">
                open to barter
              </span>
            )}
          </div>
        );
      })()}

      {/* Spacer to push actions to bottom */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <a
          href={`/${creator.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary flex-1 text-center text-xs"
        >
          View Kit
        </a>
        <a
          href={`/messages?name=${encodeURIComponent(creator.display_name || creator.username)}&niche=${encodeURIComponent(creator.niche || '')}&city=${encodeURIComponent(creator.city || '')}&followers=${encodeURIComponent(formatFollowers(creator.followers_count))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          WhatsApp
        </a>
      </div>
    </div>
  );
}
