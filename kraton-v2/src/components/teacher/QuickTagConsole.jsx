/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📝 KRATON Teacher Console - Quick Tag System
 * 관계의 질(Quality of Relation)을 즉시 입력하는 인터페이스
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// CONSTANTS
// ============================================

// 감정 상태 (s_index 영향)
const SENTIMENT_TAGS = [
  { id: 'satisfied', icon: '😊', label: '만족', color: 'emerald', delta: +0.05 },
  { id: 'neutral', icon: '😐', label: '보통', color: 'gray', delta: 0 },
  { id: 'anxious', icon: '😟', label: '불안', color: 'yellow', delta: -0.05 },
  { id: 'angry', icon: '😡', label: '불만', color: 'red', delta: -0.10 },
];

// 유대 강도 (Bond)
const BOND_TAGS = [
  { id: 'strong', icon: '🔗', label: '강함', color: 'purple' },
  { id: 'normal', icon: '⛓️', label: '보통', color: 'gray' },
  { id: 'cold', icon: '🧊', label: '차가움', color: 'blue' },
];

// 이슈 트리거
const ISSUE_TAGS = [
  { id: 'academic', icon: '📚', label: '학업', color: 'blue' },
  { id: 'cost', icon: '💰', label: '비용', color: 'yellow' },
  { id: 'career', icon: '🎯', label: '진로', color: 'purple' },
  { id: 'attitude', icon: '💭', label: '태도', color: 'orange' },
  { id: 'schedule', icon: '📅', label: '일정', color: 'cyan' },
  { id: 'other', icon: '📌', label: '기타', color: 'gray' },
];

// 상호작용 유형
const INTERACTION_TYPES = [
  { id: 'consultation', icon: '💬', label: '상담' },
  { id: 'class', icon: '📖', label: '수업' },
  { id: 'call', icon: '📞', label: '전화' },
  { id: 'message', icon: '💌', label: '메시지' },
  { id: 'meeting', icon: '🤝', label: '미팅' },
];

// Mock 학생/학부모 데이터
const MOCK_RELATIONS = [
  { id: '1', name: '김철수', type: 'student', avatar: '👦', grade: '중2', sIndex: 0.72 },
  { id: '2', name: '이영희', type: 'student', avatar: '👧', grade: '중3', sIndex: 0.85 },
  { id: '3', name: '박민수', type: 'student', avatar: '👦', grade: '고1', sIndex: 0.45 },
  { id: '4', name: '최수진', type: 'student', avatar: '👧', grade: '중1', sIndex: 0.68 },
  { id: '5', name: '김철수 어머니', type: 'parent', avatar: '👩', relation: '김철수', sIndex: 0.65 },
  { id: '6', name: '이영희 아버지', type: 'parent', avatar: '👨', relation: '이영희', sIndex: 0.78 },
  { id: '7', name: '박민수 어머니', type: 'parent', avatar: '👩', relation: '박민수', sIndex: 0.35 },
];

// ============================================
// SUB COMPONENTS
// ============================================

// 태그 버튼
const TagButton = memo(function TagButton({ tag, selected, onClick, size = 'normal' }) {
  const colorClasses = {
    emerald: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    gray: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
    yellow: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
    red: 'bg-red-500/20 border-red-500/50 text-red-400',
    purple: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
    blue: 'bg-blue-500/20 border-blue-500/50 text-blue-400',
    orange: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
    cyan: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
  };

  const sizeClasses = size === 'large' 
    ? 'w-20 h-20 text-3xl' 
    : 'px-4 py-2 text-xl';

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`
        ${sizeClasses} rounded-xl border-2 flex flex-col items-center justify-center gap-1
        transition-all duration-200
        ${selected 
          ? colorClasses[tag.color] + ' ring-2 ring-offset-2 ring-offset-gray-900 ring-' + tag.color + '-500' 
          : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
        }
      `}
    >
      <span>{tag.icon}</span>
      {size !== 'large' && <span className="text-xs">{tag.label}</span>}
    </motion.button>
  );
});

