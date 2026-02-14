export interface TargetNode {
  id: string;
  name: string;
  current: number;
  target: number;
}

export interface PainBreakdown {
  financial: number;
  cognitive: number;
  temporal: number;
  emotional: number;
}

export interface CrystallizationData {
  rawDesire: string;
  targetNodes: TargetNode[];
  requiredMonths: number;
  requiredHours: number;
  feasibility: number;
  totalPain: number;
  painBreakdown: PainBreakdown;
}

export interface EnvironmentData {
  eliminated: number;
  automated: number;
  parallelized: number;
  preserved: number;
  energyEfficiency: number;
  cognitiveLeakage: number;
  friction: number;
  environmentScore: number;
}

export interface ProgressData {
  progress: number;
  currentCheckpoint: number;
  totalCheckpoints: number;
  remainingDays: number;
  remainingHours: number;
  painEndDate: string;
  uncertainty: number;
  confidence: number;
  onTrack: boolean;
  deviation: number;
}

export interface TrinityData {
  crystallization: CrystallizationData;
  environment: EnvironmentData;
  progress: ProgressData;
  actions: string[];
}

export type ColorKey = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'cyan';
