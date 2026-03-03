'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import NicheSelector from '@/components/NicheSelector';
import RateCardForm from '@/components/RateCardForm';
import { clearToken } from '@/lib/auth';

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !city) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleRatesSubmit = async (rates: { reel_rate: number; story_rate: number; post_rate: number; accepts_barter: boolean }) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.updateProfile({ niche, city });
      const profile = await api.getProfile();
      await api.submitRates({ creator_id: profile.creator_id, ...rates });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    router.replace('/login');
  };

  return (
    <div className="flex min-h-screen flex-col bg-background-light font-display text-slate-900 antialiased">
      {/* ── Top Navigation ── */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 md:px-10 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-white group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 hidden sm:block">ReachEzy</h2>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-semibold text-slate-500 hidden sm:block">Setup your Creator Profile</span>
          <button onClick={handleLogout} className="btn-ghost text-sm py-1.5 px-3 text-red-600 hover:text-red-700 hover:bg-red-50">
            <span className="material-symbols-outlined text-base">logout</span>
            Exit Setup
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          {/* Step Indicator */}
          <div className="mb-10 text-center relative px-8">
            <div className="flex items-center justify-between relative z-10 w-full">
              <div className="flex flex-col items-center gap-2">
                <div className={`flex size-10 items-center justify-center rounded-2xl font-black text-lg transition-all shadow-sm ${step >= 1 ? 'bg-primary text-white scale-110 shadow-primary/20' : 'bg-white border text-slate-400'}`}>1</div>
                <span className={`text-xs font-bold uppercase tracking-wider ${step >= 1 ? 'text-primary' : 'text-slate-400'}`}>About You</span>
              </div>
              <div className="flex-1 mx-4 h-0.5 mt-[-20px] bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full bg-primary transition-all duration-500 ${step >= 2 ? 'w-full' : 'w-0'}`} />
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className={`flex size-10 items-center justify-center rounded-2xl font-black text-lg transition-all shadow-sm ${step >= 2 ? 'bg-primary text-white scale-110 shadow-primary/20' : 'bg-white border text-slate-400'}`}>2</div>
                <span className={`text-xs font-bold uppercase tracking-wider ${step >= 2 ? 'text-primary' : 'text-slate-400'}`}>Your Rates</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-8 sm:p-10 relative overflow-hidden">
            {/* Background flourish */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full pointer-events-none" />

            {/* Step 1: Profile */}
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative z-10">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-2xl" aria-hidden="true">person_add</span>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tell us about yourself</h1>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-[90%]">
                    This helps us find the right benchmarks for your niche and location to give you accurate insights.
                  </p>
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">Your Niche</label>
                    <NicheSelector value={niche} onChange={setNiche} />
                  </div>

                  <div>
                    <label htmlFor="city" className="mb-2 block text-sm font-bold text-slate-700">City</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-primary transition-colors">
                        <span className="material-symbols-outlined text-xl">location_on</span>
                      </div>
                      <input
                        id="city" type="text" placeholder="e.g. Mumbai, Delhi, Bangalore"
                        value={city} onChange={(e) => setCity(e.target.value)}
                        className="input-field pl-12 h-14 text-base bg-slate-50 border-slate-200 focus:bg-white focus:border-primary shadow-inner-sm w-full"
                        required
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 border border-red-100 text-red-600">
                      <span className="material-symbols-outlined text-lg">error</span>
                      <p className="text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <button type="submit" className="btn-primary w-full h-14 text-lg mt-4 shadow-primary-sm group">
                    Next: Set Your Rates
                    <span className="material-symbols-outlined ml-2 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </button>
                </form>
              </div>
            )}

            {/* Step 2: Rates */}
            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative z-10">
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary text-2xl" aria-hidden="true">payments</span>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">What do you charge?</h1>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed max-w-[90%]">
                    Enter your standard rates per deliverable. This builds your live Media Kit and unlocks precise market benchmarks.
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 border border-red-100 text-red-600 mb-6">
                    <span className="material-symbols-outlined text-lg">error</span>
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                )}

                <RateCardForm onSubmit={handleRatesSubmit} isLoading={isLoading} />

                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="mt-6 flex items-center justify-center gap-2 w-full py-3 text-sm font-bold text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">arrow_back</span>
                  Back to profile details
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
