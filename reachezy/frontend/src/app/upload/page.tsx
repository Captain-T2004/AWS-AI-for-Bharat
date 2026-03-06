'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import DashboardShell from '@/components/DashboardShell';
import Link from 'next/link';

const VideoUploader = dynamic(() => import('@/components/VideoUploader'), {
  ssr: false,
  loading: () => (
    <div className="flex h-48 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
    </div>
  ),
});

export default function UploadPage() {
  const router = useRouter();
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processStep, setProcessStep] = useState(0);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await api.getProfile();
        setCreatorId(profile.creator_id);
        setUsername(profile.username);
        setDisplayName(profile.display_name || profile.username);
        setProfilePic(profile.profile_picture_url || '');
      } catch {
        router.replace('/');
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [router]);

  const handleUploadComplete = async () => {
    setIsComplete(true);
    setIsAnalyzing(true);
    setProcessStep(0);
    
    // Cycle through fake steps for better UX
    setTimeout(() => setProcessStep(1), 2500); // Start AI analysis
    setTimeout(() => setProcessStep(2), 6500); // Start media kit gen
    setTimeout(() => {
      setIsAnalyzing(false);
      router.push('/dashboard');
    }, 9500);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return (
    <DashboardShell username={username} displayName={displayName} profilePictureUrl={profilePic} title="Upload Videos">
      <div className="flex-1 flex flex-col max-w-[1200px] mx-auto w-full p-6 md:py-10">
        {/* Page Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Upload Content</h1>
          <p className="text-slate-500 text-lg">Process your videos through our AI analysis pipeline.</p>
        </div>

        {!isComplete && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Upload Zone */}
            <div className="lg:col-span-2 space-y-6">
              {creatorId && (
                <VideoUploader creatorId={creatorId} onComplete={handleUploadComplete} />
              )}
            </div>

            {/* Right: Pipeline Settings */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-primary/10 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900 mb-6">Pipeline Settings</h3>
                <div className="space-y-4 mb-8">
                  {[
                    { icon: 'image_search', label: 'Frame Extraction', status: 'Enabled' },
                    { icon: 'psychology', label: 'Groq AI Analysis', status: 'Active' },
                    { icon: 'hub', label: 'Vector Embeddings', status: 'Enabled' },
                  ].map(({ icon, label, status }) => (
                    <div key={label} className="flex items-center justify-between p-3 rounded-lg bg-background-light">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">{icon}</span>
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-center text-xs text-slate-500">
                  Estimated processing time: ~4 minutes
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing State */}
        {isComplete && isAnalyzing && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">Analyzing your content...</h2>
            <p className="text-slate-500 mb-8">
              Our AI is studying your videos to understand your unique style, production quality, and content patterns.
            </p>
            <div className="space-y-3 text-left">
              {[
                { label: 'Videos uploaded successfully', done: processStep >= 0, spin: false },
                { label: 'Running AI style analysis...', done: processStep >= 1, spin: processStep === 1 },
                { label: 'Generating media kit...', done: processStep >= 2, spin: processStep === 2 },
              ].map(({ label, done, spin }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg bg-background-light px-4 py-3 text-sm transition-all duration-300">
                  {done && !spin ? (
                    <span className="material-symbols-outlined text-emerald-500">check_circle</span>
                  ) : spin ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary flex-shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-slate-200 flex-shrink-0" />
                  )}
                  <span className={done && !spin ? 'text-slate-500' : spin ? 'text-primary font-bold' : 'text-slate-400'}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Complete State */}
        {isComplete && !isAnalyzing && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-lg mx-auto">
            <div className="size-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-emerald-600">check_circle</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">Upload Complete!</h2>
            <p className="text-slate-500">Redirecting you to your dashboard…</p>
            <div className="mt-4 flex justify-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
