/**
 * AUTUS SimBuffer v1.0
 * 관리자 Force 주입 → Forecast 계산
 * RealShadowState 직접 변경 금지!
 */

import { TwinState, clamp01 } from './TwinState';

export type ForceInput = {
  deltaE: number;   // Energy force
  deltaR: number;   // Resistance force
  deltaT: number;   // Time force
  deltaQ: number;   // Quality force
  deltaMu: number;  // Coupling force
};

export class SimBuffer {
  private realState: TwinState;
  private simState: TwinState;
  private forceHistory: ForceInput[] = [];

  constructor(initialState: TwinState) {
    this.realState = { ...initialState };
    this.simState = { ...initialState };
  }

  // 현실 상태 업데이트 (외부 데이터 수신)
  updateRealState(state: Partial<TwinState>): void {
    this.realState = { ...this.realState, ...state };
    // Sim은 Real 기반으로 리셋
    this.resetSim();
  }

  // 시뮬레이션 리셋
  resetSim(): void {
    this.simState = { ...this.realState };
    this.forceHistory = [];
  }

  // Force 주입 (시뮬레이션만 변경)
  applyForce(force: ForceInput): TwinState {
    this.forceHistory.push(force);

    // Force → State 계산
    this.simState.E = clamp01(this.simState.E + force.deltaE * 0.1);
    this.simState.R = clamp01(this.simState.R + force.deltaR * 0.1);
    this.simState.T = clamp01(this.simState.T + force.deltaT * 0.1);
    this.simState.Q = clamp01(this.simState.Q + force.deltaQ * 0.1);
    this.simState.mu = clamp01(this.simState.mu + force.deltaMu * 0.1);

    // VOL/SHOCK 자동 계산
    const totalForce = Math.abs(force.deltaE) + Math.abs(force.deltaR) + 
                       Math.abs(force.deltaT) + Math.abs(force.deltaQ) + 
                       Math.abs(force.deltaMu);
    this.simState.VOL = clamp01(this.simState.VOL + totalForce * 0.05);
    this.simState.SHOCK = clamp01(this.simState.SHOCK + (totalForce > 0.5 ? 0.1 : -0.02));

    return this.simState;
  }

  // 상태 조회
  getRealState(): TwinState { return { ...this.realState }; }
  getSimState(): TwinState { return { ...this.simState }; }
  getForceHistory(): ForceInput[] { return [...this.forceHistory]; }

  // Forecast 계산 (T+N steps)
  forecast(steps: number = 30): TwinState[] {
    const forecasts: TwinState[] = [];
    let current = { ...this.simState };

    for (let i = 0; i < steps; i++) {
      // 자연 감쇠/증가 시뮬레이션
      current = {
        ...current,
        time: current.time + 1,
        E: clamp01(current.E * 0.99 + 0.001),
        R: clamp01(current.R * 0.98),
        T: clamp01(current.T * 0.97),
        Q: clamp01(current.Q * 0.995 + 0.002),
        mu: clamp01(current.mu * 0.99),
        VOL: clamp01(current.VOL * 0.95),
        SHOCK: clamp01(current.SHOCK * 0.9)
      };
      forecasts.push({ ...current });
    }

    return forecasts;
  }
}
