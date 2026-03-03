'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { getUserSession } from '@/lib/auth';
import { INDUSTRIES } from '@/lib/constants';
import BrandCard from '@/components/BrandCard';

interface Brand {
  user_id: string;
  company_name: string;
  industry: string;
  city: string;
  contact_name: string;
}

type SortOption = 'name_asc' | 'name_desc';
const PAGE_SIZE = 20;

export default function BrandSearchPage() {
  const router = useRouter();
  const [allBrands, setAllBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const session = getUserSession();
    if (!session) router.replace('/login');
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAllBrands();
      setAllBrands(data.brands || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) { loadData(); return; }
    setLoading(true);
    try {
      const data = await api.searchBrands(q);
      setAllBrands(data.brands || []);
    } catch { /* ignore */ }
    finally { setLoading(false); setPage(1); }
  };

  const filtered = useMemo(() => {
    let list = [...allBrands];
    if (industryFilter) list = list.filter(b => b.industry === industryFilter);
    if (cityFilter.trim()) {
      const q = cityFilter.trim().toLowerCase();
      list = list.filter(b => b.city?.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      const nameA = a.company_name || '';
      const nameB = b.company_name || '';
      return sortBy === 'name_asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });
    return list;
  }, [allBrands, industryFilter, cityFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { setPage(1); }, [industryFilter, cityFilter, sortBy]);

  return (
    <div className="relative flex min-h-screen flex-col bg-background-light font-display text-slate-900 antialiased">
      {/* ── Top Navigation ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 md:px-10 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center justify-center size-10 rounded-lg bg-primary text-white">
            <span className="material-symbols-outlined">rocket_launch</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Influencer Marketplace</h2>
        </div>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Dashboard</Link>
            <span className="text-sm font-medium text-primary">Discover</span>
            <Link href="/analytics" className="text-sm font-medium text-slate-600 hover:text-primary transition-colors">Analytics</Link>
          </nav>
          <Link href="/dashboard" className="btn-ghost text-sm py-1.5">
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Back
          </Link>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* ── Sidebar ── */}
        <aside className="w-full lg:w-64 border-r border-slate-200 p-6 hidden lg:block flex-shrink-0">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">Navigation</p>
              <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-primary/5 rounded-lg transition-colors">
                <span className="material-symbols-outlined">dashboard</span>
                <span className="text-sm font-medium">Dashboard</span>
              </Link>
              <span className="flex items-center gap-3 px-3 py-2 bg-primary/10 text-primary rounded-lg">
                <span className="material-symbols-outlined fill-icon">explore</span>
                <span className="text-sm font-medium">Discover</span>
              </span>
              <Link href="/brand-search" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-primary/5 rounded-lg transition-colors">
                <span className="material-symbols-outlined">corporate_fare</span>
                <span className="text-sm font-medium">Brands</span>
              </Link>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">Quick Actions</p>
              <button className="w-full py-2.5 px-4 bg-primary text-white rounded-lg text-sm font-bold shadow-primary-sm hover:scale-[1.02] transition-transform">
                Post a Brief
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 p-6 md:p-10 space-y-8">
          {/* Search & Header */}
          <div className="max-w-4xl space-y-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-bold text-slate-900">Find Brands</h1>
              <p className="text-slate-500">Discover brands looking to collaborate with creators.</p>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                <span className="material-symbols-outlined">search</span>
              </div>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search brands by name, industry..."
                className="block w-full pl-12 pr-28 py-4 bg-white border-none ring-1 ring-slate-200 rounded-xl text-lg focus:ring-2 focus:ring-primary focus:outline-none shadow-sm placeholder:text-slate-400"
              />
              <div className="absolute inset-y-2 right-2 flex items-center">
                <button
                  onClick={handleSearch}
                  className="h-full px-6 bg-primary text-white text-sm font-bold rounded-lg hover:bg-primary/90 transition-all"
                >
                  Search
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative">
              <select
                value={industryFilter || ''}
                onChange={e => setIndustryFilter(e.target.value || null)}
                className="appearance-none bg-background-light border-none rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="">Industry: All</option>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
            </div>
            <div className="relative">
              <input
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                placeholder="Filter by city..."
                className="appearance-none bg-background-light border-none rounded-lg px-4 py-2 text-sm font-medium focus:ring-1 focus:ring-primary outline-none"
              />
            </div>
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortOption)}
                className="appearance-none bg-background-light border-none rounded-lg px-4 py-2 pr-10 text-sm font-medium focus:ring-1 focus:ring-primary outline-none"
              >
                <option value="name_asc">Name A→Z</option>
                <option value="name_desc">Name Z→A</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
            </div>
          </div>

          {/* Results Grid */}
          {loading ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
              <p className="text-slate-500">Loading brands...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-6xl text-slate-300">search_off</span>
              <p className="mt-4 text-slate-500 font-medium">No brands match your filters</p>
              <p className="text-sm text-slate-400">Try adjusting your criteria</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500">{filtered.length} brand{filtered.length !== 1 ? 's' : ''} found</p>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {paginated.map(brand => (
                  <BrandCard key={brand.user_id} brand={brand} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-primary transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`size-10 rounded-lg font-bold text-sm transition-all ${page === p ? 'bg-primary text-white' : 'bg-white border border-slate-200 hover:bg-slate-50'}`}
                    >
                      {p}
                    </button>
                  ))}
                  {totalPages > 5 && <span className="text-slate-400 px-2">...</span>}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-primary transition-all disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
