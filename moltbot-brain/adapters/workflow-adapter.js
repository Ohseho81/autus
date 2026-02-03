/**
 * 🔄 Workflow Adapter - 9단계 워크플로우 연동
 * 
 * MoltBot Brain ↔ AUTUS 9단계 워크플로우 통합
 */

// ============================================
// 9단계 Phase 정의
// ============================================
export const PHASES = {
  SENSE: { id: 'SENSE', name: '감지', group: 'DISCOVER', leader: 'Ray Dalio' },
  ANALYZE: { id: 'ANALYZE', name: '분석', group: 'DISCOVER', leader: 'Elon Musk' },
  STRATEGIZE: { id: 'STRATEGIZE', name: '전략', group: 'DISCOVER', leader: 'Peter Thiel' },
  DESIGN: { id: 'DESIGN', name: '설계', group: 'EXECUTE', leader: 'Jeff Bezos' },
  BUILD: { id: 'BUILD', name: '구축', group: 'EXECUTE', leader: 'Jeff Bezos' },
  LAUNCH: { id: 'LAUNCH', name: '출시', group: 'EXECUTE', leader: 'Reid Hoffman' },
  MEASURE: { id: 'MEASURE', name: '측정', group: 'LEARN', leader: 'Andy Grove' },
  LEARN: { id: 'LEARN', name: '학습', group: 'LEARN', leader: 'Ray Dalio' },
  SCALE: { id: 'SCALE', name: '확장', group: 'LEARN', leader: 'Jeff Bezos' },
};

export const PHASE_ORDER = ['SENSE', 'ANALYZE', 'STRATEGIZE', 'DESIGN', 'BUILD', 'LAUNCH', 'MEASURE', 'LEARN', 'SCALE'];

// ============================================
// 미션 템플릿
// ============================================
export const MISSION_TEMPLATES = {
  DORMANT_REACTIVATION: {
    id: 'dormant_reactivation',
    name: '휴면고객 재활성화',
    description: '30일+ 미방문 회원 복귀 유도',
    expectedROI: 2440,
    duration: '2주',
  },
  RETENTION_IMPROVEMENT: {
    id: 'retention_improvement',
    name: '재등록률 향상',
    description: '만료 예정 회원 리텐션',
    expectedROI: 3200,
    duration: '1개월',
  },
  NEW_MEMBER_ACQUISITION: {
    id: 'new_member_acquisition',
    name: '신규 회원 확보',
    description: '체험 → 정규 전환 극대화',
    expectedROI: 1850,
    duration: '1개월',
  },
};

// ============================================
// 미션 상태 관리
// ============================================
let activeMissions = [];

export function createMission(templateId, customData = {}) {
  const template = MISSION_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`Unknown template: ${templateId}`);
  }

  const mission = {
    id: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...template,
    ...customData,
    currentPhase: 'SENSE',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    phaseHistory: [],
    indices: { K: 0.6, I: 0, Omega: 0 },
  };

  activeMissions.push(mission);
  return mission;
}

export function getMission(missionId) {
  return activeMissions.find(m => m.id === missionId);
}

export function getActiveMissions() {
  return activeMissions.filter(m => m.status === 'ACTIVE');
}

export function advancePhase(missionId) {
  const mission = getMission(missionId);
  if (!mission) return null;

  const currentIndex = PHASE_ORDER.indexOf(mission.currentPhase);
  if (currentIndex >= PHASE_ORDER.length - 1) {
    mission.status = 'COMPLETED';
    return mission;
  }

  const previousPhase = mission.currentPhase;
  mission.currentPhase = PHASE_ORDER[currentIndex + 1];
  mission.updatedAt = new Date().toISOString();
  mission.phaseHistory.push({
    phase: previousPhase,
    completedAt: new Date().toISOString(),
  });

  return mission;
}

