export type TabId = 'home' | 'mission' | 'trinity' | 'setup' | 'me';
export type NodeState = 'IGNORABLE' | 'PRESSURING' | 'IRREVERSIBLE';
export type LayerId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

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

export interface Circuit {
  name: string;
  ids: string[];
  value: number;
}

export interface Mission {
  id: number;
  title: string;
  type: string;
  icon: string;
  status: string;
  progress: number;
  eta: string;
  steps: { t: string; s: string }[];
}

export interface Connector {
  id: string;
  name: string;
  icon: string;
  desc: string;
  on: boolean;
}
