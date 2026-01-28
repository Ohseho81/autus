/**
 * AUTUS Hooks
 * ===========
 * 
 * 커스텀 React Hooks
 */

export { useZoomNavigation } from './useZoomNavigation';
export { useAuth, type User, type AuthState } from './useAuth';
export { useLearning, type ROFScore, type Recommendation, type LearningSource } from './useLearning';
export { useClusters } from './useClusters';
export { useFlowAnimation, useFlowParticles, interpolatePosition, formatAmount } from './useFlow';
export { useLocalData } from './useLocalData';
export { useMapData } from './useMapData';
export { useOptimizedSelector } from './useOptimizedSelector';
export { usePathFinder } from './usePathFinder';
export { useScale } from './useScale';
export { useViewportLoading } from './useViewportLoading';

// WebSocket & Theme (v7.0)
export { useWebSocket, useGraphWebSocket } from './useWebSocket';
export { useTheme } from './useTheme';

// Responsive & Form (v8.0)
export {
  useMediaQuery,
  useBreakpoint,
  useDeviceType,
  useOrientation,
  useResponsiveValue,
  useLayout,
  useTouchDevice,
  useScrollDirection,
  useViewportSize,
  useSafeAreaInsets,
  useResponsiveContainer,
} from './useResponsive';

// Accessibility Hooks (v9.0 - Role-Based UI)
export {
  useReducedMotion,
  useFocusTrap,
  useFocusReturn,
  useAnnounce,
  useKeyboardNavigation,
  useRovingTabIndex,
  useEscapeKey,
  useHighContrast,
  useFontScale,
  useSetFontScale,
  useRoleAccessibility,
  useSkipLink,
  useLiveRegion,
  useAccessibleDialog,
  useAccessibleTabs,
} from './useAccessibility';

// Academy Data Hooks (autus-ai.com 연동)
export {
  useAcademyData,
  useStudents,
  useRisks,
  useGoals,
  useLeaderboard,
  useRewards,
} from './useAcademyData';

export {
  useForm,
  emailPattern,
  phonePattern,
  urlPattern,
} from './useForm';

// K/I Physics Hooks (v4.0)
export {
  useEntityState,
  useNodes48,
  useSlots144,
  usePrediction,
  useKIHistory,
  useCalculateKI,
  useAutomationTasks,
  useApproveTask,
  useRejectTask,
  useAutomationPhases,
  useAlerts,
  useAcknowledgeAlert,
  usePhaseInfo,
  useRelationTypes,
  useDashboard,
  useRealtimeKI,
  kiQueryKeys,
} from './useKI';

export type {
  UseEntityStateOptions,
} from './useKI';

// K/I Physics Hooks v2 (from autus_api_integration - 완전 버전)
export {
  useEntityState as useEntityStateV2,
  useEntityStateHistory,
  useNodes48 as useNodes48V2,
  useNodeDetail,
  useUpdateNode,
  useSlots144 as useSlots144V2,
  useSlotDetail,
  useUpdateSlot,
  usePrediction as usePredictionV2,
  useAutomationTasks as useAutomationTasksV2,
  useApproveTask as useApproveTaskV2,
  useExecuteTask,
  useAlerts as useAlertsV2,
  useAcknowledgeAlert as useAcknowledgeAlertV2,
  useResolveAlert,
  useRealtimeKI as useRealtimeKIV2,
  useCalculateKI as useCalculateKIV2,
  useNodesMeta,
  useSlotsMeta,
  usePhasesMeta,
  useDashboardData,
  kiQueryKeys as kiQueryKeysV2,
} from './useKIv2';

export type {
  KIState as KIStateV2,
  Node48Value,
  Nodes48Response,
  Slot144Value,
  Slots144Response,
  TrajectoryPoint,
  PredictionResponse as PredictionResponseV2,
  AutomationTask as AutomationTaskV2,
  Alert as AlertV2,
  Phase,
  NodeType,
  Meta,
  Domain,
  Trend,
  FillStatus,
  TaskStage,
  TaskStatus as TaskStatusV2,
  Severity,
  RiskLevel,
} from './useKIv2';
