/**
 * 🔄 Workflow Handler - 9단계 워크플로우 Telegram 연동
 * 
 * Telegram ↔ MoltBot Brain Workflow API
 */

const BRAIN_URL = process.env.MOLTBOT_BRAIN_URL || 'http://localhost:3030';

// ============================================
// API 호출
// ============================================
async function callWorkflowAPI(endpoint, method = 'GET', body = null) {
  try {
    const url = BRAIN_URL + '/api/workflow' + endpoint;
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    if (response.ok) {
      return await response.json();
    }
    return null;
  } catch (error) {
    console.log(`[WORKFLOW API ERROR] ${error.message}`);
    return null;
  }
}

// ============================================
// 9단계 Phase 정의 (로컬)
// ============================================
const PHASES = {
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

const PHASE_ORDER = ['SENSE', 'ANALYZE', 'STRATEGIZE', 'DESIGN', 'BUILD', 'LAUNCH', 'MEASURE', 'LEARN', 'SCALE'];

// ============================================
// 포맷 함수
// ============================================
function formatPhaseList() {
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

function formatMissionStatus(mission) {
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
  K (가치): ${(mission.indices?.K || 0.6).toFixed(2)}
  I (상호작용): ${(mission.indices?.I || 0).toFixed(2)}
  Ω (효율): ${(mission.indices?.Omega || 0).toFixed(2)}

⏱️ 예상 기간: ${mission.duration || '-'}
💰 예상 ROI: ${mission.expectedROI || 0}%
  `.trim();
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

      case 'list': {
        const data = await callWorkflowAPI('/missions');
        if (data?.missions?.length > 0) {
          let message = '📋 *활성 미션*\n\n';
          data.missions.forEach((m, i) => {
            const phase = PHASES[m.currentPhase];
            const phaseIndex = PHASE_ORDER.indexOf(m.currentPhase) + 1;
            message += `${i + 1}. *${m.name}*\n`;
            message += `   📍 ${phase.name} (${phaseIndex}/9)\n`;
            message += `   \`${m.id}\`\n\n`;
          });
          bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, '📋 활성 미션이 없습니다.\n\n/workflow templates 으로 템플릿 확인\n/workflow start [ID] 로 시작');
        }
        break;
      }

      case 'templates': {
        const data = await callWorkflowAPI('/templates');
        if (data?.templates) {
          let message = '📑 *미션 템플릿*\n\n';
          data.templates.forEach(t => {
            message += `*${t.name}*\n`;
            message += `  ID: \`${t.id.toUpperCase()}\`\n`;
            message += `  ${t.description}\n`;
            message += `  예상 ROI: ${t.expectedROI}%\n\n`;
          });
          message += '💡 /workflow start [ID] 로 시작';
          bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, '❌ 템플릿을 불러올 수 없습니다.\n\nBrain 서버 확인: /brain status');
        }
        break;
      }

      case 'start': {
        const templateId = args[1];
        if (!templateId) {
          bot.sendMessage(chatId, '사용법: /workflow start [템플릿ID]\n\n/workflow templates 로 확인');
          return;
        }
        
        const data = await callWorkflowAPI('/mission', 'POST', { 
          templateId: templateId.toUpperCase() 
        });
        
        if (data?.mission) {
          bot.sendMessage(chatId, `✅ 미션 시작!\n\n${formatMissionStatus(data.mission)}`, { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, `❌ 미션 시작 실패\n\n템플릿 ID 확인: /workflow templates`);
        }
        break;
      }

      case 'status': {
        const missionId = args[1];
        if (!missionId) {
          const listData = await callWorkflowAPI('/missions');
          if (listData?.missions?.length === 1) {
            bot.sendMessage(chatId, formatMissionStatus(listData.missions[0]), { parse_mode: 'Markdown' });
          } else if (listData?.missions?.length > 1) {
            bot.sendMessage(chatId, '미션 ID를 지정해주세요:\n/workflow status [미션ID]\n\n/workflow list 로 확인');
          } else {
            bot.sendMessage(chatId, '활성 미션이 없습니다.\n\n/workflow start [템플릿ID] 로 시작');
          }
          return;
        }
        
        const data = await callWorkflowAPI(`/mission/${missionId}`);
        if (data?.mission) {
          bot.sendMessage(chatId, formatMissionStatus(data.mission), { parse_mode: 'Markdown' });
        } else {
          bot.sendMessage(chatId, `❌ 미션을 찾을 수 없습니다: ${missionId}`);
        }
        break;
      }

      case 'advance': {
        let missionId = args[1];
        
        if (!missionId) {
          const listData = await callWorkflowAPI('/missions');
          if (listData?.missions?.length === 1) {
            missionId = listData.missions[0].id;
          } else {
            bot.sendMessage(chatId, '미션 ID를 지정해주세요:\n/workflow advance [미션ID]');
            return;
          }
        }
        
        const data = await callWorkflowAPI(`/mission/${missionId}/advance`, 'POST');
        if (data?.mission) {
          if (data.mission.status === 'COMPLETED') {
            bot.sendMessage(chatId, `🎉 *미션 완료!*\n\n${data.mission.name}`, { parse_mode: 'Markdown' });
          } else {
            bot.sendMessage(chatId, `✅ 다음 단계로 진행!\n\n${formatMissionStatus(data.mission)}`, { parse_mode: 'Markdown' });
          }
        } else {
          bot.sendMessage(chatId, `❌ 단계 진행 실패`);
        }
        break;
      }

      default:
        bot.sendMessage(chatId, `❓ 알 수 없는 명령: ${command}\n\n/workflow help 로 확인`);
    }
  });
}

export default {
  setupWorkflowCommands,
  callWorkflowAPI,
  PHASES,
  PHASE_ORDER,
};
