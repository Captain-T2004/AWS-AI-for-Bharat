import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';
import NotificationsDropdown from './NotificationsDropdown';

interface BrandShellProps {
  children: React.ReactNode;
  companyName: string;
  avatarUrl?: string;
  title: string;
  savedCount?: number;
}

const NAV = [
  { href: '/brand/dashboard',  icon: 'dashboard',        label: 'Dashboard' },
  { href: '/brand/search',     icon: 'manage_search',    label: 'Find Creators' },
  { href: '/brand/wishlist',   icon: 'favorite',         label: 'Saved Creators' },
  { href: '/brand/messages',     icon: 'chat',           label: 'Messages' },
];

export default function BrandShell({ children, companyName, avatarUrl, title, savedCount }: BrandShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const handleLogout = () => { clearToken(); router.replace('/'); };
  const initials = (companyName || 'B')[0].toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background-light font-display">
      {/* ── Mobile Sidebar Overlay ── */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay opacity-100" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg text-white">
              <span className="material-symbols-outlined block">auto_awesome</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">ReachEzy</h2>
          </div>
          {/* Mobile Close button */}
          <button 
            className="lg:hidden p-2 text-slate-400 hover:text-slate-600"
            onClick={() => setIsSidebarOpen(false)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 space-y-1 mt-2">
          {NAV.map(({ href, icon, label }) => {
            const active = pathname === href || (href === '/brand/search' && pathname === '/influencer-search');
            const isSaved = href === '/brand/wishlist';
            return (
              <Link
                key={href}
                href={href}
                className={active ? 'nav-link-active' : 'nav-link'}
                onClick={() => setIsSidebarOpen(false)}
              >
                <span className="material-symbols-outlined">{icon}</span>
                {label}
                {isSaved && savedCount != null && savedCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                    {savedCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Brand profile at bottom */}
        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2">
            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 overflow-hidden ${avatarUrl ? 'bg-white border border-slate-200' : 'bg-gradient-to-br from-primary/70 to-primary text-white'}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={companyName} className="h-full w-full object-contain p-0.5" />
              ) : (
                initials
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-bold truncate">{companyName}</p>
              <p className="text-xs text-slate-500">Brand Account</p>
            </div>
            <button
              onClick={handleLogout}
              className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
              title="Sign out"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Sticky header */}
        <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 md:px-8 sticky top-0 z-10 flex-shrink-0">
          <div className="flex items-center gap-4">
            {/* Mobile Toggle */}
            <button 
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-lg font-bold text-slate-900 truncate">{title}</h1>
          </div>

          <div className="flex items-center gap-3 md:gap-4">
            <NotificationsDropdown />
            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden cursor-pointer hover:opacity-90 transition-opacity ${avatarUrl ? 'bg-white border border-slate-200' : 'bg-gradient-to-br from-primary/70 to-primary text-white'}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={companyName} className="h-full w-full object-contain p-0.5" />
              ) : (
                initials
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
