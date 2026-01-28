/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📖 GrowthStory - 성장 스토리 (Chapter 형식)
 * 
 * "내 인생의 주인공 = 영웅 서사"
 * - 학생의 성장을 이야기로 시각화
 * - Chapter 형식으로 과거→현재→미래 표현
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

export interface StoryChapter {
  chapter: number;
  title: string;
  description: string;
  date: string;          // "9월", "10월" 등
  mood?: 'struggle' | 'growth' | 'victory' | 'future';
  isCurrent: boolean;
  isFuture?: boolean;
}

interface GrowthStoryProps {
  studentName: string;
  chapters: StoryChapter[];
  nextChapter?: {
    title: string;
    hint: string;
  };
}

export default function GrowthStory({
  studentName,
  chapters,
  nextChapter,
}: GrowthStoryProps) {
  const getMoodEmoji = (mood?: string) => {
    switch (mood) {
      case 'struggle': return '😰';
      case 'growth': return '💪';
      case 'victory': return '🎉';
      case 'future': return '🚀';
      default: return '📖';
    }
  };

  const getMoodColor = (mood?: string) => {
    switch (mood) {
      case 'struggle': return 'border-orange-500';
      case 'growth': return 'border-green-500';
      case 'victory': return 'border-yellow-500';
      case 'future': return 'border-cyan-500';
      default: return 'border-slate-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <h3 className="text-lg font-bold flex items-center gap-2">
        <span>📖</span>
        <span>{studentName}의 성장 이야기</span>
      </h3>

      {/* 스토리 타임라인 */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="space-y-0">
          {chapters.map((chapter, idx) => (
            <div 
              key={chapter.chapter}
              className={`
                relative pl-8 pb-4 border-l-2 
                ${chapter.isCurrent ? 'border-purple-500' : getMoodColor(chapter.mood)}
                ${idx === chapters.length - 1 && !nextChapter ? 'border-l-0' : ''}
              `}
            >
              {/* 노드 */}
              <div className={`
                absolute left-0 top-0 w-4 h-4 rounded-full -translate-x-1/2
                ${chapter.isCurrent 
                  ? 'bg-purple-500 ring-4 ring-purple-500/30' 
                  : chapter.mood === 'victory'
                    ? 'bg-yellow-500'
                    : chapter.mood === 'growth'
                      ? 'bg-green-500'
                      : 'bg-slate-600'
                }
              `}>
                {chapter.isCurrent && (
                  <span className="absolute inset-0 rounded-full bg-purple-500 animate-ping opacity-50" />
                )}
              </div>

              {/* 챕터 헤더 */}
              <div className="text-xs text-slate-500 mb-1 flex items-center gap-2">
                <span>Chapter {chapter.chapter}</span>
                <span>•</span>
                <span>{chapter.date}</span>
                {chapter.isCurrent && (
                  <span className="text-purple-400 bg-purple-500/20 px-1.5 py-0.5 rounded text-xs">
                    지금
                  </span>
                )}
              </div>

              {/* 챕터 제목 */}
              <div className={`font-medium mb-1 flex items-center gap-2 ${
                chapter.isCurrent ? 'text-purple-300' : 'text-slate-300'
              }`}>
                <span>{getMoodEmoji(chapter.mood)}</span>
                <span>{chapter.title}</span>
              </div>

              {/* 챕터 설명 */}
              <div className="text-sm text-slate-400 italic">
                "{chapter.description}"
              </div>
            </div>
          ))}

          {/* 다음 챕터 (미래) */}
          {nextChapter && (
            <div className="relative pl-8 border-l-2 border-dashed border-cyan-500/50">
              <div className="absolute left-0 top-0 w-4 h-4 rounded-full -translate-x-1/2 bg-cyan-500/50 border-2 border-dashed border-cyan-400" />
              
              <div className="text-xs text-slate-500 mb-1">다음 Chapter</div>
              <div className="text-cyan-300 font-medium flex items-center gap-2">
                <span>🚀</span>
                <span>{nextChapter.title}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">{nextChapter.hint}</div>
            </div>
          )}
        </div>
      </div>

      {/* 스토리 요약 */}
      <div className="p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/30 text-center">
        <div className="text-sm text-purple-300">
          ✨ {studentName}의 이야기는 계속됩니다...
        </div>
      </div>
    </div>
  );
}
