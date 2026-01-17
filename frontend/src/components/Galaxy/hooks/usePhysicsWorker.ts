// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Physics Worker Hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback, useState } from 'react';
import type { 
  WorkerNode, 
  WorkerCluster, 
  NodePosition, 
  WorkerMessage,
  WorkerResponse 
} from '../workers/physicsWorker';

interface UsePhysicsWorkerOptions {
  enabled?: boolean;
  updateInterval?: number; // ms
}

interface UsePhysicsWorkerReturn {
  isReady: boolean;
  positions: Map<string, NodePosition>;
  collisions: { type: string; nodeIds: string[] }[];
  initialize: (nodes: WorkerNode[], clusters: WorkerCluster[]) => void;
  update: () => void;
  checkCollisions: () => void;
  terminate: () => void;
}

export function usePhysicsWorker(
  options: UsePhysicsWorkerOptions = {}
): UsePhysicsWorkerReturn {
  const { enabled = true, updateInterval = 16 } = options; // 60fps
  
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [positions, setPositions] = useState<Map<string, NodePosition>>(new Map());
  const [collisions, setCollisions] = useState<{ type: string; nodeIds: string[] }[]>([]);
  const intervalRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  
  // Worker 초기화
  useEffect(() => {
    if (!enabled) return;
    
    // Worker 생성 (인라인)
    const workerCode = `
      // Physics Worker Code
      let nodes = [];
      let clusters = [];
      let time = 0;
      
      const config = {
        zNear: -5,
        zFar: -25,
        minOrbitRadius: 3,
        maxOrbitRadius: 15,
        orbitSpeedFactor: 0.001,
        jitterAmplitude: 0.3,
        jitterThreshold: 0.3,
      };
      
      function calculateZDepth(k, omega) {
        const kFactor = Math.min(1, k / 3.0);
        const omegaPenalty = omega * 0.3;
        return config.zNear + (config.zFar - config.zNear) * (1 - kFactor + omegaPenalty);
      }
      
      function calculateOrbitRadius(urgency, k) {
        const urgencyFactor = 1 - Math.min(1, urgency);
        const kBonus = (k / 3.0) * 2;
        return config.minOrbitRadius + 
          (config.maxOrbitRadius - config.minOrbitRadius) * urgencyFactor + kBonus;
      }
      
      function calculateJitter(i, omega, t) {
        const instability = Math.max(0, config.jitterThreshold - i) + omega * 0.5;
        if (instability <= 0) return [0, 0, 0];
        
        return [
          Math.sin(t * 7.3) * instability * config.jitterAmplitude,
          Math.cos(t * 5.7) * instability * config.jitterAmplitude,
          Math.sin(t * 3.1) * instability * config.jitterAmplitude * 0.5
        ];
      }
      
      function calculateScale(k, urgency) {
        const baseScale = 0.1;
        const maxScale = 0.5;
        return baseScale + (maxScale - baseScale) * ((k / 3.0) + urgency * 0.2);
      }
      
      function calculateEmissive(k, i) {
        const baseEmissive = 3;
        const maxEmissive = 20;
        const kFactor = k / 3.0;
        const iFactor = Math.max(0, (i + 1) / 2);
        return baseEmissive + (maxEmissive - baseEmissive) * (kFactor * 0.7 + iFactor * 0.3);
      }
      
      function updatePhysics(deltaTime) {
        time += deltaTime;
        
        const clusterMap = new Map(clusters.map(c => [c.id, c]));
        const positions = [];
        
        for (const node of nodes) {
          const cluster = clusterMap.get(node.clusterId);
          if (!cluster) continue;
          
          const orbitRadius = calculateOrbitRadius(node.urgency, node.mass_k);
          const orbitSpeed = config.orbitSpeedFactor / Math.sqrt(orbitRadius);
          node.orbitPhase += orbitSpeed;
          
          const x = cluster.centerX + Math.cos(node.orbitPhase) * orbitRadius;
          const z = cluster.centerZ + Math.sin(node.orbitPhase) * orbitRadius;
          let y = cluster.centerY + Math.sin(node.orbitPhase * 0.5) * 0.5;
          
          const [jx, jy, jz] = calculateJitter(node.interaction_i, node.entropy_omega, time);
          
          positions.push({
            id: node.id,
            x: x + jx,
            y: y + jy,
            z: z + jz,
            scale: calculateScale(node.mass_k, node.urgency),
            emissive: calculateEmissive(node.mass_k, node.interaction_i),
            zDepth: calculateZDepth(node.mass_k, node.entropy_omega),
          });
        }
        
        return positions;
      }
      
      function detectCollisions() {
        const events = [];
        
        const urgentNodes = nodes.filter(n => n.urgency > 0.8);
        if (urgentNodes.length > 3) {
          events.push({ type: 'gravity_collision', nodeIds: urgentNodes.map(n => n.id) });
        }
        
        const conflictNodes = nodes.filter(n => n.interaction_i < -0.3);
        if (conflictNodes.length > 0) {
          events.push({ type: 'conflict_alert', nodeIds: conflictNodes.map(n => n.id) });
        }
        
        return events;
      }
      
      self.onmessage = (e) => {
        const { type, payload } = e.data;
        
        switch (type) {
          case 'init':
            nodes = payload.nodes;
            clusters = payload.clusters;
            time = 0;
            self.postMessage({ type: 'ready', payload: { nodeCount: nodes.length } });
            break;
          
          case 'update':
            const positions = updatePhysics(payload?.deltaTime || 1/60);
            self.postMessage({ type: 'positions', payload: positions });
            break;
          
          case 'collision':
            self.postMessage({ type: 'collisions', payload: detectCollisions() });
            break;
        }
      };
    `;
    
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    workerRef.current = new Worker(workerUrl);
    
    // 메시지 핸들러
    workerRef.current.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const { type, payload } = e.data;
      
      switch (type) {
        case 'ready':
          setIsReady(true);
          break;
        
        case 'positions':
          const posArray = payload as NodePosition[];
          setPositions(new Map(posArray.map(p => [p.id, p])));
          break;
        
        case 'collisions':
          setCollisions(payload as { type: string; nodeIds: string[] }[]);
          break;
      }
    };
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      workerRef.current?.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, [enabled]);
  
  // 초기화
  const initialize = useCallback((nodes: WorkerNode[], clusters: WorkerCluster[]) => {
    workerRef.current?.postMessage({
      type: 'init',
      payload: { nodes, clusters },
    });
  }, []);
  
  // 업데이트
  const update = useCallback(() => {
    const now = performance.now();
    const deltaTime = (now - lastUpdateRef.current) / 1000;
    lastUpdateRef.current = now;
    
    workerRef.current?.postMessage({
      type: 'update',
      payload: { deltaTime: Math.min(deltaTime, 0.1) }, // 최대 100ms
    });
  }, []);
  
  // 충돌 체크
  const checkCollisions = useCallback(() => {
    workerRef.current?.postMessage({ type: 'collision', payload: null });
  }, []);
  
  // 종료
  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setIsReady(false);
  }, []);
  
  return {
    isReady,
    positions,
    collisions,
    initialize,
    update,
    checkCollisions,
    terminate,
  };
}
