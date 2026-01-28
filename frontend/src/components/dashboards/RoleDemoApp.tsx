/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎨 RoleDemoApp - AUTUS 역할별 대시보드 통합 데모
 * 
 * 모든 역할의 대시보드를 한 화면에서 전환하며 테스트
 * - 역할별 도파민 설계 적용
 * - AUTUS 코어 시스템 연동
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import CelebrationPopup, { useCelebration } from '../Common/CelebrationPopup';
import TeacherDashboard from './TeacherDashboard';
import ManagerDashboard from './ManagerDashboard';
import OwnerDashboard from './OwnerDashboard';
import ParentDashboard from './ParentDashboard';
import { StudentDashboard } from '../student';

// ═══════════════════════════════════════════════════════════════════════════════
// 역할 정의
// ═══════════════════════════════════════════════════════════════════════════════

type RoleId = 'teacher' | 'manager' | 'owner' | 'parent' | 'student';

interface Role {
  id: RoleId;
  name: string;
  icon: string;
  label: string;
  coreQuestion: string;
}

const ROLES: Role[] = [
  { id: 'teacher', name: '실무자', icon: '🔨', label: '선생님', coreQuestion: '지금 뭐 해야 해요?' },
  { id: 'manager', name: '관리자', icon: '⚙️', label: '실장', coreQuestion: '전체 상황이 어때요?' },
  { id: 'owner', name: '오너', icon: '👑', label: '원장', coreQuestion: '앞으로 어떻게 될까요?' },
  { id: 'parent', name: '학부모', icon: '👨‍👩‍👧', label: '학부모', coreQuestion: '우리 아이가 얼마나 성장했나요?' },
  { id: 'student', name: '학생', icon: '🎒', label: '학생', coreQuestion: '내가 뭘 왜 어떻게 해야 해?' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 학생 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_STUDENT = {
  id: 'student-001',
  name: '민수',
  level: 12,
  currentXP: 1850,
  nextLevelXP: 2000,
  streak: 25,
  dream: '게임 개발자',
  dreamIcon: '🎮',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function RoleDemoApp() {
  const [currentRole, setCurrentRole] = useState<RoleId>('teacher');
  const { celebration, celebrate, close, CelebrationComponent } = useCelebration();

  const currentRoleData = ROLES.find(r => r.id === currentRole);

  const handleCelebrate = (icon: string, title: string, description: string) => {
    celebrate(icon, title, description);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* 역할 선택 탭 */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        {/* 현재 역할의 핵심 질문 */}
        <div className="px-4 py-2 text-center text-xs text-slate-400 border-b border-slate-800/50">
          <span className="text-white">{currentRoleData?.icon}</span>
          <span className="ml-2">{currentRoleData?.coreQuestion}</span>
        </div>
        
        {/* 탭 버튼 */}
        <div className="flex overflow-x-auto scrollbar-hide">
          {ROLES.map(role => (
            <button
              key={role.id}
              onClick={() => setCurrentRole(role.id)}
              className={`
                flex-1 min-w-0 px-3 py-3 text-sm font-medium transition-all
                ${currentRole === role.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }
              `}
            >
              <span className="mr-1">{role.icon}</span>
              <span className="hidden sm:inline">{role.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 대시보드 렌더링 */}
      <div className="min-h-[calc(100vh-100px)]">
        {currentRole === 'teacher' && (
          <TeacherDashboard 
            teacherName="김선생님"
            streak={15}
            todayCompleted={3}
            todayTotal={5}
            attentionStudents={[
              { 
                id: '1', 
                name: '김민수', 
                temperature: 36, 
                emoji: '🥶', 
                reason: '어제 어머니가 "학원 그만둘까 고민중"이라고 하셨어요',
                suggestion: '오늘 수업 전에 민수랑 5분 대화해보세요'
              },
              { 
                id: '2', 
                name: '이서연', 
                temperature: 52, 
                emoji: '😰', 
                reason: '3회 연속 지각, 오늘도 아직 출석 전',
                suggestion: '출석하면 "요즘 힘든 일 있어?" 물어봐주세요'
              },
            ]}
            todayClasses={[
              { time: '15:00', name: '초등 3반', studentCount: 8, alerts: ['🎂 박지민 오늘 생일'] },
              { time: '16:30', name: '초등 4반', studentCount: 6, alerts: [] },
              { time: '18:00', name: '중등 1반', studentCount: 7, alerts: ['🥶 김민수 관심 필요'] },
            ]}
            onCelebrate={handleCelebrate}
          />
        )}
        
        {currentRole === 'manager' && (
          <ManagerDashboard 
            onCelebrate={handleCelebrate}
          />
        )}
        
        {currentRole === 'owner' && (
          <OwnerDashboard 
            onCelebrate={handleCelebrate}
          />
        )}
        
        {currentRole === 'parent' && (
          <ParentDashboard 
            childName="민수"
            childGrade="초등 5학년"
            subject="수학"
            onCelebrate={handleCelebrate}
          />
        )}
        
        {currentRole === 'student' && (
          <StudentDashboard 
            student={SAMPLE_STUDENT}
            onMissionComplete={() => handleCelebrate('🎉', '미션 완료!', '+50 XP 획득! 🎖️')}
          />
        )}
      </div>

      {/* 축하 팝업 */}
      <CelebrationComponent />

      {/* 하단 역할 정보 */}
      <div className="fixed bottom-0 left-0 right-0 p-2 bg-slate-900/95 border-t border-slate-800 text-center text-xs text-slate-500">
        AUTUS 역할별 대시보드 데모 | MVP 모드
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
