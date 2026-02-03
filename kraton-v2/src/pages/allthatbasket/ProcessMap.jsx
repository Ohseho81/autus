import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';

// ============================================
// 업무 정의 데이터
// ============================================
const PROCESS_DATA = {
  roles: [
    { id: 'owner', name: '원장님', emoji: '👔', color: '#1a1a2e', textColor: 'white' },
    { id: 'admin', name: '관리자', emoji: '💼', color: '#3b82f6', textColor: 'white' },
    { id: 'coach', name: '코치', emoji: '🏃', color: '#f97316', textColor: 'white' },
    { id: 'parent', name: '학부모', emoji: '👨‍👩‍👧', color: '#f5f5f5', textColor: '#333' },
  ],
  tasks: [
    // 원장님 업무
    { id: 'dashboard', role: 'owner', name: '대시보드', emoji: '📊', y: 120, description: '전체 현황 모니터링', bgColor: 'white' },
    { id: 'student-status', role: 'owner', name: '학생현황', emoji: '👥', y: 180, description: '정상/경고/위험 학생 관리', bgColor: 'white' },
    { id: 'approval', role: 'owner', name: '승인 관리', emoji: '✅', y: 250, description: '중요 결정 승인', bgColor: '#fef3c7' },
    { id: 'team-mgmt', role: 'owner', name: '팀 관리', emoji: '👥', y: 320, description: '직원 및 코치 관리', bgColor: 'white' },
    { id: 'insight', role: 'owner', name: '인사이트', emoji: '💡', y: 390, description: 'AI 기반 분석 확인', bgColor: '#e0f2fe' },
    { id: 'feedback-recv', role: 'owner', name: '피드백 수신', emoji: '📨', y: 460, description: '관리자로부터 보고 수신', bgColor: '#fce7f3' },

    // 관리자 업무
    { id: 'monitoring', role: 'admin', name: '현황 모니터링', emoji: '📈', y: 120, description: '일일 운영 현황 체크', bgColor: 'white' },
    { id: 'coach-mgmt', role: 'admin', name: '강사 관리', emoji: '👨‍🏫', y: 180, description: '코치 스케줄 및 성과 관리', bgColor: 'white' },
    { id: 'system-connect', role: 'admin', name: '시스템 연결', emoji: '🔗', y: 250, description: '외부 시스템 연동 관리', bgColor: '#dcfce7' },
    { id: 'feedback-send', role: 'admin', name: '피드백 발송', emoji: '📤', y: 380, description: '원장님께 보고', bgColor: '#fce7f3' },
    { id: 'emergency', role: 'admin', name: '긴급 보고', emoji: '🚨', y: 450, description: '즉시 처리 필요 사항', bgColor: '#fee2e2' },

    // 코치 업무
    { id: 'class-mgmt', role: 'coach', name: '수업 관리', emoji: '🏀', y: 120, description: '수업 진행 및 계획', bgColor: 'white' },
    { id: 'attendance', role: 'coach', name: '출석 체크', emoji: '✅', y: 180, description: '학생 출결 관리', bgColor: '#dcfce7' },
    { id: 'task-process', role: 'coach', name: '업무 처리', emoji: '📋', y: 280, description: '일일 업무 수행', bgColor: 'white' },
    { id: 'video-record', role: 'coach', name: '영상 촬영', emoji: '🎥', y: 350, description: '수업 영상 기록', bgColor: '#e0f2fe' },
    { id: 'report-write', role: 'coach', name: '보고서 작성', emoji: '📝', y: 420, description: '학생 발달 보고서', bgColor: 'white' },

    // 학부모 업무
    { id: 'child-status', role: 'parent', name: '자녀 현황', emoji: '🏠', y: 120, description: '자녀 학습 현황 확인', bgColor: 'white' },
    { id: 'growth-record', role: 'parent', name: '성장 기록', emoji: '📈', y: 200, description: '스킬 발달 추이', bgColor: 'white' },
    { id: 'schedule', role: 'parent', name: '일정 확인', emoji: '📅', y: 280, description: '수업 일정 관리', bgColor: 'white' },
    { id: 'notification', role: 'parent', name: '알림 수신', emoji: '🔔', y: 360, description: '출석/결제 알림', bgColor: '#fef3c7' },
  ],
  flows: [
    { from: 'feedback-send', to: 'feedback-recv', label: '피드백', color: '#8b5cf6' },
    { from: 'approval', to: 'system-connect', label: '승인', color: '#22c55e' },
    { from: 'attendance', to: 'notification', label: '출석알림', color: '#f97316', dashed: true },
    { from: 'task-process', to: 'monitoring', label: '데이터', color: '#3b82f6', dashed: true },
  ],
};

