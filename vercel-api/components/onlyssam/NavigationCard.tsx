'use client';

import React, { useState } from 'react';

interface GoalData {
  type: 'DESTINATION' | 'NEXT_MOVE';
  text: string;
  decided_by_role: string;
  effective_from: string;
}

interface NavigationCardProps {
  student_id: string;
  student_name: string;
  destination?: GoalData;
  nextMove?: GoalData;
  onUpdate?: (type: 'DESTINATION' | 'NEXT_MOVE', newValue: string) => Promise<void>;
  isEditable?: boolean;
}

export function NavigationCard({
  student_id,
  student_name,
  destination,
  nextMove,
  onUpdate,
  isEditable = false
}: NavigationCardProps): JSX.Element {
  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [isEditingNextMove, setIsEditingNextMove] = useState(false);
  const [destinationInput, setDestinationInput] = useState(destination?.text || '');
  const [nextMoveInput, setNextMoveInput] = useState(nextMove?.text || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveDestination = async (): Promise<void> => {
    if (!onUpdate || !destinationInput.trim()) return;
    
    setIsLoading(true);
    try {
      await onUpdate('DESTINATION', destinationInput);
      setIsEditingDestination(false);
    } catch (error) {
      console.error('Failed to update destination:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNextMove = async (): Promise<void> => {
    if (!onUpdate || !nextMoveInput.trim()) return;
    
    setIsLoading(true);
    try {
      await onUpdate('NEXT_MOVE', nextMoveInput);
      setIsEditingNextMove(false);
    } catch (error) {
      console.error('Failed to update next move:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-lg border border-slate-700">
      <h2 className="text-2xl font-bold text-white mb-6">
        {student_name}의 목표 나침반
      </h2>

      {/* Destination Card */}
      <div className="mb-6 p-4 bg-slate-700 rounded-lg border border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-blue-300">목적지 (Destination)</h3>
          {destination && (
            <span className="text-xs text-slate-400">
              {destination.decided_by_role}가 설정
            </span>
          )}
        </div>

        {isEditingDestination ? (
          <div className="space-y-3">
            <textarea
              value={destinationInput}
              onChange={(e) => setDestinationInput(e.target.value)}
              placeholder="예: 서울대학교 컴퓨터공학부 입학"
              className="w-full p-3 bg-slate-600 text-white rounded border border-slate-500 placeholder-slate-400 focus:outline-none focus:border-blue-400"
              rows={3}
              disabled={isLoading}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditingDestination(false);
                  setDestinationInput(destination?.text || '');
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveDestination}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50"
              >
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-white text-base mb-3">
              {destination?.text || '아직 목적지가 설정되지 않았습니다'}
            </p>
            {isEditable && (
              <button
                onClick={() => setIsEditingDestination(true)}
                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                수정
              </button>
            )}
          </div>
        )}
      </div>

      {/* Next Move Card */}
      <div className="p-4 bg-slate-700 rounded-lg border border-slate-600">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-amber-300">다음 움직임 (Next Move)</h3>
          {nextMove && (
            <span className="text-xs text-slate-400">
              {nextMove.decided_by_role}가 설정
            </span>
          )}
        </div>

        {isEditingNextMove ? (
          <div className="space-y-3">
            <textarea
              value={nextMoveInput}
              onChange={(e) => setNextMoveInput(e.target.value)}
              placeholder="예: 이번 달 수학 성적 85점 이상"
              className="w-full p-3 bg-slate-600 text-white rounded border border-slate-500 placeholder-slate-400 focus:outline-none focus:border-amber-400"
              rows={3}
              disabled={isLoading}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setIsEditingNextMove(false);
                  setNextMoveInput(nextMove?.text || '');
                }}
                disabled={isLoading}
                className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveNextMove}
                disabled={isLoading}
                className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-500 disabled:opacity-50"
              >
                {isLoading ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-white text-base mb-3">
              {nextMove?.text || '아직 다음 움직임이 설정되지 않았습니다'}
            </p>
            {isEditable && (
              <button
                onClick={() => setIsEditingNextMove(true)}
                className="text-sm px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-500"
              >
                수정
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-slate-600 text-xs text-slate-400">
        <p>학생 ID: {student_id}</p>
      </div>
    </div>
  );
}
