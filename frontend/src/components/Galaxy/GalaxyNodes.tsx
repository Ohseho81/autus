// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galaxy Nodes (InstancedMesh for 570 nodes)
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { useGalaxyStore } from './useGalaxyStore';
import { GALAXY_CLUSTERS, CLUSTER_MAP, VISUAL_CONFIG } from './constants';
import type { TaskNode, GalaxyCluster } from './types';

// 단일 클러스터의 노드들
interface ClusterNodesProps {
  cluster: GalaxyCluster;
  nodes: TaskNode[];
}

function ClusterNodes({ cluster, nodes }: ClusterNodesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { selectedNode, setSelectedNode, isPaused, hoveredCluster } = useGalaxyStore();
  const { camera } = useThree();
  
  // 임시 객체 (재사용)
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const tempColor = useMemo(() => new THREE.Color(), []);
  
  // 색상 배열
  const colorArray = useMemo(() => {
    return new Float32Array(nodes.length * 3);
  }, [nodes.length]);
  
  // 초기 위치 및 색상 설정
  useEffect(() => {
    if (!meshRef.current) return;
    
    const baseColor = new THREE.Color(cluster.color);
    
    nodes.forEach((node, i) => {
      // 위치 설정
      tempObject.position.copy(node.position);
      tempObject.scale.setScalar(node.size);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
      
      // 색상 설정 (상태에 따라 조정)
      let nodeColor = baseColor.clone();
      if (node.status === 'critical') {
        nodeColor = new THREE.Color('#ff4444');
      } else if (node.status === 'warning') {
        nodeColor = new THREE.Color('#ffaa44');
      } else if (node.status === 'dormant') {
        nodeColor.multiplyScalar(0.5);
      }
      
      colorArray[i * 3] = nodeColor.r;
      colorArray[i * 3 + 1] = nodeColor.g;
      colorArray[i * 3 + 2] = nodeColor.b;
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.geometry.setAttribute(
      'color',
      new THREE.InstancedBufferAttribute(colorArray, 3)
    );
  }, [nodes, cluster, tempObject, colorArray]);
  
  // 애니메이션 (공전)
  useFrame((state, delta) => {
    if (!meshRef.current || isPaused) return;
    
    const time = state.clock.elapsedTime;
    const isHovered = hoveredCluster === cluster.id;
    
    nodes.forEach((node, i) => {
      // 공전 궤도 계산
      const angle = node.orbitPhase + time * node.orbitSpeed;
      const x = cluster.centerPosition.x + Math.cos(angle) * node.orbitRadius;
      const z = cluster.centerPosition.z + Math.sin(angle) * node.orbitRadius;
      const y = cluster.centerPosition.y + Math.sin(time * 0.5 + node.orbitPhase) * 0.3;
      
      tempObject.position.set(x, y, z);
      
      // 호버 시 확대
      const scale = isHovered ? node.size * 1.3 : node.size;
      tempObject.scale.setScalar(scale);
      
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
  });
  
  // 클릭 핸들러
  const handleClick = (event: any) => {
    event.stopPropagation?.();
    const instanceId = event.instanceId;
    if (instanceId !== undefined && nodes[instanceId]) {
      setSelectedNode(nodes[instanceId], cluster);
    }
  };
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, nodes.length]}
      onClick={handleClick}
      frustumCulled={false}
    >
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={cluster.color}
        emissive={cluster.emissiveColor}
        emissiveIntensity={hoveredCluster === cluster.id ? 12 : 8}
        roughness={0.3}
        metalness={0.8}
        vertexColors
        toneMapped={false}
      />
    </instancedMesh>
  );
}

// 클러스터 레이블
interface ClusterLabelProps {
  cluster: GalaxyCluster;
}

function ClusterLabel({ cluster }: ClusterLabelProps) {
  const { hoveredCluster, setHoveredCluster, showLabels } = useGalaxyStore();
  const isHovered = hoveredCluster === cluster.id;
  
  if (!showLabels && !isHovered) return null;
  
  return (
    <Html
      position={[
        cluster.centerPosition.x,
        cluster.centerPosition.y + 4,
        cluster.centerPosition.z
      ]}
      center
      style={{
        pointerEvents: 'none',
        opacity: isHovered ? 1 : 0.7,
        transition: 'opacity 0.3s',
      }}
    >
      <div className="text-center whitespace-nowrap">
        <div 
          className="text-sm font-bold px-3 py-1 rounded-full"
          style={{
            color: cluster.color,
            backgroundColor: 'rgba(0,0,0,0.7)',
            border: `1px solid ${cluster.color}`,
            textShadow: `0 0 10px ${cluster.color}`,
          }}
        >
          {cluster.nameKo}
        </div>
        <div className="text-xs text-white/60 mt-1">
          {cluster.activeNodes}/{cluster.totalNodes} 활성
        </div>
      </div>
    </Html>
  );
}

// 클러스터 중심 구체
interface ClusterCoreProps {
  cluster: GalaxyCluster;
}

function ClusterCore({ cluster }: ClusterCoreProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { hoveredCluster, setHoveredCluster } = useGalaxyStore();
  
  // 펄스 애니메이션
  useFrame((state) => {
    if (!meshRef.current) return;
    const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 1;
    const scale = hoveredCluster === cluster.id ? 1.5 : 1;
    meshRef.current.scale.setScalar(pulse * scale);
  });
  
  return (
    <mesh
      ref={meshRef}
      position={[
        cluster.centerPosition.x,
        cluster.centerPosition.y,
        cluster.centerPosition.z
      ]}
      onPointerEnter={() => setHoveredCluster(cluster.id)}
      onPointerLeave={() => setHoveredCluster(null)}
    >
      <sphereGeometry args={[0.8, 32, 32]} />
      <meshStandardMaterial
        color={cluster.color}
        emissive={cluster.emissiveColor}
        emissiveIntensity={15}
        roughness={0.2}
        metalness={0.9}
        toneMapped={false}
      />
    </mesh>
  );
}

// 중앙 User Node
function UserNode() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const { systemState } = useGalaxyStore();
  
  // 회전 및 발광 애니메이션
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.2 + 1.2;
      glowRef.current.scale.setScalar(pulse);
    }
  });
  
  return (
    <group position={[0, 0, 0]}>
      {/* 외부 글로우 */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.5, 32, 32]} />
        <meshBasicMaterial
          color="#FFD700"
          transparent
          opacity={0.15}
          depthWrite={false}
        />
      </mesh>
      
      {/* 메인 구체 */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.5, 2]} />
        <meshStandardMaterial
          color="#FFD700"
          emissive="#FFA500"
          emissiveIntensity={20}
          roughness={0.1}
          metalness={1}
          toneMapped={false}
        />
      </mesh>
      
      {/* 레이블 */}
      <Html position={[0, 3, 0]} center>
        <div className="text-center whitespace-nowrap">
          <div 
            className="text-lg font-bold px-4 py-2 rounded-lg"
            style={{
              color: '#FFD700',
              backgroundColor: 'rgba(0,0,0,0.8)',
              border: '2px solid #FFD700',
              textShadow: '0 0 20px #FFD700',
            }}
          >
            🏛️ USER NODE
          </div>
          <div className="text-sm text-amber-400 mt-1">
            K={systemState.userNode.kValue.toFixed(2)} | {systemState.userNode.tierName}
          </div>
        </div>
      </Html>
    </group>
  );
}

// 전체 노드 시스템
export function GalaxyNodes() {
  const { nodes, clusters, initializeNodes } = useGalaxyStore();
  
  // 초기화
  useEffect(() => {
    if (nodes.length === 0) {
      initializeNodes();
    }
  }, [nodes.length, initializeNodes]);
  
  // 클러스터별 노드 그룹화
  const nodesByCluster = useMemo(() => {
    const grouped = new Map<string, TaskNode[]>();
    clusters.forEach(c => grouped.set(c.id, []));
    nodes.forEach(node => {
      const list = grouped.get(node.cluster);
      if (list) list.push(node);
    });
    return grouped;
  }, [nodes, clusters]);
  
  return (
    <group>
      {/* 중앙 User Node */}
      <UserNode />
      
      {/* 8개 클러스터 */}
      {clusters.map(cluster => {
        const clusterNodes = nodesByCluster.get(cluster.id) || [];
        return (
          <group key={cluster.id}>
            <ClusterCore cluster={cluster} />
            <ClusterNodes cluster={cluster} nodes={clusterNodes} />
            <ClusterLabel cluster={cluster} />
          </group>
        );
      })}
    </group>
  );
}
