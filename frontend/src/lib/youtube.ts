/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📺 YouTube API 연동 모듈
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  duration?: string;
  viewCount?: number;
  channelTitle: string;
  url: string;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  subscriberCount?: number;
  videoCount?: number;
  url: string;
}

export interface YouTubeConfig {
  apiKey: string;
  channelId: string;
  maxResults?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Functions
// ─────────────────────────────────────────────────────────────────────────────

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * 채널 정보 가져오기
 */
export async function getChannelInfo(config: YouTubeConfig): Promise<YouTubeChannel | null> {
  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&id=${config.channelId}&key=${config.apiKey}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch channel');
    
    const data = await response.json();
    const channel = data.items?.[0];
    
    if (!channel) return null;
    
    return {
      id: channel.id,
      title: channel.snippet.title,
      description: channel.snippet.description,
      thumbnail: channel.snippet.thumbnails?.medium?.url || '',
      subscriberCount: parseInt(channel.statistics?.subscriberCount || '0'),
      videoCount: parseInt(channel.statistics?.videoCount || '0'),
      url: `https://youtube.com/channel/${channel.id}`,
    };
  } catch (error) {
    console.error('YouTube channel fetch error:', error);
    return null;
  }
}

/**
 * 채널의 최신 영상 목록 가져오기
 */
export async function getChannelVideos(config: YouTubeConfig): Promise<YouTubeVideo[]> {
  try {
    // 1. 채널의 업로드 플레이리스트 ID 가져오기
    const channelResponse = await fetch(
      `${YOUTUBE_API_BASE}/channels?part=contentDetails&id=${config.channelId}&key=${config.apiKey}`
    );
    
    if (!channelResponse.ok) throw new Error('Failed to fetch channel');
    
    const channelData = await channelResponse.json();
    const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) return [];
    
    // 2. 플레이리스트의 영상 목록 가져오기
    const videosResponse = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${config.maxResults || 10}&key=${config.apiKey}`
    );
    
    if (!videosResponse.ok) throw new Error('Failed to fetch videos');
    
    const videosData = await videosResponse.json();
    
    return videosData.items?.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle,
      url: `https://youtube.com/watch?v=${item.snippet.resourceId.videoId}`,
    })) || [];
  } catch (error) {
    console.error('YouTube videos fetch error:', error);
    return [];
  }
}

/**
 * 검색으로 영상 찾기
 */
export async function searchVideos(
  config: YouTubeConfig, 
  query: string
): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/search?part=snippet&channelId=${config.channelId}&q=${encodeURIComponent(query)}&type=video&maxResults=${config.maxResults || 10}&key=${config.apiKey}`
    );
    
    if (!response.ok) throw new Error('Failed to search videos');
    
    const data = await response.json();
    
    return data.items?.map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails?.medium?.url || '',
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle,
      url: `https://youtube.com/watch?v=${item.id.videoId}`,
    })) || [];
  } catch (error) {
    console.error('YouTube search error:', error);
    return [];
  }
}

/**
 * 영상 상세 정보 가져오기 (조회수, 재생시간 등)
 */
export async function getVideoDetails(
  apiKey: string, 
  videoIds: string[]
): Promise<Map<string, { viewCount: number; duration: string }>> {
  try {
    const response = await fetch(
      `${YOUTUBE_API_BASE}/videos?part=statistics,contentDetails&id=${videoIds.join(',')}&key=${apiKey}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch video details');
    
    const data = await response.json();
    const details = new Map();
    
    data.items?.forEach((item: any) => {
      details.set(item.id, {
        viewCount: parseInt(item.statistics?.viewCount || '0'),
        duration: parseDuration(item.contentDetails?.duration || ''),
      });
    });
    
    return details;
  } catch (error) {
    console.error('YouTube video details error:', error);
    return new Map();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ISO 8601 duration을 읽기 쉬운 형식으로 변환
 * PT1H2M3S -> 1:02:03
 */
function parseDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 상대적 시간 표시 (3일 전, 1주 전 등)
 */
export function getRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffYears > 0) return `${diffYears}년 전`;
  if (diffMonths > 0) return `${diffMonths}개월 전`;
  if (diffWeeks > 0) return `${diffWeeks}주 전`;
  if (diffDays > 0) return `${diffDays}일 전`;
  if (diffHours > 0) return `${diffHours}시간 전`;
  if (diffMins > 0) return `${diffMins}분 전`;
  return '방금 전';
}

/**
 * 조회수 포맷 (1.2만, 35만 등)
 */
export function formatViewCount(count: number): string {
  if (count >= 100000000) return `${(count / 100000000).toFixed(1)}억`;
  if (count >= 10000) return `${(count / 10000).toFixed(1)}만`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}천`;
  return count.toString();
}

/**
 * 유튜브 영상 ID 추출 (URL에서)
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * 유튜브 채널 ID 추출 (URL에서)
 */
export function extractChannelId(url: string): string | null {
  const patterns = [
    /youtube\.com\/channel\/([^\/\n?#]+)/,
    /youtube\.com\/@([^\/\n?#]+)/,  // Handle @username format
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// React Hook
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';

export function useYouTubeChannel(config: YouTubeConfig | null) {
  const [channel, setChannel] = useState<YouTubeChannel | null>(null);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!config?.apiKey || !config?.channelId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [channelData, videosData] = await Promise.all([
        getChannelInfo(config),
        getChannelVideos(config),
      ]);
      
      setChannel(channelData);
      setVideos(videosData);
    } catch (err) {
      setError('유튜브 데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [config?.apiKey, config?.channelId, config?.maxResults]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { channel, videos, loading, error, refetch: fetchData };
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage 설정 관리
// ─────────────────────────────────────────────────────────────────────────────

const YOUTUBE_CONFIG_KEY = 'autus_youtube_config';

export function saveYouTubeConfig(config: Partial<YouTubeConfig>): void {
  const existing = loadYouTubeConfig();
  const updated = { ...existing, ...config };
  localStorage.setItem(YOUTUBE_CONFIG_KEY, JSON.stringify(updated));
}

export function loadYouTubeConfig(): YouTubeConfig | null {
  try {
    const stored = localStorage.getItem(YOUTUBE_CONFIG_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function clearYouTubeConfig(): void {
  localStorage.removeItem(YOUTUBE_CONFIG_KEY);
}
