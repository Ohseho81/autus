/**
 * 🔒 useContract Hook
 *
 * UI 컴포넌트에서 계약 규칙을 적용하기 위한 훅
 *
 * 사용법:
 * const { canDo, getGate, getCost, executeWithContract } = useContract();
 *
 * // C1: 버튼 표시 여부
 * {canDo('student.quit') && <Button>퇴원</Button>}
 *
 * // C3: 게이트 정보
 * const gate = getGate('payment.approve');
 * {gate.requiresApproval && <ApprovalBadge />}
 *
 * // C4: 비용 표시
 * const cost = getCost('student.quit', { baseAmount: 500000 });
 * <Text>환불 수수료: {cost.amount}원</Text>
 */

import { useCallback, useMemo } from 'react';
import { useStore } from '../store.jsx';
import {
  canTransition,
  checkGate,
  calculateLockInCost,
  autoAssignLiability,
  checkInsuranceTriggers,
  createEvidence,
  canPerformAction,
  ROLE_PERMISSIONS,
} from './rules.js';

export function useContract() {
  const { state, actions, dispatch } = useStore();

  /**
   * C1: 액션 수행 가능 여부 (버튼 표시 결정)
   */
  const canDo = useCallback((action, context = {}) => {
    const role = state.currentRole;
    if (!role) return false;

    // 역할 기반 권한 확인
    if (!canPerformAction(role, action)) {
      return false;
    }

    // 상태 전이 확인 (category.action 형태인 경우)
    if (action.includes('.') && context.currentStatus) {
      const [category, targetStatus] = action.split('.');
      if (!canTransition(category, context.currentStatus, targetStatus)) {
        return false;
      }
    }

    return true;
  }, [state.currentRole]);

  /**
   * C3: 게이트 정보 가져오기
   */
  const getGate = useCallback((action, context = {}) => {
    const fullContext = {
      ...context,
      currentRole: state.currentRole,
      currentUser: state.currentUser,
    };

    return checkGate(action, fullContext);
  }, [state.currentRole, state.currentUser]);

  /**
   * C4: 비용 정보 가져오기
   */
  const getCost = useCallback((action, context = {}) => {
    return calculateLockInCost(action, context);
  }, []);

  /**
   * C5 + C2 + C6: 계약 적용하여 액션 실행
   */
  const executeWithContract = useCallback(async (action, context, executor) => {
    const startTime = Date.now();
    const beforeState = { ...context };

    // 1. C1 확인 - 액션 가능 여부
    if (!canDo(action, context)) {
      console.warn(`[Contract] Action blocked: ${action} - Not allowed for role ${state.currentRole}`);
      return {
        success: false,
        error: 'ACTION_NOT_ALLOWED',
        message: `이 액션은 ${state.currentRole} 역할에서 수행할 수 없습니다.`,
      };
    }

    // 2. C3 확인 - 게이트 통과
    const gateResult = getGate(action, context);
    if (!gateResult.allowed) {
      console.warn(`[Contract] Gate blocked: ${action} - ${gateResult.reason}`);

      // 승인 필요한 경우 승인 요청 생성
      if (gateResult.requiresApproval) {
        actions.addApproval({
          type: action,
          title: `${action} 승인 요청`,
          context,
          requestedBy: state.currentUser?.id,
          requiredApprover: gateResult.gate.approver,
        });

        return {
          success: false,
          error: 'APPROVAL_REQUIRED',
          message: `${gateResult.gate.approver} 승인이 필요합니다.`,
          approvalCreated: true,
        };
      }

      return {
        success: false,
        error: 'GATE_BLOCKED',
        message: gateResult.reason,
      };
    }

    // 3. C4 확인 - 비용 계산
    const lockInCost = getCost(action, context);
    if (lockInCost && !context.costAccepted) {
      console.log(`[Contract] Lock-in cost: ${action}`, lockInCost);
      return {
        success: false,
        error: 'COST_CONFIRMATION_REQUIRED',
        message: `${lockInCost.description}: ${lockInCost.amount?.toLocaleString() || lockInCost.rate * 100 + '%'}`,
        cost: lockInCost,
      };
    }

    // 4. 실제 액션 실행
    let result;
    try {
      result = await executor();
    } catch (error) {
      console.error(`[Contract] Execution error: ${action}`, error);

      // C5: 에러도 증빙 기록
      const errorEvidence = createEvidence(action, {
        ...context,
        currentUser: state.currentUser,
        currentRole: state.currentRole,
      }, {
        success: false,
        error: error.message,
        afterState: beforeState,
      });
      actions.logEvent({ type: 'EVIDENCE', data: errorEvidence });

      return {
        success: false,
        error: 'EXECUTION_ERROR',
        message: error.message,
      };
    }

    // 5. C2: 책임 자동 분기
    const liability = autoAssignLiability({
      category: action.split('.')[0],
      action: action.split('.')[1],
      reason: context.reason,
    }, context);

    if (liability) {
      console.log(`[Contract] Liability assigned: ${action}`, liability);
      actions.logEvent({ type: 'LIABILITY_ASSIGNED', data: liability });
    }

    // 6. C6: 보험/보증 트리거 확인
    const triggers = checkInsuranceTriggers({
      category: action.split('.')[0],
      type: context.type,
    }, context);

    if (triggers.length > 0) {
      console.log(`[Contract] Insurance triggers: ${action}`, triggers);
      for (const trigger of triggers) {
        actions.logEvent({ type: 'INSURANCE_TRIGGER', data: trigger });
        // 알림 발송
        if (trigger.notify) {
          // TODO: 실제 알림 발송
          console.log(`[Contract] Notify: ${trigger.notify.join(', ')}`);
        }
      }
    }

    // 7. C5: 증빙 생성
    const evidence = createEvidence(action, {
      ...context,
      currentUser: state.currentUser,
      currentRole: state.currentRole,
      beforeState,
    }, {
      success: true,
      afterState: result,
      gate: gateResult.gate,
      lockInCost,
      liability,
      triggers,
    });

    actions.logEvent({ type: 'EVIDENCE', data: evidence });
    console.log(`[Contract] Evidence created: ${evidence.id}`, evidence);

    return {
      success: true,
      result,
      evidence,
      liability,
      triggers,
      lockInCost,
      executionTime: Date.now() - startTime,
    };
  }, [state.currentRole, state.currentUser, canDo, getGate, getCost, actions]);

  /**
   * 역할별 권한 정보
   */
  const permissions = useMemo(() => {
    return ROLE_PERMISSIONS[state.currentRole] || {};
  }, [state.currentRole]);

  /**
   * 현재 상태에서 가능한 액션 목록
   */
  const getAvailableActions = useCallback((category, currentStatus) => {
    const role = state.currentRole;
    if (!role) return [];

    const rolePerms = ROLE_PERMISSIONS[role];
    if (!rolePerms) return [];

    // 모든 가능한 액션 수집
    const actions = [];

    // 상태 전이 액션
    const transitions = require('./rules.js').ALLOWED_TRANSITIONS[category]?.[currentStatus] || [];
    for (const target of transitions) {
      const action = `${category}.${target}`;
      if (canPerformAction(role, `decide.${target}`) || canPerformAction(role, `request.${target}`)) {
        actions.push({
          action,
          target,
          canDecide: canPerformAction(role, `decide.${target}`),
          canRequest: canPerformAction(role, `request.${target}`),
          gate: checkGate(action, { currentRole: role }),
          cost: calculateLockInCost(action, {}),
        });
      }
    }

    return actions;
  }, [state.currentRole]);

  return {
    // C1: 액션 가능 여부
    canDo,

    // C3: 게이트 정보
    getGate,

    // C4: 비용 정보
    getCost,

    // C5 + C2 + C6: 계약 적용 실행
    executeWithContract,

    // 유틸리티
    permissions,
    getAvailableActions,

    // 현재 상태
    currentRole: state.currentRole,
    currentUser: state.currentUser,
  };
}

export default useContract;