// 관계 대상 선택 카드
const RelationCard = memo(function RelationCard({ relation, selected, onClick }) {
  const sIndexColor = relation.sIndex >= 0.7 
    ? 'text-emerald-400' 
    : relation.sIndex >= 0.5 
    ? 'text-yellow-400' 
    : 'text-red-400';

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        p-3 rounded-xl border-2 text-left transition-all duration-200
        ${selected 
          ? 'bg-cyan-500/20 border-cyan-500/50' 
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{relation.avatar}</span>
        <div className="flex-1">
          <p className="text-white font-medium">{relation.name}</p>
          <p className="text-gray-500 text-xs">
            {relation.type === 'student' ? relation.grade : relation.relation}
          </p>
        </div>
        <div className="text-right">
          <p className={`font-mono text-sm ${sIndexColor}`}>
            {(relation.sIndex * 100).toFixed(0)}%
          </p>
          <p className="text-gray-600 text-xs">s-index</p>
        </div>
      </div>
    </motion.button>
  );
});

// Voice-to-Insight 컴포넌트
const VoiceInput = memo(function VoiceInput({ onTranscript, onExtractedTags }) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [processing, setProcessing] = useState(false);
  const recognitionRef = useRef(null);

  // Mock AI 분석
  const analyzeTranscript = useCallback((text) => {
    setProcessing(true);
    
    // 키워드 기반 Mock AI 분석
    setTimeout(() => {
      const extractedTags = {
        sentiment: null,
        bond: null,
        issues: [],
        aiNotes: [],
      };

      // 감정 분석
      if (text.includes('걱정') || text.includes('불안') || text.includes('힘들')) {
        extractedTags.sentiment = 'anxious';
        extractedTags.aiNotes.push('불안 감정 감지');
      } else if (text.includes('불만') || text.includes('화') || text.includes('짜증')) {
        extractedTags.sentiment = 'angry';
        extractedTags.aiNotes.push('불만 감정 감지');
      } else if (text.includes('좋') || text.includes('만족') || text.includes('감사')) {
        extractedTags.sentiment = 'satisfied';
        extractedTags.aiNotes.push('만족 감정 감지');
      }

      // 이슈 분석
      if (text.includes('수강료') || text.includes('비용') || text.includes('돈')) {
        extractedTags.issues.push('cost');
        extractedTags.aiNotes.push('💰 Capital_Pressure 노드 활성화');
      }
      if (text.includes('성적') || text.includes('점수') || text.includes('시험')) {
        extractedTags.issues.push('academic');
        extractedTags.aiNotes.push('📚 Academic_Concern 노드 활성화');
      }
      if (text.includes('진로') || text.includes('대학') || text.includes('취업')) {
        extractedTags.issues.push('career');
        extractedTags.aiNotes.push('🎯 Career_Planning 노드 활성화');
      }

      onExtractedTags(extractedTags);
      setProcessing(false);
    }, 1500);
  }, [onExtractedTags]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (transcript) {
        analyzeTranscript(transcript);
        onTranscript(transcript);
      }
    } else {
      // Mock voice recognition (실제로는 Web Speech API 사용)
      setIsListening(true);
      setTranscript('');
      
      // 데모용 Mock
      setTimeout(() => {
        const mockTranscripts = [
          '철수 어머니가 오늘 수강료 걱정을 좀 하셨어요',
          '영희가 최근 성적이 많이 올라서 기뻐하고 있어요',
          '민수 학부모님이 진로 상담을 요청하셨습니다',
        ];
        const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
        setTranscript(randomTranscript);
        setIsListening(false);
        analyzeTranscript(randomTranscript);
        onTranscript(randomTranscript);
      }, 2000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleListening}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isListening 
              ? 'bg-red-500 animate-pulse' 
              : 'bg-gradient-to-br from-cyan-500 to-purple-500'
            }
          `}
        >
          <span className="text-2xl">{isListening ? '⏹️' : '🎙️'}</span>
        </motion.button>
        <div className="flex-1">
          <p className="text-white font-medium">
            {isListening ? '듣고 있습니다...' : processing ? 'AI 분석 중...' : 'Voice-to-Insight'}
          </p>
          <p className="text-gray-500 text-sm">
            음성으로 상담 내용을 기록하세요
          </p>
        </div>
      </div>

      {transcript && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 bg-gray-800/50 rounded-xl border border-gray-700"
        >
          <p className="text-gray-400 text-sm mb-1">📝 인식된 내용:</p>
          <p className="text-white">{transcript}</p>
        </motion.div>
      )}

      {processing && (
        <div className="flex items-center gap-2 text-cyan-400">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            ⚙️
          </motion.span>
          <span className="text-sm">AI가 관계 노드를 분석하고 있습니다...</span>
        </div>
      )}
    </div>
  );
});

// AI 추출 태그 표시
const AIExtractedTags = memo(function AIExtractedTags({ tags, onApply }) {
  if (!tags || (!tags.sentiment && tags.issues.length === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10 rounded-xl border border-purple-500/30"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-medium flex items-center gap-2">
          <span className="text-purple-400">🤖</span>
          AI 분석 결과
        </h4>
        <button
          onClick={onApply}
          className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-sm hover:bg-purple-500/30 transition-colors"
        >
          적용하기
        </button>
      </div>

      <div className="space-y-2">
        {tags.aiNotes.map((note, idx) => (
          <p key={idx} className="text-cyan-400 text-sm flex items-center gap-2">
            <span>→</span> {note}
          </p>
        ))}
      </div>
    </motion.div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function QuickTagConsole() {
  // States
  const [selectedRelation, setSelectedRelation] = useState(null);
  const [interactionType, setInteractionType] = useState(null);
  const [sentimentTag, setSentimentTag] = useState(null);
  const [bondTag, setBondTag] = useState(null);
  const [issueTags, setIssueTags] = useState([]);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [aiExtractedTags, setAIExtractedTags] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // 필터링된 관계 목록
  const filteredRelations = MOCK_RELATIONS.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // AI 태그 적용
  const applyAITags = useCallback(() => {
    if (!aiExtractedTags) return;
    
    if (aiExtractedTags.sentiment) {
      setSentimentTag(aiExtractedTags.sentiment);
    }
    if (aiExtractedTags.issues.length > 0) {
      setIssueTags(aiExtractedTags.issues);
    }
  }, [aiExtractedTags]);

  // 이슈 태그 토글
  const toggleIssueTag = (tagId) => {
    setIssueTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

  // 제출
  const handleSubmit = async () => {
    if (!selectedRelation || !sentimentTag) {
      alert('대상과 감정 상태를 선택해주세요.');
      return;
    }

    setSubmitting(true);

    // Mock API 호출
    const payload = {
      node_pair_id: selectedRelation.id,
      interaction_type: interactionType,
      sentiment_tag: sentimentTag,
      bond_tag: bondTag,
      issue_trigger: issueTags[0] || null,
      voice_transcript: voiceTranscript,
      ai_extracted_tags: aiExtractedTags,
      content: notes,
      logged_at: new Date().toISOString(),
    };

    // 시뮬레이션: n8n 웹훅으로 전송
    console.log('📤 Sending to n8n:', payload);

    setTimeout(() => {
      // 성공 후 로그 추가
      setRecentLogs(prev => [{
        id: Date.now(),
        relation: selectedRelation.name,
        sentiment: sentimentTag,
        time: '방금',
        delta: SENTIMENT_TAGS.find(t => t.id === sentimentTag)?.delta || 0,
      }, ...prev].slice(0, 5));

      // 초기화
      setSelectedRelation(null);
      setInteractionType(null);
      setSentimentTag(null);
      setBondTag(null);
      setIssueTags([]);
      setVoiceTranscript('');
      setAIExtractedTags(null);
      setNotes('');
      setSubmitting(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">📝</span>
              Quick Tag Console
            </h1>
            <p className="text-gray-400 mt-1">
              관계의 질을 즉시 입력 · Tesla FSD 스타일 객체 분류
            </p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-emerald-400 text-sm">n8n 연결됨</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left: 대상 선택 */}
          <div className="space-y-4">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-cyan-400">1</span>
              대상 선택
            </h3>
            
            <input
              type="text"
              placeholder="이름 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
            />

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filteredRelations.map(relation => (
                <RelationCard
                  key={relation.id}
                  relation={relation}
                  selected={selectedRelation?.id === relation.id}
                  onClick={() => setSelectedRelation(relation)}
                />
              ))}
            </div>

            {/* 상호작용 유형 */}
            {selectedRelation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-2"
              >
                <p className="text-gray-400 text-sm">상호작용 유형</p>
                <div className="flex flex-wrap gap-2">
                  {INTERACTION_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setInteractionType(type.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                        interactionType === type.id
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                          : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <span>{type.icon}</span>
                      <span>{type.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* Middle: 태그 입력 */}
          <div className="space-y-6">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-cyan-400">2</span>
              상태 태깅
            </h3>

            {/* 감정 상태 */}
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">감정 상태 (s_index)</p>
              <div className="grid grid-cols-4 gap-2">
                {SENTIMENT_TAGS.map(tag => (
                  <TagButton
                    key={tag.id}
                    tag={tag}
                    size="large"
                    selected={sentimentTag === tag.id}
                    onClick={() => setSentimentTag(tag.id)}
                  />
                ))}
              </div>
              {sentimentTag && (
                <p className="text-xs text-gray-500">
                  s_index: {SENTIMENT_TAGS.find(t => t.id === sentimentTag)?.delta > 0 ? '+' : ''}
                  {(SENTIMENT_TAGS.find(t => t.id === sentimentTag)?.delta * 100).toFixed(0)}%
                </p>
              )}
            </div>

            {/* 유대 강도 */}
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">유대 강도 (Bond)</p>
              <div className="flex gap-2">
                {BOND_TAGS.map(tag => (
                  <TagButton
                    key={tag.id}
                    tag={tag}
                    selected={bondTag === tag.id}
                    onClick={() => setBondTag(tag.id)}
                  />
                ))}
              </div>
            </div>

            {/* 이슈 트리거 */}
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">이슈 트리거 (복수 선택 가능)</p>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TAGS.map(tag => (
                  <TagButton
                    key={tag.id}
                    tag={tag}
                    selected={issueTags.includes(tag.id)}
                    onClick={() => toggleIssueTag(tag.id)}
                  />
                ))}
              </div>
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">메모 (선택)</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="추가 메모..."
                className="w-full h-20 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Right: Voice & Submit */}
          <div className="space-y-6">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <span className="text-cyan-400">3</span>
              Voice-to-Insight
            </h3>

            <VoiceInput
              onTranscript={setVoiceTranscript}
              onExtractedTags={setAIExtractedTags}
            />

            <AIExtractedTags tags={aiExtractedTags} onApply={applyAITags} />

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={!selectedRelation || !sentimentTag || submitting}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg
                flex items-center justify-center gap-2
                transition-all duration-300
                ${selectedRelation && sentimentTag
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }
              `}
            >
              {submitting ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    ⚙️
                  </motion.span>
                  전송 중...
                </>
              ) : (
                <>
                  <span>📤</span>
                  관계 데이터 전송
                </>
              )}
            </motion.button>

            {/* Recent Logs */}
            {recentLogs.length > 0 && (
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">최근 기록</p>
                <div className="space-y-2">
                  {recentLogs.map(log => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50 flex items-center justify-between"
                    >
                      <div>
                        <span className="text-white text-sm">{log.relation}</span>
                        <span className="text-gray-500 text-xs ml-2">{log.time}</span>
                      </div>
                      <span className={`text-sm ${
                        log.delta > 0 ? 'text-emerald-400' : 
                        log.delta < 0 ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {log.delta > 0 ? '+' : ''}{(log.delta * 100).toFixed(0)}%
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom: 현재 선택 요약 */}
        <AnimatePresence>
          {selectedRelation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{selectedRelation.avatar}</span>
                  <div>
                    <p className="text-white font-medium">{selectedRelation.name}</p>
                    <p className="text-gray-500 text-sm">
                      {interactionType && `${INTERACTION_TYPES.find(t => t.id === interactionType)?.label} · `}
                      {sentimentTag && `${SENTIMENT_TAGS.find(t => t.id === sentimentTag)?.icon} · `}
                      {bondTag && `${BOND_TAGS.find(t => t.id === bondTag)?.icon} · `}
                      {issueTags.map(t => ISSUE_TAGS.find(i => i.id === t)?.icon).join(' ')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">예상 s_index 변화</p>
                  <p className={`text-xl font-mono ${
                    (SENTIMENT_TAGS.find(t => t.id === sentimentTag)?.delta || 0) > 0 
                      ? 'text-emerald-400' 
                      : (SENTIMENT_TAGS.find(t => t.id === sentimentTag)?.delta || 0) < 0
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}>
                    {(SENTIMENT_TAGS.find(t => t.id === sentimentTag)?.delta || 0) > 0 ? '+' : ''}
                    {((SENTIMENT_TAGS.find(t => t.id === sentimentTag)?.delta || 0) * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
