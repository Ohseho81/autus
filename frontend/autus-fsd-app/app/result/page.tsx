'use client';

import { useState, useEffect } from 'react';

const SUPABASE_URL = 'https://pphzvnaedmzcvpxjulti.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHp2bmFlZG16Y3ZweGp1bHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTI0NjUsImV4cCI6MjA4NDMyODQ2NX0.kj7hRwujBXRmEwA4B9C8Hml9bbBkEQfGaZ3XYi-GnqQ';

interface ResultLog {
  id: string;
  coach_keyword: string;
  training_stage: string;
  coach_memo: string;
  video_url: string | null;
  report_url: string | null;
  student_name?: string;
  class_name?: string;
  created_at?: string;
}

const STAGES = [
  { key: 'motivation', emoji: '🔥', label: '동기부여', color: 'bg-red-500', lightColor: 'bg-red-50', textColor: 'text-red-700' },
  { key: 'basic', emoji: '📚', label: '기초', color: 'bg-orange-500', lightColor: 'bg-orange-50', textColor: 'text-orange-700' },
  { key: 'repetition', emoji: '🔄', label: '반복', color: 'bg-yellow-500', lightColor: 'bg-yellow-50', textColor: 'text-yellow-700' },
  { key: 'application', emoji: '💡', label: '응용', color: 'bg-green-500', lightColor: 'bg-green-50', textColor: 'text-green-700' },
  { key: 'mastery', emoji: '⭐', label: '자율', color: 'bg-blue-500', lightColor: 'bg-blue-50', textColor: 'text-blue-700' },
];

export default function ResultPage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<ResultLog | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setError('유효하지 않은 링크입니다.');
      setLoading(false);
      return;
    }
    fetchResult(token);
  }, []);

  async function fetchResult(token: string) {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/result_logs?result_token=eq.${token}&select=*`,
        {
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
          },
        }
      );
      if (!res.ok) throw new Error('조회 실패');
      const data = await res.json();
      if (!data || data.length === 0) throw new Error('결과를 찾을 수 없습니다.');
      setResult(data[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : '결과를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }

  const currentStageIndex = result
    ? STAGES.findIndex((s) => s.key === result.training_stage)
    : -1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gray-300 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-sm w-full text-center">
          <div className="text-4xl mb-3">😔</div>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!result) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-sm mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h1 className="text-lg font-bold text-gray-900 mb-1">수업 결과</h1>
          {result.student_name && (
            <p className="text-sm text-gray-500">
              {result.student_name} {result.class_name && `| ${result.class_name}`}
            </p>
          )}
          {result.created_at && (
            <p className="text-xs text-gray-400 mt-1">
              {new Date(result.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Coach Keyword */}
        {result.coach_keyword && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">오늘의 키워드</h2>
            <p className="text-2xl font-bold text-gray-900">{result.coach_keyword}</p>
          </div>
        )}

        {/* Training Stage - 5 Step Visualization */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">훈련 단계</h2>
          <div className="flex items-center justify-between mb-3">
            {STAGES.map((stage, idx) => {
              const isCurrent = idx === currentStageIndex;
              const isPast = idx < currentStageIndex;
              return (
                <div key={stage.key} className="flex flex-col items-center flex-1">
                  {/* Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                      isCurrent
                        ? `${stage.color} text-white shadow-lg scale-110`
                        : isPast
                        ? `${stage.lightColor} ${stage.textColor}`
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {stage.emoji}
                  </div>
                  {/* Label */}
                  <span
                    className={`text-[10px] mt-1.5 font-medium ${
                      isCurrent ? stage.textColor : isPast ? 'text-gray-500' : 'text-gray-300'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Progress Bar */}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                currentStageIndex >= 0 ? STAGES[currentStageIndex].color : 'bg-gray-300'
              }`}
              style={{ width: `${((currentStageIndex + 1) / STAGES.length) * 100}%` }}
            />
          </div>
          {currentStageIndex >= 0 && (
            <p className="text-xs text-gray-500 mt-2 text-center">
              현재 <span className={`font-semibold ${STAGES[currentStageIndex].textColor}`}>
                {STAGES[currentStageIndex].label}
              </span> 단계
            </p>
          )}
        </div>

        {/* Coach Memo */}
        {result.coach_memo && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">코치 메모</h2>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{result.coach_memo}</p>
          </div>
        )}

        {/* Links */}
        {(result.video_url || result.report_url) && (
          <div className="space-y-2">
            {result.video_url && (
              <a
                href={result.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-white rounded-2xl shadow-sm p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎬</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">영상 보기</p>
                    <p className="text-xs text-gray-400">수업 영상을 확인하세요</p>
                  </div>
                </div>
              </a>
            )}
            {result.report_url && (
              <a
                href={result.report_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-white rounded-2xl shadow-sm p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">리포트 보기</p>
                    <p className="text-xs text-gray-400">상세 리포트를 확인하세요</p>
                  </div>
                </div>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
