'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { api } from '@/lib/api';

export interface CreatorProfile {
  creator_id: string;
  username: string;
  display_name: string;
  profile_picture_url: string;
  niche: string;
  city: string;
  bio: string;
  cognito_sub: string;
  followers_count: number;
  media_count: number;
  style_profile: StyleProfile | null;
}

export interface StyleProfile {
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

interface DashboardContextValue {
  profile: CreatorProfile | null;
  loading: boolean;
  pageTitle: string;
  setPageTitle: (title: string) => void;
  refreshProfile: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue>({
  profile: null,
  loading: true,
  pageTitle: 'Dashboard',
  setPageTitle: () => {},
  refreshProfile: async () => {},
});

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<CreatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState('Dashboard');

  const refreshProfile = useCallback(async () => {
    try {
      const p = await api.getProfile();
      setProfile(p);
    } catch {
      // Silently fail — pages can react to null profile
    }
  }, []);

  useEffect(() => {
    api.getProfile()
      .then((p) => setProfile(p))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardContext.Provider value={{ profile, loading, pageTitle, setPageTitle, refreshProfile }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  return useContext(DashboardContext);
}
