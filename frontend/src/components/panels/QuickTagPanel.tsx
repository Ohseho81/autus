/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚡ Quick Tag Panel - Optimus Console
 * 현장 데이터 즉시 입력 (Vector Tagging)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { quickTagApi } from '../../api/autus';

interface QuickTagPanelProps {
  orgId: string;
  taggerId: string;
  onTagCreated?: (tag: any) => void;
}

interface TagStats {
  total_today: number;
  positive: number;
  negative: number;
  neutral: number;
}

interface RecentTag {
  id: string;
  target_id: string;
  target_type: string;
  vectorized_data: {
    emotion_delta: number;
    bond_strength: string;
    issue_triggers?: string[];
  };
  created_at: string;
}

const EMOTION_PRESETS = [
  { label: '😊 매우 좋음', delta: 15, color: 'bg-green-500' },
  { label: '🙂 좋음', delta: 8, color: 'bg-green-400' },
  { label: '😐 보통', delta: 0, color: 'bg-slate-500' },
  { label: '😕 별로', delta: -8, color: 'bg-yellow-500' },
  { label: '😠 나쁨', delta: -15, color: 'bg-red-500' },
];

const BOND_OPTIONS = [
  { label: '💪 강함', value: 'strong', color: 'text-green-400' },
  { label: '😐 보통', value: 'normal', color: 'text-slate-400' },
  { label: '❄️ 냉담', value: 'cold', color: 'text-blue-400' },
];

const ISSUE_TAGS = [
  '성적', '출결', '태도', '비용', '시간', '관계', '건강', '가정', '진로', '기타',
];

export default function QuickTagPanel({ orgId, taggerId, onTagCreated }: QuickTagPanelProps) {
  const [targetId, setTargetId] = useState('');
  const [targetType, setTargetType] = useState<'student' | 'parent' | 'teacher'>('student');
  const [emotionDelta, setEmotionDelta] = useState(0);
  const [bondStrength, setBondStrength] = useState<'strong' | 'normal' | 'cold'>('normal');
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [voiceInsight, setVoiceInsight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentTags, setRecentTags] = useState<RecentTag[]>([]);
  const [stats, setStats] = useState<TagStats | null>(null);

  // 최근 태그 로드
  const loadRecentTags = useCallback(async () => {
    try {
      const result = await quickTagApi.getRecent(orgId, 10);
      if (result.tags) {
        setRecentTags(result.tags);
        setStats(result.stats);
      }
    } catch (error) {
      console.error('Failed to load recent tags:', error);
    }
  }, [orgId]);

  useEffect(() => {
    loadRecentTags();
  }, [loadRecentTags]);

  // 태그 제출
  const handleSubmit = async () => {
    if (!targetId) {
      alert('대상을 선택하세요');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await quickTagApi.create({
        org_id: orgId,
        tagger_id: taggerId,
        target_id: targetId,
        target_type: targetType,
        emotion_delta: emotionDelta,
        bond_strength: bondStrength,
        issue_triggers: selectedIssues,
        voice_insight: voiceInsight,
      });

      if (result.success) {
        // 초기화
        setTargetId('');
        setEmotionDelta(0);
        setBondStrength('normal');
        setSelectedIssues([]);
        setVoiceInsight('');
        
        // 새로고침
        loadRecentTags();
        
        // 콜백
        onTagCreated?.(result);

        // 위험 감지 알림
        if (result.risk_triggered) {
          alert('⚠️ 위험 신호 감지! Risk Queue에 추가되었습니다.');
        }
      }
    } catch (error) {
      console.error('Failed to create tag:', error);
      alert('태그 등록 실패');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleIssue = (issue: string) => {
    setSelectedIssues(prev =>
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    );
  };

  return (
    <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          ⚡ Quick Tag
          <span className="text-sm font-normal text-slate-400">현장 데이터 입력</span>
        </h2>
        {stats && (
          <div className="flex items-center gap-4 text-sm">
            <span className="text-slate-400">오늘: {stats.total_today}</span>
            <span className="text-green-400">+{stats.positive}</span>
            <span className="text-red-400">-{stats.negative}</span>
          </div>
        )}
      </div>

      {/* Target Selection */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm text-slate-400 mb-2">대상 ID</label>
          <input
            type="text"
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            placeholder="학생/학부모/선생님 ID"
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">대상 유형</label>
          <select
            value={targetType}
            onChange={e => setTargetType(e.target.value as any)}
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
          >
            <option value="student">👨‍🎓 학생</option>
            <option value="parent">👨‍👩‍👦 학부모</option>
            <option value="teacher">👩‍🏫 선생님</option>
          </select>
        </div>
      </div>

      {/* Emotion Slider */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          감정 변화 <span className={emotionDelta > 0 ? 'text-green-400' : emotionDelta < 0 ? 'text-red-400' : 'text-slate-400'}>
            ({emotionDelta > 0 ? '+' : ''}{emotionDelta})
          </span>
        </label>
        <div className="flex gap-2 mb-3">
          {EMOTION_PRESETS.map(preset => (
            <button
              key={preset.delta}
              onClick={() => setEmotionDelta(preset.delta)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                emotionDelta === preset.delta
                  ? `${preset.color} text-white`
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <input
          type="range"
          min="-20"
          max="20"
          value={emotionDelta}
          onChange={e => setEmotionDelta(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Bond Strength */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">유대 관계</label>
        <div className="flex gap-2">
          {BOND_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setBondStrength(option.value as any)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                bondStrength === option.value
                  ? 'bg-slate-600 ring-2 ring-blue-500'
                  : 'bg-slate-700 hover:bg-slate-600'
              } ${option.color}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Issue Tags */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">이슈 태그</label>
        <div className="flex flex-wrap gap-2">
          {ISSUE_TAGS.map(issue => (
            <button
              key={issue}
              onClick={() => toggleIssue(issue)}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedIssues.includes(issue)
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {issue}
            </button>
          ))}
        </div>
      </div>

      {/* Voice Insight */}
      <div className="mb-6">
        <label className="block text-sm text-slate-400 mb-2">
          음성 메모 / AI 분석용 텍스트
        </label>
        <textarea
          value={voiceInsight}
          onChange={e => setVoiceInsight(e.target.value)}
          placeholder="상담 내용이나 관찰 사항을 입력하세요..."
          rows={3}
          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !targetId}
        className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
          isSubmitting || !targetId
            ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600'
        }`}
      >
        {isSubmitting ? '등록 중...' : '⚡ Quick Tag 등록'}
      </button>

      {/* Recent Tags */}
      {recentTags.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <h3 className="text-sm font-medium text-slate-400 mb-3">최근 태그</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentTags.map(tag => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className={
                    tag.vectorized_data.emotion_delta > 0 ? 'text-green-400' :
                    tag.vectorized_data.emotion_delta < 0 ? 'text-red-400' : 'text-slate-400'
                  }>
                    {tag.vectorized_data.emotion_delta > 0 ? '+' : ''}{tag.vectorized_data.emotion_delta}
                  </span>
                  <span className="text-slate-300">{tag.target_id}</span>
                  <span className="text-slate-500">({tag.target_type})</span>
                </div>
                <span className="text-slate-500">
                  {new Date(tag.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