// ============================================
// 클릭 가능한 태스크 노드 컴포넌트
// ============================================
function TaskNode({ task, role, x, onClick, isSelected }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(task)}
    >
      {/* 선택/호버 하이라이트 */}
      {(isHovered || isSelected) && (
        <rect
          x={x - 5}
          y={task.y - 5}
          width={170}
          height={60}
          rx={15}
          fill="none"
          stroke={isSelected ? '#3b82f6' : '#8b5cf6'}
          strokeWidth={3}
          strokeDasharray={isSelected ? '0' : '5,5'}
        />
      )}

      {/* 태스크 카드 */}
      <rect
        x={x}
        y={task.y}
        width={160}
        height={50}
        rx={10}
        fill={task.bgColor || 'white'}
        opacity={0.95}
        stroke={isHovered ? '#8b5cf6' : 'transparent'}
        strokeWidth={2}
      />

      {/* 태스크 이름 */}
      <text
        x={x + 80}
        y={task.y + 30}
        textAnchor="middle"
        fill={role.id === 'parent' ? '#333' : role.color}
        fontSize="13"
        fontWeight="600"
      >
        {task.emoji} {task.name}
      </text>

      {/* 플러스 아이콘 (호버시) */}
      {isHovered && (
        <g>
          <circle
            cx={x + 145}
            cy={task.y + 15}
            r={10}
            fill="#3b82f6"
          />
          <text
            x={x + 145}
            y={task.y + 20}
            textAnchor="middle"
            fill="white"
            fontSize="16"
            fontWeight="bold"
          >
            +
          </text>
        </g>
      )}
    </g>
  );
}

