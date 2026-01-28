/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎬 액션 훅 (Action Hooks) - AUTUS 2.0
 * 버튼 클릭 핸들러 및 공통 액션 처리
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useCallback } from 'react';
import { useModal, ModalType } from '../modals';
import { RoleId, hasPermission } from '../config/roles';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export interface ActionHandlers {
  // Navigation Actions
  navigateToView: (view: string, params?: any) => void;
  goBack: () => void;
  
  // Modal Actions
  openCustomerList: (filter?: string, onSelect?: (customer: any) => void) => void;
  openActionCreate: (data?: any) => void;
  openCalendar: (customerId: string, customerName: string) => void;
  openMessage: (customerId: string, customerName: string) => void;
  openChurnPrevention: (customer: any) => void;
  openVoiceProcess: (voice: any) => void;
  openStrategyList: (customerId: string) => void;
  
  // Data Actions
  createAction: (actionData: any) => Promise<void>;
  updateAction: (actionId: string, updates: any) => Promise<void>;
  completeAction: (actionId: string) => Promise<void>;
  delegateAction: (actionId: string, newAssignee: string) => Promise<void>;
  postponeAction: (actionId: string, newDate: string) => Promise<void>;
  
  // Customer Actions
  scheduleConsultation: (customerId: string, datetime: string) => Promise<void>;
  sendMessage: (customerId: string, message: string, channel: string) => Promise<void>;
  processVoice: (voiceId: string, status: string, notes: string) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────

interface UseActionsOptions {
  role: RoleId;
  onNavigate?: (view: string, params?: any) => void;
  onBack?: () => void;
}

export function useActions({ role, onNavigate, onBack }: UseActionsOptions): ActionHandlers {
  const { openModal, closeModal } = useModal();

  // ───────────────────────────────────────────────────────────────────
  // Navigation Actions
  // ───────────────────────────────────────────────────────────────────
  
  const navigateToView = useCallback((view: string, params?: any) => {
    onNavigate?.(view, params);
  }, [onNavigate]);

  const goBack = useCallback(() => {
    onBack?.();
  }, [onBack]);

  // ───────────────────────────────────────────────────────────────────
  // Modal Actions
  // ───────────────────────────────────────────────────────────────────
  
  const openCustomerList = useCallback((filter?: string, onSelect?: (customer: any) => void) => {
    openModal({
      type: 'customer-list',
      data: { filter },
      onConfirm: (customer) => {
        if (onSelect) {
          onSelect(customer);
        } else {
          navigateToView('microscope', { customerId: customer.id });
        }
      },
    });
  }, [openModal, navigateToView]);

  const openActionCreate = useCallback((data?: any) => {
    if (!hasPermission(role, 'canCreateAction')) {
      console.warn('No permission to create action');
      return;
    }
    
    openModal({
      type: 'action-create',
      data,
      onConfirm: async (actionData) => {
        await createAction(actionData);
        navigateToView('actions');
      },
    });
  }, [openModal, role, navigateToView]);

  const openCalendar = useCallback((customerId: string, customerName: string) => {
    openModal({
      type: 'calendar',
      data: { customerId, customerName },
      onConfirm: async (datetime) => {
        await scheduleConsultation(customerId, datetime);
      },
    });
  }, [openModal]);

  const openMessage = useCallback((customerId: string, customerName: string) => {
    openModal({
      type: 'message',
      data: { customerId, customerName },
      onConfirm: async (result) => {
        if (result === 'call') {
          // Handle call
          console.log('Initiating call to', customerId);
        } else {
          await sendMessage(customerId, result, 'kakao');
        }
      },
    });
  }, [openModal]);

  const openChurnPrevention = useCallback((customer: any) => {
    openModal({
      type: 'churn-prevent',
      data: {
        customerId: customer.id,
        customerName: customer.name,
        temperature: customer.temperature,
        churnProbability: customer.churnProbability,
      },
      onConfirm: async (strategy) => {
        // Create action based on strategy
        await createAction({
          title: `이탈 방지: ${customer.name}`,
          priority: 'urgent',
          customerId: customer.id,
          strategy,
        });
      },
    });
  }, [openModal]);

  const openVoiceProcess = useCallback((voice: any) => {
    openModal({
      type: 'voice-process',
      data: voice,
      onConfirm: async ({ status, notes, voiceId }) => {
        await processVoice(voiceId, status, notes);
      },
    });
  }, [openModal]);

  const openStrategyList = useCallback((customerId: string) => {
    openModal({
      type: 'strategy-list',
      data: { customerId },
      onConfirm: async (strategy) => {
        await createAction({
          title: strategy.name,
          customerId,
          strategy: strategy.id,
          priority: 'high',
        });
        navigateToView('actions');
      },
    });
  }, [openModal, navigateToView]);

  // ───────────────────────────────────────────────────────────────────
  // Data Actions (API calls - mock for now)
  // ───────────────────────────────────────────────────────────────────
  
  const createAction = useCallback(async (actionData: any) => {
    console.log('Creating action:', actionData);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
  }, []);

  const updateAction = useCallback(async (actionId: string, updates: any) => {
    console.log('Updating action:', actionId, updates);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
  }, []);

  const completeAction = useCallback(async (actionId: string) => {
    console.log('Completing action:', actionId);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
  }, []);

  const delegateAction = useCallback(async (actionId: string, newAssignee: string) => {
    console.log('Delegating action:', actionId, 'to', newAssignee);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
  }, []);

  const postponeAction = useCallback(async (actionId: string, newDate: string) => {
    console.log('Postponing action:', actionId, 'to', newDate);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
  }, []);

  const scheduleConsultation = useCallback(async (customerId: string, datetime: string) => {
    console.log('Scheduling consultation:', customerId, datetime);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
  }, []);

  const sendMessage = useCallback(async (customerId: string, message: string, channel: string) => {
    console.log('Sending message:', customerId, message, channel);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
  }, []);

  const processVoice = useCallback(async (voiceId: string, status: string, notes: string) => {
    console.log('Processing voice:', voiceId, status, notes);
    // TODO: API call
    await new Promise(r => setTimeout(r, 500));
  }, []);

  return {
    navigateToView,
    goBack,
    openCustomerList,
    openActionCreate,
    openCalendar,
    openMessage,
    openChurnPrevention,
    openVoiceProcess,
    openStrategyList,
    createAction,
    updateAction,
    completeAction,
    delegateAction,
    postponeAction,
    scheduleConsultation,
    sendMessage,
    processVoice,
  };
}

export default useActions;
