/**
 * AUTUS 72³ Virtual Data Generator
 */

import type { Node72, NodeState, Motion, HRState, Phenomenon } from './types';
import { CODEBOOK } from './types';
import { cubeInterpreter, DOMAIN_PHYSICS } from '../../../engine/CubeInterpreter';

// ===================================================================
// Axis Interpreters
// ===================================================================

export function getWhoCategory(x: number) {
  if (x < 24) return { ...CODEBOOK.WHO.T, key: 'T' };
  if (x < 48) return { ...CODEBOOK.WHO.B, key: 'B' };
  return { ...CODEBOOK.WHO.L, key: 'L' };
}

export function getWhatCategory(y: number) {
  const domains = ['BIO', 'CAPITAL', 'NETWORK', 'KNOWLEDGE', 'TIME', 'EMOTION'];
  const idx = Math.floor(y / 12);
  const key = domains[idx] || 'BIO';
  return { ...(CODEBOOK.WHAT as any)[key], key };
}

export function getHowCategory(z: number) {
  const domains = ['BIO', 'CAPITAL', 'NETWORK', 'KNOWLEDGE', 'TIME', 'EMOTION'];
  const idx = Math.floor(z / 12);
  const key = domains[idx] || 'BIO';
  return { ...(CODEBOOK.HOW as any)[key], key };
}

// ===================================================================
// Virtual Data Generator (72³ 통합)
// ===================================================================

export class VirtualDataGenerator {
  private phenomena: Map<string, Phenomenon> = new Map();

  private key(node: Node72): string {
    return `${node.x}-${node.y}-${node.z}`;
  }

  private getInterpretation(node: Node72) {
    const interpreted = cubeInterpreter.interpret([node.x, node.y, node.z]);
    const resonance = cubeInterpreter.calculateResonance([node.x, node.y, node.z]);

    return {
      nodeId: interpreted.node.id,
      nodeName: interpreted.node.name,
      nodeCategory: interpreted.node.category,
      motionId: interpreted.motion.id,
      motionName: interpreted.motion.name,
      motionDomain: interpreted.motion.node,
      workId: interpreted.work.id,
      workName: interpreted.work.name,
      workDomain: interpreted.work.domain,
      resonance,
    };
  }

  generate(count: number = 500): Phenomenon[] {
    for (let i = 0; i < count; i++) {
      const node: Node72 = {
        x: Math.floor(Math.random() * 72),
        y: Math.floor(Math.random() * 72),
        z: Math.floor(Math.random() * 72),
      };

      const k = this.key(node);
      const existing = this.phenomena.get(k);

      // 도메인별 물리 상수 적용
      const whatDomain = getWhatCategory(node.y).key;
      const physics = DOMAIN_PHYSICS[whatDomain] || DOMAIN_PHYSICS.CAPITAL;

      // Motion 계산 (도메인별 특성 반영)
      const velocity = Math.random() * 0.8 * physics.acceleration;
      const acceleration = (Math.random() - 0.5) * 0.4 * physics.acceleration;
      const inertia = existing
        ? Math.min(1, existing.motion.inertia + Math.random() * 0.1 * physics.inertia)
        : Math.random() * 0.5 * physics.inertia;
      const cpd = acceleration > 0.2 || velocity > 0.7;

      const motion: Motion = { velocity, acceleration, inertia, cpd };

      // HR State 계산
      const workload = 0.3 + velocity * 0.4 + inertia * 0.3;
      const relation_density = whatDomain === 'NETWORK' ? 0.8 :
                               whatDomain === 'EMOTION' ? 0.6 : 0.3;
      const exit_risk = workload * 0.4 + (1 - relation_density) * 0.3 + inertia * 0.3;

      const hr: HRState = {
        workload: Math.min(1, workload),
        relation_density,
        exit_risk: Math.min(1, exit_risk)
      };

      // State 분류
      const criticalScore = motion.inertia * hr.exit_risk;
      const state: NodeState = criticalScore > 0.4 ? 'CRITICAL' :
                               (cpd || criticalScore > 0.25) ? 'TENSION' : 'NORMAL';

      // Attention Score
      const stateValue = state === 'CRITICAL' ? 1 : state === 'TENSION' ? 0.5 : 0;
      const attention_score = stateValue * 0.4 + inertia * 0.3 + exit_risk * 0.3;

      // 72³ 해석
      const interpretation = this.getInterpretation(node);

      this.phenomena.set(k, {
        node, state, motion, hr, attention_score, interpretation
      });
    }

    // 일부 노드를 강제로 CRITICAL로
    const keys = Array.from(this.phenomena.keys());
    for (let i = 0; i < Math.min(10, keys.length * 0.05); i++) {
      const randomKey = keys[Math.floor(Math.random() * keys.length)];
      const p = this.phenomena.get(randomKey)!;
      p.state = 'CRITICAL';
      p.motion.inertia = 0.8 + Math.random() * 0.2;
      p.hr.exit_risk = 0.7 + Math.random() * 0.3;
      p.attention_score = 0.8 + Math.random() * 0.2;
    }

    return Array.from(this.phenomena.values());
  }

  applyAction(node: Node72, actionType: keyof typeof CODEBOOK.ACTION_FORCE): Phenomenon | null {
    const k = this.key(node);
    const p = this.phenomena.get(k);
    if (!p) return null;

    const force = CODEBOOK.ACTION_FORCE[actionType];
    p.hr.workload = Math.max(0, p.hr.workload + force.workload);
    p.hr.exit_risk = Math.max(0, p.hr.exit_risk + force.exit_risk);

    // 재분류
    const criticalScore = p.motion.inertia * p.hr.exit_risk;
    p.state = criticalScore > 0.4 ? 'CRITICAL' :
              (p.motion.cpd || criticalScore > 0.25) ? 'TENSION' : 'NORMAL';

    const stateValue = p.state === 'CRITICAL' ? 1 : p.state === 'TENSION' ? 0.5 : 0;
    p.attention_score = stateValue * 0.4 + p.motion.inertia * 0.3 + p.hr.exit_risk * 0.3;

    return p;
  }
}
