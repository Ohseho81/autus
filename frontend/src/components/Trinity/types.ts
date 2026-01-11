/**
 * AUTUS Trinity - Type Definitions
 */

export interface MacroDetail {
  current: string;
  target: string;
  change: string;
  related: string[];
}

export interface Macro {
  name: string;
  val: string;
  ok: boolean;
  detail?: MacroDetail;
}

export interface NodeData {
  id: string;
  name: string;
  icon: string;
  angle: number;
  goal: { v: number; d: string };
  status: { v: number; d: string };
  progress: { v: number; d: string };
  macros: Macro[];
  action: { title: string; desc: string };
}

export interface Task {
  id: string;
  text: string;
  icon: string;
  type: string;
  deadline: string;
  progress?: number;
}

export type Role = 'architect' | 'analyst' | 'worker';

export interface TrinityState {
  // Core state
  role: Role;
  selectedNode: number | null;
  selectedMacro: number | null;
  openTaskId: string | null;
  actionDone: boolean;
  
  // Data
  nodes: NodeData[];
  tasks: Record<Role, Task[]>;
  isLoading: boolean;
  isConnected: boolean;
  
  // Actions
  setRole: (role: Role) => void;
  selectNode: (idx: number | null) => void;
  selectMacro: (idx: number | null) => void;
  setOpenTaskId: (id: string | null) => void;
  setActionDone: (done: boolean) => void;
  addTask: (text: string, icon: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  completeTask: (id: string) => void;
  closeAll: () => void;
  
  // Data actions
  setNodes: (nodes: NodeData[]) => void;
  updateNode: (id: string, updates: Partial<NodeData>) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export interface HexSVGProps {
  mini: boolean;
  onNodeClick: (idx: number) => void;
}

export interface DetailPanelProps {
  onClose: () => void;
  onMacroClick: (idx: number) => void;
  onAddTask: (text: string, icon: string, type?: string) => void;
}

export interface MatrixPanelProps {
  onBack: () => void;
  onAddTask: (text: string, icon: string, type?: string) => void;
}

export interface TaskListProps {
  isMobile?: boolean;
}

export interface ForecastCardProps {
  current: string;
  maintain: string;
  improve: string;
  challenge: string;
}