// ============================================
// Telegram 포맷
// ============================================
export function formatMissionStatus(mission) {
  const phase = PHASES[mission.currentPhase];
  const phaseIndex = PHASE_ORDER.indexOf(mission.currentPhase) + 1;
  const progress = Math.round((phaseIndex / 9) * 100);

  return `
🎯 *${mission.name}*

📍 현재 단계: ${phase.name} (${phaseIndex}/9)
👤 리더: ${phase.leader}
📊 진행률: ${progress}%
${'▓'.repeat(Math.floor(progress / 10))}${'░'.repeat(10 - Math.floor(progress / 10))}

*K·I·Ω 지수:*
  K (가치): ${mission.indices.K.toFixed(2)}
  I (상호작용): ${mission.indices.I.toFixed(2)}
  Ω (효율): ${mission.indices.Omega.toFixed(2)}

⏱️ 예상 기간: ${mission.duration}
💰 예상 ROI: ${mission.expectedROI}%
  `.trim();
}

export function formatPhaseList() {
  let message = '🔄 *AUTUS 9단계 워크플로우*\n\n';

  const groups = {
    DISCOVER: { name: '발견', emoji: '🔍', phases: [] },
    EXECUTE: { name: '실행', emoji: '⚡', phases: [] },
    LEARN: { name: '학습', emoji: '📚', phases: [] },
  };

  PHASE_ORDER.forEach((phaseId, index) => {
    const phase = PHASES[phaseId];
    groups[phase.group].phases.push(`  ${index + 1}. ${phase.name} (${phase.leader.split(' ')[0]})`);
  });

  Object.entries(groups).forEach(([key, group]) => {
    message += `${group.emoji} *${group.name}*\n`;
    message += group.phases.join('\n') + '\n\n';
  });

  return message;
}

export function formatMissionList() {
  const missions = getActiveMissions();
  
  if (missions.length === 0) {
    return '📋 활성 미션이 없습니다.\n\n/workflow start [템플릿] 으로 시작';
  }

  let message = '📋 *활성 미션*\n\n';
  
  missions.forEach((m, i) => {
    const phase = PHASES[m.currentPhase];
    const phaseIndex = PHASE_ORDER.indexOf(m.currentPhase) + 1;
    message += `${i + 1}. *${m.name}*\n`;
    message += `   📍 ${phase.name} (${phaseIndex}/9)\n`;
    message += `   \`${m.id}\`\n\n`;
  });

  return message;
}

