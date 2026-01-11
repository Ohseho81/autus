/**
 * AUTUS Learning Hook
 * ====================
 * 
 * Learning V2 API 연동
 * - 추천 시스템
 * - 학습 소스 관리
 * - ROF 점수 계산
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';

// ============================================
// Types
// ============================================

export interface ROFScore {
  result: number;
  optimization: number;
  future: number;
  total?: number;
}

export interface Recommendation {
  rec_id: string;
  rec_type: string;
  icon: string;
  title: string;
  description: string;
  rof_score: ROFScore | null;
  expected_impact: Record<string, any>;
  action_type: string;
  action_data: Record<string, any>;
  priority: number;
  confidence: number;
}

export interface RecommendationSimple {
  rec_id: string;
  icon: string;
  title: string;
  description: string;
  action_type: string;
  priority: number;
  rof: ROFScore | null;
}

export interface LearningSource {
  source_id: string;
  layer: string;
  name: string;
  connected: boolean;
  last_updated: string | null;
  data_quality: number;
}

export interface LayerSummary {
  layer: string;
  name: string;
  description: string;
  sources_count: number;
  connected_count: number;
  auto: boolean;
}

export interface Discovery {
  id: string;
  text: string;
  confidence: number;
  feedback?: 'positive' | 'negative';
}

export interface Automation {
  id: string;
  name: string;
  enabled: boolean;
  executions: number;
}

export interface LearningStats {
  accuracy: number;
  accuracy_change: number;
  weekly_auto_count: number;
  time_saved: number;
  total_rules: number;
  active_automations: number;
}

// ============================================
// API Client
// ============================================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {},
  authHeaders: Record<string, string> = {}
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { data: null, error: errorData.detail || `Error: ${response.status}` };
    }

    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: 'Network error' };
  }
}

// ============================================
// Hook
// ============================================

export function useLearning(userId: string = 'default_user') {
  const { getAuthHeader } = useAuth();
  
  const [recommendations, setRecommendations] = useState<RecommendationSimple[]>([]);
  const [sources, setSources] = useState<LearningSource[]>([]);
  const [layers, setLayers] = useState<Record<string, LayerSummary>>({});
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recommendations
  const fetchRecommendations = useCallback(async (simple = true) => {
    setLoading(true);
    const { data, error } = await fetchApi<{
      recommendations: RecommendationSimple[];
      count: number;
    }>(
      `/learning/recommendations/${userId}?simple=${simple}`,
      {},
      getAuthHeader()
    );

    if (error) {
      setError(error);
    } else if (data) {
      setRecommendations(data.recommendations);
    }
    setLoading(false);
  }, [userId, getAuthHeader]);

  // Accept recommendation
  const acceptRecommendation = useCallback(async (recId: string) => {
    const { data, error } = await fetchApi(
      `/learning/recommendations/${userId}/accept/${recId}`,
      { method: 'POST' },
      getAuthHeader()
    );

    if (!error) {
      setRecommendations(prev => prev.filter(r => r.rec_id !== recId));
    }
    return { success: !error, error };
  }, [userId, getAuthHeader]);

  // Dismiss recommendation
  const dismissRecommendation = useCallback(async (recId: string) => {
    const { data, error } = await fetchApi(
      `/learning/recommendations/${userId}/dismiss/${recId}`,
      { method: 'POST' },
      getAuthHeader()
    );

    if (!error) {
      setRecommendations(prev => prev.filter(r => r.rec_id !== recId));
    }
    return { success: !error, error };
  }, [userId, getAuthHeader]);

  // Fetch learning sources
  const fetchSources = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchApi<{
      layers: Record<string, LayerSummary>;
      sources: LearningSource[];
    }>(
      `/learning/sources/${userId}`,
      {},
      getAuthHeader()
    );

    if (error) {
      setError(error);
    } else if (data) {
      setLayers(data.layers);
      setSources(data.sources);
    }
    setLoading(false);
  }, [userId, getAuthHeader]);

  // Connect service
  const connectService = useCallback(async (serviceId: string) => {
    const { data, error } = await fetchApi(
      `/learning/sources/${userId}/connect/${serviceId}`,
      { method: 'POST' },
      getAuthHeader()
    );

    if (!error) {
      await fetchSources();
    }
    return { success: !error, error };
  }, [userId, getAuthHeader, fetchSources]);

  // Set interests
  const setInterests = useCallback(async (industries: string[], keywords: string[]) => {
    const { data, error } = await fetchApi(
      `/learning/sources/${userId}/interests`,
      {
        method: 'POST',
        body: JSON.stringify({ industries, keywords }),
      },
      getAuthHeader()
    );

    return { success: !error, error };
  }, [userId, getAuthHeader]);

  // Calculate ROF
  const calculateROF = useCallback(async (
    expectedImpact: Record<string, any>,
    userState?: Record<string, any>
  ) => {
    const { data, error } = await fetchApi<{
      rof_score: ROFScore;
      weights: Record<string, number>;
      total: number;
    }>(
      `/learning/rof/calculate`,
      {
        method: 'POST',
        body: JSON.stringify({
          expected_impact: expectedImpact,
          user_state: userState,
        }),
      },
      getAuthHeader()
    );

    if (error) {
      return { rof: null, error };
    }
    return { rof: data, error: null };
  }, [getAuthHeader]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    const { data, error } = await fetchApi<{
      user_id: string;
      metrics: LearningStats;
    }>(
      `/learning/status/${userId}`,
      {},
      getAuthHeader()
    );

    if (!error && data) {
      setStats(data.metrics as LearningStats);
    }
    return { stats: data?.metrics, error };
  }, [userId, getAuthHeader]);

  // Initial fetch
  useEffect(() => {
    fetchRecommendations();
    fetchSources();
    fetchStats();
  }, [fetchRecommendations, fetchSources, fetchStats]);

  return {
    // State
    recommendations,
    sources,
    layers,
    stats,
    loading,
    error,

    // Actions
    fetchRecommendations,
    acceptRecommendation,
    dismissRecommendation,
    fetchSources,
    connectService,
    setInterests,
    calculateROF,
    fetchStats,
    
    // Refresh all
    refresh: useCallback(async () => {
      await Promise.all([
        fetchRecommendations(),
        fetchSources(),
        fetchStats(),
      ]);
    }, [fetchRecommendations, fetchSources, fetchStats]),
  };
}

export default useLearning;