// ============================================
// 태스크 생성 모달
// ============================================
function TaskModal({ task, role, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignee: role?.name || '',
    dueDate: new Date().toISOString().split('T')[0],
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave({
      ...formData,
      processId: task.id,
      processName: task.name,
      role: role.id,
    });
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div
          className="p-4 rounded-t-2xl text-white"
          style={{ backgroundColor: role.color }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{task.emoji}</span>
              <div>
                <h3 className="font-bold text-lg">{task.name}</h3>
                <p className="text-sm opacity-80">{role.emoji} {role.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 폼 */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-500 -mt-2 mb-4">{task.description}</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              업무 제목 *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              placeholder={`예: ${task.name} 관련 업무`}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상세 내용
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="업무 상세 내용을 입력하세요..."
              rows={3}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                우선순위
              </label>
              <select
                value={formData.priority}
                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="low">🟢 낮음</option>
                <option value="medium">🟡 보통</option>
                <option value="high">🔴 높음</option>
                <option value="urgent">🚨 긴급</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                마감일
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              담당자
            </label>
            <input
              type="text"
              value={formData.assignee}
              onChange={e => setFormData({ ...formData, assignee: e.target.value })}
              placeholder="담당자 이름"
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="p-4 border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={!formData.title || isSaving}
            className="flex-1 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : '✓ 업무 생성'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 생성된 업무 목록 패널
// ============================================
function TaskListPanel({ tasks, onClose }) {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'urgent': return '🚨 긴급';
      case 'high': return '🔴 높음';
      case 'medium': return '🟡 보통';
      case 'low': return '🟢 낮음';
      default: return priority;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-800">📋 생성된 업무 ({tasks.length})</h2>
        {tasks.length > 0 && (
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            모두 지우기
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          프로세스 노드를 클릭하여 업무를 생성하세요
        </p>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <div
              key={index}
              className="p-4 border rounded-xl hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {task.processName}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-800">{task.title}</h4>
                  {task.description && (
                    <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span>👤 {task.assignee}</span>
                    <span>📅 {task.dueDate}</span>
                  </div>
                </div>
                <span className="text-2xl">{PROCESS_DATA.tasks.find(t => t.id === task.processId)?.emoji}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// 메인 ProcessMap 컴포넌트
// ============================================
export default function ProcessMap() {
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [createdTasks, setCreatedTasks] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // Supabase에서 기존 업무 로드
  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('atb_tasks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data && !error) {
      setCreatedTasks(data);
    }
  };

  const handleTaskClick = (task) => {
    const role = PROCESS_DATA.roles.find(r => r.id === task.role);
    setSelectedTask(task);
    setSelectedRole(role);
    setShowModal(true);
  };

  const handleSaveTask = async (taskData) => {
    // Supabase에 저장
    if (supabase) {
      const { data, error } = await supabase
        .from('atb_tasks')
        .insert([{
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          assignee: taskData.assignee,
          due_date: taskData.dueDate,
          process_id: taskData.processId,
          process_name: taskData.processName,
          role: taskData.role,
          status: 'pending',
        }])
        .select()
        .single();

      if (!error && data) {
        setCreatedTasks(prev => [data, ...prev]);
        return;
      }
    }

    // 로컬 저장 (Supabase 연결 안됨)
    setCreatedTasks(prev => [{
      ...taskData,
      id: Date.now(),
      created_at: new Date().toISOString(),
    }, ...prev]);
  };

  const getRoleX = (roleId) => {
    const roleIndex = PROCESS_DATA.roles.findIndex(r => r.id === roleId);
    return 70 + roleIndex * 230;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-100 p-8">
      <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">🏀 올댓바스켓 업무 프로세스</h1>
      <p className="text-center text-gray-600 mb-2">역할별 업무 및 데이터 흐름</p>
      <p className="text-center text-blue-600 text-sm mb-8">
        💡 노드를 클릭하면 해당 업무를 바로 생성할 수 있습니다
      </p>

      <div className="max-w-6xl mx-auto">
        <svg viewBox="0 0 1000 550" className="w-full">
          {/* 배경 섹션 */}
          {PROCESS_DATA.roles.map((role, index) => (
            <g key={role.id}>
              <rect
                x={50 + index * 230}
                y={50}
                width={210}
                height={480}
                rx={20}
                fill={role.color}
                opacity={role.id === 'parent' ? 1 : 0.9}
                stroke={role.id === 'parent' ? '#e5e5e5' : 'none'}
                strokeWidth={2}
              />
              <text
                x={155 + index * 230}
                y={90}
                textAnchor="middle"
                fill={role.textColor}
                fontSize="18"
                fontWeight="bold"
              >
                {role.emoji} {role.name}
              </text>
            </g>
          ))}

          {/* 태스크 노드들 */}
          {PROCESS_DATA.tasks.map(task => {
            const role = PROCESS_DATA.roles.find(r => r.id === task.role);
            const x = getRoleX(task.role);
            return (
              <TaskNode
                key={task.id}
                task={task}
                role={role}
                x={x}
                onClick={handleTaskClick}
                isSelected={selectedTask?.id === task.id}
              />
            );
          })}

          {/* 화살표 정의 */}
          <defs>
            <marker id="arrow-purple" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#8b5cf6"/>
            </marker>
            <marker id="arrow-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e"/>
            </marker>
            <marker id="arrow-orange" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#f97316"/>
            </marker>
            <marker id="arrow-blue" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6"/>
            </marker>
          </defs>

          {/* 피드백: 관리자 → 원장 */}
          <path d="M300 405 L230 485" stroke="#8b5cf6" strokeWidth="3" fill="none" markerEnd="url(#arrow-purple)"/>
          <text x="255" y="435" fill="#8b5cf6" fontSize="10" fontWeight="bold">피드백</text>

          {/* 승인: 원장 → 관리자 */}
          <path d="M230 275 L300 275" stroke="#22c55e" strokeWidth="3" fill="none" markerEnd="url(#arrow-green)"/>
          <text x="255" y="265" fill="#22c55e" fontSize="10" fontWeight="bold">승인</text>

          {/* 출석알림: 코치 → 학부모 */}
          <path d="M690 205 L760 385" stroke="#f97316" strokeWidth="3" fill="none" markerEnd="url(#arrow-orange)" strokeDasharray="5,5"/>
          <text x="720" y="300" fill="#f97316" fontSize="10" fontWeight="bold" transform="rotate(50, 720, 300)">출석알림</text>

          {/* 데이터: 코치 → 관리자 */}
          <path d="M530 305 L460 145" stroke="#3b82f6" strokeWidth="2" fill="none" markerEnd="url(#arrow-blue)" strokeDasharray="3,3"/>
          <text x="485" y="220" fill="#3b82f6" fontSize="10">데이터</text>

          {/* Supabase */}
          <rect x="380" y="490" width="240" height="35" rx="10" fill="#3ecf8e"/>
          <text x="500" y="513" textAnchor="middle" fill="white" fontSize="13" fontWeight="bold">⚡ Supabase 실시간 동기화</text>
        </svg>

        {/* 범례 */}
        <div className="mt-6 bg-white rounded-2xl p-5 shadow-lg">
          <h2 className="text-lg font-bold mb-3 text-gray-800">📋 데이터 흐름 범례</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-purple-500 rounded"></div>
              <span className="text-sm text-gray-600">피드백 (관리자→원장)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">승인/데이터 전송</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-600">출석 알림 (코치→학부모)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-1 bg-emerald-500 rounded"></div>
              <span className="text-sm text-gray-600">Supabase 동기화</span>
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 text-white rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">4</div>
            <div className="text-sm opacity-80">역할</div>
          </div>
          <div className="bg-blue-500 text-white rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{PROCESS_DATA.tasks.length}</div>
            <div className="text-sm opacity-80">프로세스</div>
          </div>
          <div className="bg-orange-500 text-white rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{createdTasks.length}</div>
            <div className="text-sm opacity-80">생성된 업무</div>
          </div>
          <div className="bg-emerald-500 text-white rounded-xl p-4 text-center">
            <div className="text-3xl font-bold">{PROCESS_DATA.flows.length}</div>
            <div className="text-sm opacity-80">데이터 흐름</div>
          </div>
        </div>

        {/* 생성된 업무 목록 */}
        <TaskListPanel
          tasks={createdTasks}
          onClose={() => setCreatedTasks([])}
        />

        {/* 뒤로가기 버튼 */}
        <div className="mt-6 text-center">
          <a
            href="#allthatbasket"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            ← 대시보드로 돌아가기
          </a>
        </div>
      </div>

      {/* 태스크 생성 모달 */}
      {showModal && selectedTask && selectedRole && (
        <TaskModal
          task={selectedTask}
          role={selectedRole}
          onClose={() => {
            setShowModal(false);
            setSelectedTask(null);
          }}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
}