// ============================================
// API 엔드포인트
// ============================================
export function setupWorkflowRoutes(app) {
  // 미션 목록
  app.get('/api/workflow/missions', (req, res) => {
    res.json({
      success: true,
      missions: getActiveMissions(),
    });
  });

  // 미션 상세
  app.get('/api/workflow/mission/:id', (req, res) => {
    const mission = getMission(req.params.id);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission not found' });
    }
    res.json({ success: true, mission });
  });

  // 미션 생성
  app.post('/api/workflow/mission', (req, res) => {
    const { templateId, customData } = req.body;
    try {
      const mission = createMission(templateId, customData);
      res.json({ success: true, mission });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  // Phase 진행
  app.post('/api/workflow/mission/:id/advance', (req, res) => {
    const mission = advancePhase(req.params.id);
    if (!mission) {
      return res.status(404).json({ success: false, error: 'Mission not found' });
    }
    res.json({ success: true, mission });
  });

  // 템플릿 목록
  app.get('/api/workflow/templates', (req, res) => {
    res.json({
      success: true,
      templates: Object.values(MISSION_TEMPLATES),
    });
  });

  // Phase 목록
  app.get('/api/workflow/phases', (req, res) => {
    res.json({
      success: true,
      phases: PHASE_ORDER.map((id, index) => ({
        ...PHASES[id],
        order: index + 1,
      })),
    });
  });
}

// ============================================
// Telegram 핸들러
// ============================================
export function setupWorkflowCommands(bot) {
  bot.onText(/\/workflow(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const args = match[1]?.split(' ') || ['help'];
    const command = args[0];

    switch (command) {
      case 'help':
        bot.sendMessage(chatId, `
🔄 *워크플로우 명령어*

/workflow phases - 9단계 확인
/workflow list - 활성 미션 목록
/workflow templates - 미션 템플릿
/workflow start [템플릿ID] - 미션 시작
/workflow status [미션ID] - 미션 상태
/workflow advance [미션ID] - 다음 단계
        `, { parse_mode: 'Markdown' });
        break;

      case 'phases':
        bot.sendMessage(chatId, formatPhaseList(), { parse_mode: 'Markdown' });
        break;

      case 'list':
        bot.sendMessage(chatId, formatMissionList(), { parse_mode: 'Markdown' });
        break;

      case 'templates':
        let templateMsg = '📑 *미션 템플릿*\n\n';
        Object.entries(MISSION_TEMPLATES).forEach(([key, t]) => {
          templateMsg += `*${t.name}*\n`;
          templateMsg += `  ID: \`${key}\`\n`;
          templateMsg += `  ${t.description}\n`;
          templateMsg += `  예상 ROI: ${t.expectedROI}%\n\n`;
        });
        templateMsg += '💡 /workflow start [ID] 로 시작';
        bot.sendMessage(chatId, templateMsg, { parse_mode: 'Markdown' });
        break;

      case 'start': {
        const templateId = args[1];
        if (!templateId) {
          bot.sendMessage(chatId, '사용법: /workflow start [템플릿ID]\n\n/workflow templates 로 확인');
          return;
        }
        try {
          const mission = createMission(templateId.toUpperCase());
          bot.sendMessage(chatId, `✅ 미션 시작!\n\n${formatMissionStatus(mission)}`, { parse_mode: 'Markdown' });
        } catch (error) {
          bot.sendMessage(chatId, `❌ 오류: ${error.message}`);
        }
        break;
      }

      case 'status': {
        const missionId = args[1];
        if (!missionId) {
          const missions = getActiveMissions();
          if (missions.length === 1) {
            bot.sendMessage(chatId, formatMissionStatus(missions[0]), { parse_mode: 'Markdown' });
          } else {
            bot.sendMessage(chatId, formatMissionList() + '\n💡 /workflow status [ID] 로 상세 확인', { parse_mode: 'Markdown' });
          }
          return;
        }
        const mission = getMission(missionId);
        if (!mission) {
          bot.sendMessage(chatId, `❌ 미션을 찾을 수 없습니다: ${missionId}`);
          return;
        }
        bot.sendMessage(chatId, formatMissionStatus(mission), { parse_mode: 'Markdown' });
        break;
      }

      case 'advance': {
        const missionId = args[1];
        let mission;
        if (!missionId) {
          const missions = getActiveMissions();
          if (missions.length === 1) {
            mission = missions[0];
          } else {
            bot.sendMessage(chatId, '사용법: /workflow advance [미션ID]');
            return;
          }
        } else {
          mission = getMission(missionId);
        }

        if (!mission) {
          bot.sendMessage(chatId, `❌ 미션을 찾을 수 없습니다`);
          return;
        }

        const previousPhase = mission.currentPhase;
        const updatedMission = advancePhase(mission.id);
        
        if (updatedMission.status === 'COMPLETED') {
          bot.sendMessage(chatId, `🎉 *미션 완료!*\n\n${updatedMission.name}`, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, `✅ *${PHASES[previousPhase].name}* → *${PHASES[updatedMission.currentPhase].name}*\n\n${formatMissionStatus(updatedMission)}`, { parse_mode: 'Markdown' });
        }
        break;
      }

      default:
        bot.sendMessage(chatId, `❓ 알 수 없는 명령: ${command}\n\n/workflow help 로 확인`);
    }
  });
}

export default {
  PHASES,
  PHASE_ORDER,
  MISSION_TEMPLATES,
  createMission,
  getMission,
  getActiveMissions,
  advancePhase,
  formatMissionStatus,
  formatPhaseList,
  formatMissionList,
  setupWorkflowRoutes,
  setupWorkflowCommands,
};
