/**
 * AUTUS Mobile - useMissions Hook
 * 미션 관련 계산을 메모이제이션하여 최적화
 */

import { useMemo, useCallback } from 'react';
import { useAutusStore } from '../stores/autusStore';
import { MissionFilter, MissionType } from '../types';

export const useMissions = () => {
  const missions = useAutusStore(state => state.missions);
  const addMission = useAutusStore(state => state.addMission);
  const updateMission = useAutusStore(state => state.updateMission);
  const deleteMission = useAutusStore(state => state.deleteMission);
  
  const counts = useMemo(() => ({
    active: missions.filter(m => m.status === 'active').length,
    done: missions.filter(m => m.status === 'done').length,
    ignored: missions.filter(m => m.status === 'ignored').length,
    total: missions.length,
  }), [missions]);
  
  const activeMissions = useMemo(() => 
    missions.filter(m => m.status === 'active'), [missions]);
  
  return {
    missions,
    counts,
    activeMissions,
    addMission,
    updateMission,
    deleteMission,
  };
};

export const useFilteredMissions = (filter: MissionFilter) => {
  const missions = useAutusStore(state => state.missions);
  
  return useMemo(() => 
    missions.filter(m => m.status === filter), 
    [missions, filter]
  );
};

export const useMissionActions = () => {
  const addMission = useAutusStore(state => state.addMission);
  const updateMission = useAutusStore(state => state.updateMission);
  const deleteMission = useAutusStore(state => state.deleteMission);
  
  const completeMission = useCallback((id: number) => {
    updateMission(id, { status: 'done', progress: 100 });
  }, [updateMission]);
  
  const ignoreMission = useCallback((id: number) => {
    updateMission(id, { status: 'ignored' });
  }, [updateMission]);
  
  const createMission = useCallback((
    nodeId: string, 
    nodeName: string, 
    type: MissionType
  ) => {
    addMission({
      title: `${nodeName} 개선`,
      type,
      icon: type === '자동화' ? '🤖' : type === '외주' ? '👥' : '📋',
      status: 'active',
      progress: 0,
      eta: type === '자동화' ? '3일 후' : type === '외주' ? '7일 후' : '1일 후',
      nodeId,
      steps: [
        { t: '분석 시작', s: 'active' },
        { t: '옵션 검토', s: '' },
        { t: '실행', s: '' },
        { t: '결과 확인', s: '' },
      ],
    });
  }, [addMission]);
  
  return {
    createMission,
    completeMission,
    ignoreMission,
    deleteMission,
  };
};
