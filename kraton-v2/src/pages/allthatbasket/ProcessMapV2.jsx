/**
 * 🏀 올댓바스켓 프로세스 맵 V2
 *
 * 철학:
 * - 노드 = 사람(역할)
 * - 모션 = 시간(돈, 가치)의 흐름
 * - 노드별로 명확히 구분
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// ============================================
// 노드 정의 (사람/역할)
// ============================================
const ROLE_NODES = [
  {
    id: 'owner',
    name: '원장님',
    emoji: '👔',
    color: '#1e1b4b',
    bgColor: '#312e81',
    description: '의사결정자',
    tasks: ['승인', '인사이트 확인', '피드백 수신'],
  },
  {
    id: 'admin',
    name: '관리자',
    emoji: '💼',
    color: '#1e40af',
    bgColor: '#3b82f6',
    description: '운영 책임자',
    tasks: ['모니터링', '시스템 연결', '보고서 작성', '피드백 발송'],
  },
  {
    id: 'coach',
    name: '코치',
    emoji: '🏀',
    color: '#c2410c',
    bgColor: '#f97316',
    description: '현장 실무자',
    tasks: ['출석 체크', '수업 진행', '학생 피드백', '영상 촬영'],
  },
  {
    id: 'parent',
    name: '학부모',
    emoji: '👨‍👩‍👧',
    color: '#166534',
    bgColor: '#22c55e',
    description: '서비스 수혜자',
    tasks: ['알림 수신', '자녀 현황 확인', '결제'],
  },
];

// ============================================
// 모션 정의 (노드 간 가치/시간 흐름)
// ============================================
const MOTIONS = [
  // 코치 → 관리자
  { from: 'coach', to: 'admin', value: '수업 데이터', time: '실시간', cost: '₩0' },
  { from: 'coach', to: 'admin', value: '출석 보고', time: '즉시', cost: '₩0' },

  // 관리자 → 원장
  { from: 'admin', to: 'owner', value: '일일 보고서', time: '1일', cost: '₩50,000' },
  { from: 'admin', to: 'owner', value: '긴급 사항', time: '즉시', cost: '₩0' },

  // 원장 → 관리자
  { from: 'owner', to: 'admin', value: '승인', time: '즉시', cost: '₩0' },
  { from: 'owner', to: 'admin', value: '지시 사항', time: '즉시', cost: '₩0' },

  // 관리자 → 코치
  { from: 'admin', to: 'coach', value: '업무 배정', time: '1일', cost: '₩10,000' },

  // 코치 → 학부모
  { from: 'coach', to: 'parent', value: '출석 알림', time: '즉시', cost: '₩100' },
  { from: 'coach', to: 'parent', value: '수업 피드백', time: '60분', cost: '₩5,000' },

  // 학부모 → 관리자
  { from: 'parent', to: 'admin', value: '수강료', time: '월 1회', cost: '₩150,000' },

  // 관리자 → 학부모
  { from: 'admin', to: 'parent', value: '성장 리포트', time: '주 1회', cost: '₩3,000' },
];

// ============================================
// 역할 노드 컴포넌트
// ============================================
function RoleNode({ node, x, y, isActive, onClick }) {
  return (
    <g onClick={() => onClick(node)} style={{ cursor: 'pointer' }}>
      {/* 글로우 효과 */}
      {isActive && (
        <circle
          cx={x}
          cy={y}
          r={75}
          fill="none"
          stroke={node.bgColor}
          strokeWidth={3}
          opacity={0.5}
        >
          <animate
            attributeName="r"
            values="70;80;70"
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0.8;0.5"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* 메인 원 */}
      <circle
        cx={x}
        cy={y}
        r={60}
        fill={node.bgColor}
        stroke={isActive ? 'white' : node.color}
        strokeWidth={isActive ? 4 : 2}
      />

      {/* 이모지 */}
      <text
        x={x}
        y={y - 5}
        textAnchor="middle"
        fontSize="32"
      >
        {node.emoji}
      </text>

      {/* 역할명 */}
      <text
        x={x}
        y={y + 30}
        textAnchor="middle"
        fill="white"
        fontSize="14"
        fontWeight="bold"
      >
        {node.name}
      </text>

      {/* 설명 */}
      <text
        x={x}
        y={y + 80}
        textAnchor="middle"
        fill="#94a3b8"
        fontSize="11"
      >
        {node.description}
      </text>
    </g>
  );
}

