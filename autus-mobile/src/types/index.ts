/**
 * AUTUS Mobile - Type Definitions
 */

export type LayerId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type NodeState = 'IGNORABLE' | 'PRESSURING' | 'IRREVERSIBLE';
export type MissionType = '자동화' | '외주' | '지시';
export type MissionStatus = 'active' | 'done' | 'ignored';

export interface Node {
  id: string;
  name: string;
  icon: string;
  layer: LayerId;
  active: boolean;
  value: number;
  pressure: number;
  state: NodeState;
}

export interface Layer {
  id: LayerId;
  name: string;
  icon: string;
  nodeIds: string[];
}

export interface Circuit {
  id: string;
  name: string;
  nameKr: string;
  nodeIds: string[];
  value: number;
}

export interface MissionStep {
  t: string;
  s: 'done' | 'active' | '';
}

export interface Mission {
  id: number;
  title: string;
  type: MissionType;
  icon: string;
  status: MissionStatus;
  progress: number;
  eta: string;
  nodeId: string;
  steps: MissionStep[];
  createdAt: string;
}

export interface Connector {
  id: string;
  name: string;
  icon: string;
  desc: string;
  on: boolean;
}

export interface Device {
  id: string;
  name: string;
  icon: string;
  desc: string;
  on: boolean;
}

export interface WebService {
  id: string;
  name: string;
  icon: string;
  desc: string;
  on: boolean;
}

export interface TeamMember {
  id: number;
  name: string;
  role: string;
}

export interface Identity {
  type: string;
  stage: string;
  industry: string;
}

export interface Boundaries {
  never: string[];
  limits: string[];
}

export interface Settings {
  goal: string;
  goalMonths: number;
  identity: Identity;
  values: string[];
  boundaries: Boundaries;
  dailyLimit: number;
  autoLevel: 0 | 1 | 2 | 3 | 4;
}

export interface AppState {
  nodes: Record<string, Node>;
  missions: Mission[];
  connectors: Connector[];
  devices: Device[];
  webServices: WebService[];
  settings: Settings;
  team: TeamMember[];
  
  // Actions
  setNodes: (nodes: Record<string, Node>) => void;
  toggleNode: (id: string) => void;
  updateNodePressure: (id: string, pressure: number) => void;
  
  addMission: (mission: Omit<Mission, 'id' | 'createdAt'>) => void;
  updateMission: (id: number, updates: Partial<Mission>) => void;
  deleteMission: (id: number) => void;
  
  toggleConnector: (id: string) => void;
  toggleDevice: (id: string) => void;
  toggleWebService: (id: string) => void;
  connectAllWebServices: () => void;
  
  updateSettings: (settings: Partial<Settings>) => void;
  
  addTeamMember: (member: Omit<TeamMember, 'id'>) => void;
  removeTeamMember: (id: number) => void;
  
  resetAll: () => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

export type TabId = 'home' | 'mission' | 'trinity' | 'setup' | 'me';
export type NodeFilter = 'active' | 'all' | 'danger';
export type MissionFilter = 'active' | 'done' | 'ignored';
