/**
 * Goal Coordinate Types
 * Semantic Neutrality Compliant
 */

export type TimeHorizon = "1day" | "1week" | "1month" | "1year";

export type GoalCoordinate = {
  energy: number;
  flow: number;
  risk: number;
};

export type DeltaGoal = {
  d_energy: number;
  d_flow: number;
  d_risk: number;
};

export type GoalSetRequest = {
  coordinate: GoalCoordinate;
  time_horizon: TimeHorizon;
};

export type GoalResponse = {
  goal_id: string;
  coordinate: GoalCoordinate;
  time_horizon: TimeHorizon;
  delta: DeltaGoal;
  updated_at: string;
};
