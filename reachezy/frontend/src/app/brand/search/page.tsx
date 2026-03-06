'use client';

/**
 * /brand/search — Creator discovery page for brand users.
 * Moved from /influencer-search into the /brand layout so it gets BrandShell.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { getUserRole } from '@/lib/auth';
import { NICHES, FOLLOWER_BUCKETS } from '@/lib/constants';
import CreatorCard from '@/components/CreatorCard';

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

const ENERGIES = ['high', 'moderate', 'calm', 'chaotic', 'intense'] as const;
const AESTHETICS = ['minimal', 'vibrant', 'dark', 'pastel', 'natural', 'luxury', 'corporate', 'streetwear'] as const;
const PRICE_TIERS = [
  { label: '₹', maxAvg: 3000 },
  { label: '₹₹', maxAvg: 8000 },
  { label: '₹₹₹', maxAvg: 20000 },
  { label: '₹₹₹₹', maxAvg: Infinity },
] as const;

type SortOption = 'followers_desc' | 'followers_asc' | 'name_asc';
const PAGE_SIZE = 20;

function getPriceTierIndex(rates: Rates): number {
  const avg = (rates.reel_rate + rates.story_rate + rates.post_rate) / 3;
  if (avg < 3000) return 0;
  if (avg <= 8000) return 1;
  if (avg <= 20000) return 2;
  return 3;
}

interface ParsedQuery {
  niche?: string | null;
  city?: string | null;
  keywords?: string[];
  energy?: string | null;
  aesthetic?: string | null;
  topics?: string[];
}

export default function BrandSearchPage() {
  const [allCreators, setAllCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [parsedQuery, setParsedQuery] = useState<ParsedQuery | null>(null);
  const [searchSource, setSearchSource] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [nicheFilters, setNicheFilters] = useState<string[]>([]);
  const [cityFilter, setCityFilter] = useState('');
  const [followerFilters, setFollowerFilters] = useState<string[]>([]);
  const [energyFilters, setEnergyFilters] = useState<string[]>([]);
  const [aestheticFilters, setAestheticFilters] = useState<string[]>([]);
  const [priceTierFilters, setPriceTierFilters] = useState<number[]>([]);
  const [barterOnly, setBarterOnly] = useState(false);

  // States for filters actually applied to the list
  const [appliedFilters, setAppliedFilters] = useState({
    niches: [] as string[],
    city: '',
    followers: [] as string[],
    energies: [] as string[],
    aesthetics: [] as string[],
    priceTiers: [] as number[],
    barterOnly: false,
  });

  const [sortBy, setSortBy] = useState<SortOption>('followers_desc');
  const [page, setPage] = useState(1);

  const isBrandUser = getUserRole() === 'brand';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllCreators();
      setAllCreators(data.results || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }

    if (isBrandUser) {
      try {
        const data = await api.getWishlist();
        setSavedIds(new Set<string>((data.wishlist || []).map((c: Creator) => c.creator_id)));
      } catch { /* ignore */ }
    }
  }, [isBrandUser]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApplyFilters = () => {
    setAppliedFilters({
      niches: nicheFilters,
      city: cityFilter,
      followers: followerFilters,
      energies: energyFilters,
      aesthetics: aestheticFilters,
      priceTiers: priceTierFilters,
      barterOnly,
    });
    setIsFilterOpen(false);
    setPage(1);
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) { 
      setParsedQuery(null); 
      setSearchSource(null); 
      loadData(); 
      return; 
    }
    setLoading(true);
    try {
      const data = await api.searchCreators(q);
      setAllCreators(data.results || []);
      setParsedQuery(data.parsed || null);
      setSearchSource(data.source || null);
      
      if (data.parsed) {
        const newNiches = data.parsed.niche ? [data.parsed.niche] : [];
        const newEnergies = data.parsed.energy ? [data.parsed.energy] : [];
        const newAesthetics = data.parsed.aesthetic ? [data.parsed.aesthetic] : [];

        setNicheFilters(newNiches);
        if (data.parsed.city) setCityFilter(data.parsed.city);
        setEnergyFilters(newEnergies);
        setAestheticFilters(newAesthetics);

        setAppliedFilters({
          niches: newNiches,
          city: data.parsed.city || '',
          followers: followerFilters,
          energies: newEnergies,
          aesthetics: newAesthetics,
          priceTiers: priceTierFilters,
          barterOnly,
        });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); setPage(1); }
  };

  const filtered = useMemo(() => {
    let list = [...allCreators];
    
    if (appliedFilters.niches.length > 0) {
      list = list.filter((c) => appliedFilters.niches.includes(c.niche));
    }
    
    if (appliedFilters.city.trim()) {
      const q = appliedFilters.city.trim().toLowerCase();
      list = list.filter((c) => c.city?.toLowerCase().includes(q));
    }
    
    if (appliedFilters.followers.length > 0) {
      list = list.filter((c) => {
        return appliedFilters.followers.some(f => {
          const bucket = FOLLOWER_BUCKETS.find((b) => b.label === f);
          return bucket && c.followers_count >= bucket.min && c.followers_count < bucket.max;
        });
      });
    }
    
    if (appliedFilters.energies.length > 0) {
      list = list.filter((c) => {
        const energy = c.style_profile?.dominant_energy?.toLowerCase();
        return energy && appliedFilters.energies.some(e => energy.includes(e.toLowerCase()));
      });
    }
    
    if (appliedFilters.aesthetics.length > 0) {
      list = list.filter((c) => {
        const aesthetic = c.style_profile?.dominant_aesthetic?.toLowerCase();
        return aesthetic && appliedFilters.aesthetics.some(a => aesthetic.includes(a.toLowerCase()));
      });
    }
    
    if (appliedFilters.priceTiers.length > 0) {
      list = list.filter((c) => c.rates && appliedFilters.priceTiers.includes(getPriceTierIndex(c.rates)));
    }
    
    if (appliedFilters.barterOnly) list = list.filter((c) => c.rates?.accepts_barter);

    list.sort((a, b) => {
      if (sortBy === 'followers_desc') return b.followers_count - a.followers_count;
      if (sortBy === 'followers_asc') return a.followers_count - b.followers_count;
      return (a.display_name || a.username).localeCompare(b.display_name || b.username);
    });
    return list;
  }, [allCreators, appliedFilters, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [appliedFilters, sortBy]);

  const handleToggleSave = async (creatorId: string) => {
    setSavingId(creatorId);
    try {
      if (savedIds.has(creatorId)) {
        await api.removeFromWishlist(creatorId);
        setSavedIds((prev) => { const next = new Set(prev); next.delete(creatorId); return next; });
      } else {
        await api.addToWishlist(creatorId);
        setSavedIds((prev) => new Set(prev).add(creatorId));
      }
    } catch (err) { console.error('Wishlist toggle error:', err); }
    finally { setSavingId(null); }
  };

  const hasActiveFilters = !!(
    searchQuery || 
    appliedFilters.niches.length > 0 || 
    appliedFilters.city || 
    appliedFilters.followers.length > 0 || 
    appliedFilters.energies.length > 0 || 
    appliedFilters.aesthetics.length > 0 || 
    appliedFilters.priceTiers.length > 0 || 
    appliedFilters.barterOnly || 
    sortBy !== 'followers_desc'
  );

  const clearAllFilters = () => {
    setSearchQuery(''); 
    setNicheFilters([]); 
    setCityFilter(''); 
    setFollowerFilters([]);
    setEnergyFilters([]); 
    setAestheticFilters([]); 
    setPriceTierFilters([]);
    setBarterOnly(false); 
    setSortBy('followers_desc');
    setParsedQuery(null); 
    setSearchSource(null);
    setAppliedFilters({
      niches: [],
      city: '',
      followers: [],
      energies: [],
      aesthetics: [],
      priceTiers: [],
      barterOnly: false,
    });
    loadData();
  };

  const toggleFilter = (list: any[], setList: (l: any[]) => void, item: any) => {
    setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
  };

  const pillClass = (active: boolean) =>
    `rounded-full px-2.5 py-1 text-xs transition-colors cursor-pointer ${
      active ? 'bg-primary/10 font-medium text-primary' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  return (
    // h-full overflow-hidden so the inner content area gets its own scroll
    <div className="h-full overflow-hidden flex flex-col">
      {/* Mobile Header Toggle */}
      <div className="lg:hidden p-4 border-b border-slate-200 bg-white sticky top-0 z-20 space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search creators..."
            className="input-field flex-1 text-sm h-11"
          />
          <button type="submit" className="btn-primary shrink-0 !px-4">
            <span className="material-symbols-outlined">search</span>
          </button>
        </form>
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-all"
          >
            <span className="material-symbols-outlined text-lg">tune</span>
            Filters
            {hasActiveFilters && (
              <span className="size-2 rounded-full bg-primary" />
            )}
          </button>
          <div className="text-xs font-bold text-slate-400">
            {filtered.length} Results
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-0">

        {/* Filter sidebar */}
        <aside className={`
          ${isFilterOpen ? 'flex' : 'hidden'} lg:flex 
          fixed inset-0 z-40 lg:static w-full lg:w-64 flex-col border-r border-slate-200 bg-white overflow-y-auto
        `}>
          <div className="p-5 space-y-6">
            {/* Mobile Header for Filters */}
            <div className="lg:hidden flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-slate-900">Filters</h3>
              <button 
                onClick={() => setIsFilterOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Apply Button */}
            <div className="sticky bottom-0 lg:static bg-white pt-2 lg:pt-0 pb-4 lg:pb-0 z-10 space-y-2">
              <button
                onClick={handleApplyFilters}
                className="btn-primary w-full py-3"
              >
                Apply Filters
              </button>
              
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:border-red-300 hover:bg-red-50 hover:text-red-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Clear All Filters
                </button>
              )}
            </div>

            {/* Niche */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Niche</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setNicheFilters([])} className={pillClass(nicheFilters.length === 0)}>All</button>
                {NICHES.map((niche) => (
                  <button 
                    key={niche} 
                    onClick={() => toggleFilter(nicheFilters, setNicheFilters, niche)} 
                    className={pillClass(nicheFilters.includes(niche))}
                  >
                    {niche}
                  </button>
                ))}
              </div>
            </div>

            {/* City */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">City</p>
              <input type="text" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} placeholder="Filter by city..." className="input-field w-full text-sm" />
            </div>

            {/* Followers */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Followers</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setFollowerFilters([])} className={pillClass(followerFilters.length === 0)}>All</button>
                {FOLLOWER_BUCKETS.map((b) => (
                  <button 
                    key={b.label} 
                    onClick={() => toggleFilter(followerFilters, setFollowerFilters, b.label)} 
                    className={pillClass(followerFilters.includes(b.label))}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Energy</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setEnergyFilters([])} className={pillClass(energyFilters.length === 0)}>All</button>
                {ENERGIES.map((e) => (
                  <button 
                    key={e} 
                    onClick={() => toggleFilter(energyFilters, setEnergyFilters, e)} 
                    className={pillClass(energyFilters.includes(e))}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            {/* Aesthetic */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Aesthetic</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setAestheticFilters([])} className={pillClass(aestheticFilters.length === 0)}>All</button>
                {AESTHETICS.map((a) => (
                  <button 
                    key={a} 
                    onClick={() => toggleFilter(aestheticFilters, setAestheticFilters, a)} 
                    className={pillClass(aestheticFilters.includes(a))}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Tier */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Price Tier</p>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => setPriceTierFilters([])} className={pillClass(priceTierFilters.length === 0)}>All</button>
                {PRICE_TIERS.map((tier, idx) => (
                  <button 
                    key={tier.label} 
                    onClick={() => toggleFilter(priceTierFilters, setPriceTierFilters, idx)} 
                    className={pillClass(priceTierFilters.includes(idx))}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Barter */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={barterOnly} onChange={(e) => setBarterOnly(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-primary" />
              <span className="text-sm text-slate-700">Open to Barter</span>
            </label>

            {/* Sort */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Sort By</p>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortOption)} className="input-field w-full text-sm">
                <option value="followers_desc">Followers (high to low)</option>
                <option value="followers_asc">Followers (low to high)</option>
                <option value="name_asc">Name A–Z</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* Desktop Search Bar (Always visible) */}
          <div className="hidden lg:block mb-6 max-w-2xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">AI Creator Search</p>
            <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. fashion creators in Mumbai with high energy..."
                  className="input-field w-full pl-10"
                />
              </div>
              <button type="submit" className="btn-primary px-6">
                Search
              </button>
            </form>
          </div>
          {/* AI parsed query banner */}
          {parsedQuery && (parsedQuery.niche || parsedQuery.city || parsedQuery.energy || parsedQuery.aesthetic || (parsedQuery.topics && parsedQuery.topics.length > 0)) && (
            <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="material-symbols-outlined text-primary text-base">auto_awesome</span>
                <span className="font-semibold text-primary">{searchSource === 'ai' ? 'AI Parsed' : 'Parsed'}:</span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedQuery.niche && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Niche: {parsedQuery.niche}</span>}
                  {parsedQuery.city && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">City: {parsedQuery.city}</span>}
                  {parsedQuery.energy && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Energy: {parsedQuery.energy}</span>}
                  {parsedQuery.aesthetic && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">Aesthetic: {parsedQuery.aesthetic}</span>}
                  {parsedQuery.topics?.map((t: string) => <span key={t} className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{t}</span>)}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-80 rounded-2xl border border-slate-200 skeleton animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-500 font-medium">
                {filtered.length} creator{filtered.length !== 1 ? 's' : ''} found
              </p>

              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-300">manage_search</span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700 mb-2">No creators found</h3>
                  <p className="text-sm text-slate-500 max-w-sm">Try adjusting your filters or search query</p>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {paginated.map((creator) => (
                      <CreatorCard
                        key={creator.creator_id}
                        creator={creator}
                        isSaved={savedIds.has(creator.creator_id)}
                        onToggleSave={isBrandUser ? handleToggleSave : () => {}}
                        savingId={savingId}
                        showWishlist={isBrandUser}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-8 flex items-center justify-center gap-4">
                      <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">Previous</button>
                      <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                      <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-50">Next</button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