// ============================================
// 모션 화살표 컴포넌트
// ============================================
function MotionArrow({ motion, fromPos, toPos, isActive, onClick, index }) {
  if (!fromPos || !toPos) return null;

  // 원의 가장자리 계산
  const angle = Math.atan2(toPos.y - fromPos.y, toPos.x - fromPos.x);
  const startX = fromPos.x + Math.cos(angle) * 65;
  const startY = fromPos.y + Math.sin(angle) * 65;
  const endX = toPos.x - Math.cos(angle) * 65;
  const endY = toPos.y - Math.sin(angle) * 65;

  // 곡선 제어점 (여러 모션이 겹치지 않도록)
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const perpX = -(endY - startY) * 0.3 * (index % 2 === 0 ? 1 : -1);
  const perpY = (endX - startX) * 0.3 * (index % 2 === 0 ? 1 : -1);
  const ctrlX = midX + perpX;
  const ctrlY = midY + perpY;

  const pathId = `motion-${motion.from}-${motion.to}-${index}`;
  const motionColor = isActive ? '#fbbf24' : '#64748b';

  return (
    <g onClick={() => onClick(motion)} style={{ cursor: 'pointer' }}>
      {/* 화살표 마커 */}
      <defs>
        <marker
          id={`arrow-${pathId}`}
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 8 3, 0 6" fill={motionColor} />
        </marker>
      </defs>

      {/* 경로 */}
      <path
        d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
        fill="none"
        stroke={motionColor}
        strokeWidth={isActive ? 3 : 1.5}
        strokeDasharray={isActive ? '0' : '6,4'}
        markerEnd={`url(#arrow-${pathId})`}
        opacity={isActive ? 1 : 0.6}
      />

      {/* 애니메이션 점 */}
      {isActive && (
        <circle r="5" fill="#fbbf24">
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            path={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
          />
        </circle>
      )}

      {/* 시간 레이블 */}
      <g transform={`translate(${ctrlX}, ${ctrlY})`}>
        <rect
          x="-25"
          y="-10"
          width="50"
          height="20"
          rx="10"
          fill={isActive ? '#fbbf24' : '#1e293b'}
          stroke={isActive ? '#fbbf24' : '#475569'}
        />
        <text
          textAnchor="middle"
          y="5"
          fontSize="9"
          fontWeight="bold"
          fill={isActive ? '#1e293b' : '#94a3b8'}
        >
          {motion.time}
        </text>
      </g>
    </g>
  );
}

// ============================================
// 모션 상세 패널
// ============================================
function MotionPanel({ motion, onCreateTask }) {
  if (!motion) return null;

  const fromNode = ROLE_NODES.find(n => n.id === motion.from);
  const toNode = ROLE_NODES.find(n => n.id === motion.to);

  return (
    <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
      <h3 className="text-white font-bold mb-4">⚡ 모션 상세</h3>

      {/* 흐름 시각화 */}
      <div className="flex items-center justify-between mb-4 p-3 bg-slate-900 rounded-xl">
        <div className="text-center">
          <div className="text-2xl">{fromNode?.emoji}</div>
          <div className="text-xs text-slate-400">{fromNode?.name}</div>
        </div>
        <div className="flex-1 mx-3">
          <div className="text-center text-yellow-400 text-xs mb-1">{motion.value}</div>
          <div className="h-0.5 bg-yellow-400 rounded"></div>
          <div className="text-center text-yellow-400 text-xs mt-1 font-bold">{motion.time}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl">{toNode?.emoji}</div>
          <div className="text-xs text-slate-400">{toNode?.name}</div>
        </div>
      </div>

      {/* 가치 정보 */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">전달 가치</span>
          <span className="text-white font-medium">{motion.value}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">소요 시간</span>
          <span className="text-white font-medium">{motion.time}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">시간 = 비용</span>
          <span className="text-green-400 font-bold">{motion.cost}</span>
        </div>
      </div>

      {/* 업무 생성 */}
      <button
        onClick={() => onCreateTask(motion, fromNode, toNode)}
        className="w-full py-3 bg-yellow-500 text-slate-900 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
      >
        이 모션에서 업무 생성
      </button>
    </div>
  );
}

// ============================================
// 역할 상세 패널
// ============================================
function RolePanel({ role }) {
  if (!role) return null;

  const outgoing = MOTIONS.filter(m => m.from === role.id);
  const incoming = MOTIONS.filter(m => m.to === role.id);

  return (
    <div className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
      {/* 역할 헤더 */}
      <div
        className="flex items-center gap-3 mb-4 p-3 rounded-xl"
        style={{ backgroundColor: role.bgColor }}
      >
        <span className="text-3xl">{role.emoji}</span>
        <div>
          <h3 className="text-white font-bold text-lg">{role.name}</h3>
          <p className="text-white/80 text-sm">{role.description}</p>
        </div>
      </div>

      {/* 담당 업무 */}
      <div className="mb-4">
        <h4 className="text-slate-400 text-sm mb-2">담당 업무</h4>
        <div className="flex flex-wrap gap-2">
          {role.tasks.map((task, i) => (
            <span
              key={i}
              className="px-3 py-1 bg-slate-700 text-white text-sm rounded-full"
            >
              {task}
            </span>
          ))}
        </div>
      </div>

      {/* 모션 통계 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-slate-900 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-400">{outgoing.length}</div>
          <div className="text-xs text-slate-400">보내는 모션</div>
        </div>
        <div className="p-3 bg-slate-900 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-400">{incoming.length}</div>
          <div className="text-xs text-slate-400">받는 모션</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 메인 컴포넌트
// ============================================
export default function ProcessMapV2() {
  const [activeRole, setActiveRole] = useState(null);
  const [activeMotion, setActiveMotion] = useState(null);
  const [tasks, setTasks] = useState([]);

  // 노드 위치 (사각형 배치)
  const nodePositions = {
    owner: { x: 200, y: 120 },
    admin: { x: 500, y: 120 },
    coach: { x: 500, y: 320 },
    parent: { x: 200, y: 320 },
  };

  // 역할 클릭
  const handleRoleClick = (role) => {
    setActiveRole(role);
    setActiveMotion(null);
  };

  // 모션 클릭
  const handleMotionClick = (motion) => {
    setActiveMotion(motion);
    setActiveRole(null);
  };

  // 업무 생성
  const handleCreateTask = async (motion, fromNode, toNode) => {
    const taskData = {
      title: `${fromNode.name} → ${toNode.name}: ${motion.value}`,
      description: `소요시간: ${motion.time} / 비용: ${motion.cost}`,
      priority: motion.time === '즉시' ? 'high' : 'medium',
      processId: `${motion.from}-${motion.to}`,
      processName: motion.value,
      role: toNode.id,
      dueDate: new Date().toISOString().split('T')[0],
    };

    if (supabase) {
      const { data, error } = await supabase
        .from('atb_tasks')
        .insert([{
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          process_id: taskData.processId,
          process_name: taskData.processName,
          role: taskData.role,
          due_date: taskData.dueDate,
          status: 'pending',
        }])
        .select()
        .single();

      if (!error && data) {
        setTasks(prev => [data, ...prev]);
      }
    } else {
      setTasks(prev => [{ ...taskData, id: Date.now() }, ...prev]);
    }
  };

  // 활성 모션 필터
  const getActiveMotions = () => {
    if (activeRole) {
      return MOTIONS.filter(m => m.from === activeRole.id || m.to === activeRole.id);
    }
    if (activeMotion) {
      return [activeMotion];
    }
    return [];
  };

  const activeMotions = getActiveMotions();

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* 헤더 */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          🏀 노드(역할) 기반 프로세스 맵
        </h1>
        <p className="text-slate-400 text-sm">
          노드 = 사람(역할) | 모션 = 시간(돈, 가치)
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SVG 캔버스 */}
        <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl p-4">
          <svg viewBox="0 0 700 450" className="w-full">
            {/* 배경 */}
            <rect width="700" height="450" fill="#0f172a" rx="16" />

            {/* 중앙 레이블 */}
            <text x="350" y="220" textAnchor="middle" fill="#334155" fontSize="14">
              가치 흐름
            </text>

            {/* 모션 화살표 */}
            {MOTIONS.map((motion, idx) => (
              <MotionArrow
                key={idx}
                motion={motion}
                fromPos={nodePositions[motion.from]}
                toPos={nodePositions[motion.to]}
                isActive={activeMotions.some(
                  m => m.from === motion.from && m.to === motion.to && m.value === motion.value
                )}
                onClick={handleMotionClick}
                index={idx}
              />
            ))}

            {/* 역할 노드 */}
            {ROLE_NODES.map(node => (
              <RoleNode
                key={node.id}
                node={node}
                x={nodePositions[node.id].x}
                y={nodePositions[node.id].y}
                isActive={activeRole?.id === node.id}
                onClick={handleRoleClick}
              />
            ))}

            {/* 범례 */}
            <g transform="translate(550, 380)">
              <text x="0" y="0" fill="#64748b" fontSize="10">클릭: 상세 보기</text>
              <text x="0" y="15" fill="#64748b" fontSize="10">모션 = 시간 = 돈</text>
            </g>
          </svg>
        </div>

        {/* 사이드 패널 */}
        <div className="space-y-4">
          {/* 상세 패널 */}
          {activeMotion ? (
            <MotionPanel
              motion={activeMotion}
              onCreateTask={handleCreateTask}
            />
          ) : activeRole ? (
            <RolePanel role={activeRole} />
          ) : (
            <div className="bg-slate-800 rounded-2xl p-6 text-center border border-slate-700">
              <div className="text-4xl mb-3">👆</div>
              <p className="text-slate-400">노드(역할) 또는 모션을</p>
              <p className="text-slate-400">클릭하세요</p>
            </div>
          )}

          {/* 생성된 업무 */}
          <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
            <h3 className="text-white font-bold mb-3">📋 생성된 업무 ({tasks.length})</h3>
            {tasks.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                모션 클릭 → 업무 생성
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tasks.slice(0, 5).map((task, idx) => (
                  <div key={task.id || idx} className="p-3 bg-slate-900 rounded-lg">
                    <div className="text-white text-sm font-medium truncate">{task.title}</div>
                    <div className="text-slate-500 text-xs mt-1">{task.description}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 통계 */}
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-4 text-white">
            <h3 className="font-bold mb-3">📊 프로세스 통계</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-xl font-bold">{ROLE_NODES.length}</div>
                <div className="text-xs opacity-80">역할(노드)</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2 text-center">
                <div className="text-xl font-bold">{MOTIONS.length}</div>
                <div className="text-xs opacity-80">모션</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 돌아가기 */}
      <div className="mt-8 text-center">
        <a
          href="#allthatbasket"
          className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
        >
          ← 대시보드로 돌아가기
        </a>
      </div>
    </div>
  );
}
