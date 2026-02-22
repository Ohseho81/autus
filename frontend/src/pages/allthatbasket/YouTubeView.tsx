/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📺 온리쌤 - 유튜브 영상 뷰
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Youtube, Play, Eye, Clock, ExternalLink, Settings, 
  RefreshCw, X, Check, AlertCircle, Search
} from 'lucide-react';
import { 
  YouTubeVideo, 
  YouTubeChannel,
  useYouTubeChannel, 
  getRelativeTime, 
  formatViewCount,
  saveYouTubeConfig,
  loadYouTubeConfig,
  extractChannelId
} from '../../lib/youtube';

// ─────────────────────────────────────────────────────────────────────────────
// Video Card Component
// ─────────────────────────────────────────────────────────────────────────────

interface VideoCardProps {
  video: YouTubeVideo;
  onPlay: (video: YouTubeVideo) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPlay(video)}
      className="rounded-xl overflow-hidden cursor-pointer group"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video">
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center">
            <Play size={28} className="text-white ml-1" fill="white" />
          </div>
        </div>
        {video.duration && (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/80 text-white text-xs rounded">
            {video.duration}
          </span>
        )}
      </div>
      
      {/* Info */}
      <div className="p-3">
        <h3 className="text-white font-medium text-sm line-clamp-2 mb-2">
          {video.title}
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {video.viewCount !== undefined && (
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {formatViewCount(video.viewCount)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {getRelativeTime(video.publishedAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Video Player Modal
// ─────────────────────────────────────────────────────────────────────────────

interface VideoPlayerProps {
  video: YouTubeVideo;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-4xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
        >
          <X size={24} className="text-white" />
        </button>
        
        {/* Video */}
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
        
        {/* Title */}
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <h2 className="text-white font-semibold text-lg">{video.title}</h2>
          <p className="text-gray-400 text-sm mt-2 line-clamp-3">{video.description}</p>
          <a 
            href={video.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-orange-400 text-sm hover:underline"
          >
            <ExternalLink size={14} />
            유튜브에서 보기
          </a>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Settings Modal
// ─────────────────────────────────────────────────────────────────────────────

interface SettingsModalProps {
  onClose: () => void;
  onSave: (apiKey: string, channelId: string) => void;
  currentApiKey?: string;
  currentChannelId?: string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  onClose, 
  onSave, 
  currentApiKey = '',
  currentChannelId = ''
}) => {
  const [apiKey, setApiKey] = useState(currentApiKey);
  const [channelInput, setChannelInput] = useState(currentChannelId);
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!apiKey.trim()) {
      setError('API 키를 입력해주세요');
      return;
    }
    
    // Extract channel ID if URL is provided
    let channelId = channelInput.trim();
    if (channelInput.includes('youtube.com')) {
      const extracted = extractChannelId(channelInput);
      if (extracted) channelId = extracted;
    }
    
    if (!channelId) {
      setError('채널 ID를 입력해주세요');
      return;
    }
    
    onSave(apiKey.trim(), channelId);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#1A1A2E' }}
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Youtube size={24} className="text-red-500" />
          유튜브 채널 연동
        </h2>
        
        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              YouTube API 키
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIza..."
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              <a 
                href="https://console.cloud.google.com/apis/credentials" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-400 hover:underline"
              >
                Google Cloud Console
              </a>에서 API 키 생성
            </p>
          </div>
          
          {/* Channel ID */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              채널 ID 또는 URL
            </label>
            <input
              type="text"
              value={channelInput}
              onChange={e => setChannelInput(e.target.value)}
              placeholder="UCxxxx... 또는 youtube.com/channel/..."
              className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
            />
          </div>
          
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
        
        {/* Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 p-3 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 p-3 rounded-xl bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} />
            저장
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const YouTubeView: React.FC = () => {
  const [config, setConfig] = useState(loadYouTubeConfig());
  const [showSettings, setShowSettings] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { channel, videos, loading, error, refetch } = useYouTubeChannel(config);
  
  const handleSaveConfig = (apiKey: string, channelId: string) => {
    const newConfig = { apiKey, channelId, maxResults: 12 };
    saveYouTubeConfig(newConfig);
    setConfig(newConfig);
    setShowSettings(false);
  };
  
  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // No config state
  if (!config?.apiKey || !config?.channelId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Youtube size={24} className="text-red-500" />
            영상
          </h2>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 rounded-2xl text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(255,107,53,0.1) 0%, rgba(247,147,30,0.05) 100%)',
            border: '1px solid rgba(255,107,53,0.2)',
          }}
        >
          <Youtube size={48} className="text-red-500 mx-auto mb-4" />
          <h3 className="text-white font-semibold text-lg mb-2">유튜브 채널 연동</h3>
          <p className="text-gray-400 text-sm mb-6">
            온리쌤 유튜브 채널을 연동하면<br/>
            최신 영상을 자동으로 불러옵니다.
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="px-6 py-3 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2 mx-auto"
          >
            <Settings size={18} />
            채널 연동하기
          </button>
        </motion.div>
        
        <AnimatePresence>
          {showSettings && (
            <SettingsModal
              onClose={() => setShowSettings(false)}
              onSave={handleSaveConfig}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Youtube size={24} className="text-red-500" />
          영상
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <RefreshCw size={18} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Settings size={18} className="text-gray-400" />
          </button>
        </div>
      </div>
      
      {/* Channel Info */}
      {channel && (
        <a 
          href={channel.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        >
          <img 
            src={channel.thumbnail} 
            alt={channel.title}
            className="w-12 h-12 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">{channel.title}</h3>
            <p className="text-gray-400 text-sm">
              구독자 {formatViewCount(channel.subscriberCount || 0)} • 영상 {channel.videoCount}개
            </p>
          </div>
          <ExternalLink size={16} className="text-gray-500" />
        </a>
      )}
      
      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="영상 검색..."
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-orange-500 focus:outline-none"
        />
      </div>
      
      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      
      {/* Loading */}
      {loading && !videos.length && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl overflow-hidden animate-pulse">
              <div className="aspect-video bg-white/10" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-white/10 rounded w-3/4" />
                <div className="h-3 bg-white/10 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Videos Grid */}
      {!loading && filteredVideos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredVideos.map(video => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onPlay={setSelectedVideo}
            />
          ))}
        </div>
      )}
      
      {/* Empty State */}
      {!loading && !error && filteredVideos.length === 0 && videos.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          검색 결과가 없습니다.
        </div>
      )}
      
      {/* Video Player Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <VideoPlayer 
            video={selectedVideo} 
            onClose={() => setSelectedVideo(null)}
          />
        )}
      </AnimatePresence>
      
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
            onSave={handleSaveConfig}
            currentApiKey={config?.apiKey}
            currentChannelId={config?.channelId}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default YouTubeView;
