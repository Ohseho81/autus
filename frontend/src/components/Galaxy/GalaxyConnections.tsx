// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galaxy Connections (Node Links with Shader Animation)
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGalaxyStore } from './useGalaxyStore';
import { VISUAL_CONFIG, COLORS } from './constants';

// 연결선 셰이더
const connectionShader = {
  vertexShader: `
    attribute float lineProgress;
    varying float vProgress;
    varying vec3 vPosition;
    
    void main() {
      vProgress = lineProgress;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform float opacity;
    uniform bool isConflict;
    
    varying float vProgress;
    varying vec3 vPosition;
    
    void main() {
      // 에너지 흐름 효과
      float flow = sin(vProgress * 20.0 - time * 3.0) * 0.5 + 0.5;
      
      // 갈등일 때 지직거림
      float glitch = 0.0;
      if (isConflict) {
        glitch = sin(time * 50.0 + vProgress * 100.0) * 0.3;
        flow = step(0.5, fract(vProgress * 5.0 - time * 2.0));
      }
      
      float alpha = opacity * (0.3 + flow * 0.7 + glitch);
      
      // 중심이 더 밝음
      float centerGlow = 1.0 - abs(vProgress - 0.5) * 2.0;
      alpha *= (0.5 + centerGlow * 0.5);
      
      gl_FragColor = vec4(color, alpha);
    }
  `,
};

// 개별 연결선
interface ConnectionLineProps {
  sourcePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  strength: number;
  isConflict: boolean;
}

function ConnectionLine({ sourcePos, targetPos, strength, isConflict }: ConnectionLineProps) {
  const lineRef = useRef<THREE.Line | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  
  // 선 지오메트리
  const geometry = useMemo(() => {
    const points = [];
    const segments = 30;
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = THREE.MathUtils.lerp(sourcePos.x, targetPos.x, t);
      const y = THREE.MathUtils.lerp(sourcePos.y, targetPos.y, t);
      const z = THREE.MathUtils.lerp(sourcePos.z, targetPos.z, t);
      
      // 약간의 곡선 효과
      const midY = y + Math.sin(t * Math.PI) * 0.5;
      
      points.push(new THREE.Vector3(x, midY, z));
    }
    
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    
    // 진행도 속성 추가
    const progress = new Float32Array(segments + 1);
    for (let i = 0; i <= segments; i++) {
      progress[i] = i / segments;
    }
    geo.setAttribute('lineProgress', new THREE.BufferAttribute(progress, 1));
    
    return geo;
  }, [sourcePos, targetPos]);
  
  // 셰이더 머티리얼
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        color: { value: new THREE.Color(isConflict ? COLORS.conflict : COLORS.connection) },
        opacity: { value: isConflict ? VISUAL_CONFIG.conflictOpacity : VISUAL_CONFIG.connectionOpacity },
        isConflict: { value: isConflict },
      },
      vertexShader: connectionShader.vertexShader,
      fragmentShader: connectionShader.fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, [isConflict]);
  
  // 시간 업데이트
  useFrame((state) => {
    if (material.uniforms) {
      material.uniforms.time.value = state.clock.elapsedTime;
    }
  });
  
  return (
    <primitive object={new THREE.Line(geometry, material)} />
  );
}

// 중력 연결선 (User Node → Cluster)
function GravityConnections() {
  const { clusters, systemState } = useGalaxyStore();
  const linesRef = useRef<THREE.Group>(null);
  
  // 애니메이션
  useFrame((state) => {
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });
  
  return (
    <group ref={linesRef}>
      {clusters.map((cluster, i) => {
        // 중력 강도에 따른 불투명도
        const gravity = systemState.userNode.gravityScore * cluster.avgK;
        
        return (
          <ConnectionLine
            key={`gravity-${cluster.id}`}
            sourcePos={new THREE.Vector3(0, 0, 0)}
            targetPos={cluster.centerPosition}
            strength={gravity}
            isConflict={false}
          />
        );
      })}
    </group>
  );
}

// 전체 연결 시스템
export function GalaxyConnections() {
  const { connections, nodes, showConnections } = useGalaxyStore();
  
  // 노드 맵 (빠른 조회)
  const nodeMap = useMemo(() => {
    return new Map(nodes.map(n => [n.id, n]));
  }, [nodes]);
  
  if (!showConnections) return null;
  
  return (
    <group>
      {/* 중력 연결 */}
      <GravityConnections />
      
      {/* 노드 간 연결 (상위 50개만 렌더링 - 성능) */}
      {connections.slice(0, 50).map((conn, i) => {
        const source = nodeMap.get(conn.sourceId);
        const target = nodeMap.get(conn.targetId);
        
        if (!source || !target) return null;
        
        return (
          <ConnectionLine
            key={`conn-${i}`}
            sourcePos={source.position}
            targetPos={target.position}
            strength={conn.strength}
            isConflict={conn.isConflict}
          />
        );
      })}
    </group>
  );
}

// 궤도 링
export function OrbitRings() {
  const { clusters } = useGalaxyStore();
  const ringsRef = useRef<THREE.Group>(null);
  
  // 회전 애니메이션
  useFrame((state) => {
    if (ringsRef.current) {
      ringsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.05;
    }
  });
  
  return (
    <group ref={ringsRef}>
      {/* 중앙 큰 링 */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[14, 14.1, 128]} />
        <meshBasicMaterial
          color="#FFD700"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* 클러스터 궤도 링 */}
      {clusters.map((cluster, i) => {
        const angle = (i / clusters.length) * Math.PI * 2;
        
        return (
          <mesh
            key={cluster.id}
            position={[
              cluster.centerPosition.x,
              cluster.centerPosition.y,
              cluster.centerPosition.z
            ]}
            rotation={[Math.PI / 2 + Math.random() * 0.2, 0, angle]}
          >
            <ringGeometry args={[3, 3.05, 64]} />
            <meshBasicMaterial
              color={cluster.color}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}
