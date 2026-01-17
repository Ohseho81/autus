/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 36 Node Canvas (Three.js / React Three Fiber)
 * 고해상도 3D 노드 클러스터 시각화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useNodeStore, NodeData, selectActiveNodes, selectEliminationCandidates } from '../../stores/nodeStore';

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const DOMAIN_COLORS: Record<string, string> = {
  'FIN': '#22c55e',    // 녹색
  'HR': '#3b82f6',     // 파랑
  'SAL': '#f59e0b',    // 주황
  'MKT': '#ec4899',    // 핑크
  'OPS': '#8b5cf6',    // 보라
  'IT': '#06b6d4',     // 청록
  'LEG': '#64748b',    // 회색
  'R&D': '#f43f5e',    // 빨강
  'CS': '#84cc16',     // 라임
  'LOG': '#a855f7',    // 자주
  'QA': '#14b8a6',     // 틸
  'ADMIN': '#6b7280',  // 회색
};

// ═══════════════════════════════════════════════════════════════════════════════
// Single Node Component
// ═══════════════════════════════════════════════════════════════════════════════

interface NodeSphereProps {
  node: NodeData;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}

function NodeSphere({ node, isSelected, isHovered, onSelect, onHover }: NodeSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  
  const color = DOMAIN_COLORS[node.domain] || '#ffffff';
  const isEliminationCandidate = node.automationLevel >= 0.95;
  const isEliminated = node.status === 'eliminated' || node.status === 'merged';
  
  // 크기: K 값에 비례
  const baseSize = 0.3 + node.k * 0.2;
  const size = isSelected ? baseSize * 1.3 : isHovered ? baseSize * 1.15 : baseSize;
  
  // 애니메이션
  useFrame((state) => {
    if (!meshRef.current) return;
    
    // 호흡 애니메이션
    const breath = Math.sin(state.clock.elapsedTime * 2 + node.position.x) * 0.02;
    meshRef.current.scale.setScalar(size + breath);
    
    // 삭제 대상은 빨간색으로 펄스
    if (isEliminationCandidate && glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.5 + 0.5;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity = 0.3 + pulse * 0.3;
    }
    
    // 제거된 노드는 투명하게
    if (isEliminated) {
      (meshRef.current.material as THREE.MeshStandardMaterial).opacity = 0.2;
    }
  });
  
  if (isEliminated) return null;
  
  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      {/* Glow effect for elimination candidates */}
      {isEliminationCandidate && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[size * 1.5, 16, 16]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.3} />
        </mesh>
      )}
      
      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={onSelect}
        onPointerOver={() => onHover(true)}
        onPointerOut={() => onHover(false)}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.5 : isHovered ? 0.3 : 0.1}
          metalness={0.3}
          roughness={0.4}
          transparent={isEliminated}
          opacity={isEliminated ? 0.2 : 1}
        />
      </mesh>
      
      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[size * 1.5, 0.02, 8, 32]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
      
      {/* Label */}
      {(isSelected || isHovered) && (
        <Html distanceFactor={10} position={[0, size + 0.3, 0]}>
          <div className="bg-slate-900/90 px-2 py-1 rounded text-white text-xs whitespace-nowrap border border-slate-700">
            <div className="font-bold">{node.code}</div>
            <div className="text-slate-400">{node.name}</div>
            <div className="flex gap-2 mt-1 text-[10px]">
              <span className="text-green-400">K:{node.k.toFixed(2)}</span>
              <span className="text-blue-400">I:{node.i.toFixed(2)}</span>
              <span className="text-purple-400">A:{(node.automationLevel * 100).toFixed(0)}%</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Connection Lines
// ═══════════════════════════════════════════════════════════════════════════════

function ConnectionLines() {
  const connections = useNodeStore(state => state.connections);
  const nodes = useNodeStore(state => state.nodes);
  
  return (
    <group>
      {connections.map(conn => {
        const source = nodes[conn.source];
        const target = nodes[conn.target];
        
        if (!source || !target) return null;
        if (source.status !== 'active' || target.status !== 'active') return null;
        
        const points = [
          new THREE.Vector3(source.position.x, source.position.y, source.position.z),
          new THREE.Vector3(target.position.x, target.position.y, target.position.z),
        ];
        
        return (
          <Line
            key={conn.id}
            points={points}
            color={conn.type === 'merge' ? '#ff0000' : '#334155'}
            lineWidth={conn.strength * 2}
            transparent
            opacity={0.3}
          />
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Central Black Hole (for elimination)
// ═══════════════════════════════════════════════════════════════════════════════

function BlackHole({ active }: { active: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += 0.01;
    
    if (active) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
  });
  
  if (!active) return null;
  
  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshBasicMaterial color="#000000" />
      {/* Event horizon glow */}
      <mesh>
        <torusGeometry args={[0.7, 0.1, 8, 32]} />
        <meshBasicMaterial color="#8b5cf6" transparent opacity={0.5} />
      </mesh>
    </mesh>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scene
// ═══════════════════════════════════════════════════════════════════════════════

function Scene() {
  const nodes = useNodeStore(state => state.nodes);
  const selectedNodeId = useNodeStore(state => state.selectedNodeId);
  const hoveredNodeId = useNodeStore(state => state.hoveredNodeId);
  const selectNode = useNodeStore(state => state.selectNode);
  const hoverNode = useNodeStore(state => state.hoverNode);
  const eliminationCandidates = useNodeStore(selectEliminationCandidates);
  
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#8b5cf6" />
      
      {/* Nodes */}
      {Object.values(nodes).map(node => (
        <NodeSphere
          key={node.id}
          node={node}
          isSelected={selectedNodeId === node.id}
          isHovered={hoveredNodeId === node.id}
          onSelect={() => selectNode(node.id)}
          onHover={(hovered) => hoverNode(hovered ? node.id : null)}
        />
      ))}
      
      {/* Connections */}
      <ConnectionLines />
      
      {/* Black Hole */}
      <BlackHole active={eliminationCandidates.length > 0} />
      
      {/* Grid Helper */}
      <gridHelper args={[20, 20, '#1e293b', '#0f172a']} position={[0, -6, 0]} />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export function NodeCluster3D() {
  const initializeNodes = useNodeStore(state => state.initializeNodes);
  const stats = useNodeStore(state => state.stats);
  const selectedNodeId = useNodeStore(state => state.selectedNodeId);
  const nodes = useNodeStore(state => state.nodes);
  const eliminateNode = useNodeStore(state => state.eliminateNode);
  const eliminationCandidates = useNodeStore(selectEliminationCandidates);
  
  useEffect(() => {
    initializeNodes();
  }, [initializeNodes]);
  
  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : null;
  
  return (
    <div className="w-full h-full bg-slate-900 relative">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 5, 12], fov: 60 }}>
        <Scene />
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={30}
        />
      </Canvas>
      
      {/* Stats Overlay */}
      <div className="absolute top-4 left-4 bg-slate-800/90 rounded-lg p-4 border border-slate-700">
        <h3 className="text-white font-bold mb-2">36 Node Cluster</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Active Nodes</span>
            <span className="text-green-400 font-mono">{stats.activeNodes}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Eliminated</span>
            <span className="text-red-400 font-mono">{stats.eliminatedNodes}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Avg K</span>
            <span className="text-cyan-400 font-mono">{stats.avgK.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Avg Automation</span>
            <span className="text-purple-400 font-mono">{(stats.avgAutomation * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
      
      {/* Elimination Panel */}
      {eliminationCandidates.length > 0 && (
        <div className="absolute top-4 right-4 bg-red-900/90 rounded-lg p-4 border border-red-700 max-w-xs">
          <h3 className="text-red-400 font-bold mb-2">삭제 대상 ({eliminationCandidates.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {eliminationCandidates.map(node => (
              <div key={node.id} className="flex justify-between items-center text-sm">
                <span className="text-white">{node.code}</span>
                <button
                  onClick={() => eliminateNode(node.id)}
                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 rounded text-white text-xs"
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Selected Node Detail */}
      {selectedNode && (
        <div className="absolute bottom-4 left-4 bg-slate-800/90 rounded-lg p-4 border border-slate-700 w-80">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-white font-bold">{selectedNode.code}</h3>
              <p className="text-slate-400 text-sm">{selectedNode.name}</p>
            </div>
            <span 
              className="px-2 py-0.5 rounded text-xs font-medium"
              style={{ backgroundColor: DOMAIN_COLORS[selectedNode.domain] + '40', color: DOMAIN_COLORS[selectedNode.domain] }}
            >
              {selectedNode.domain}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-slate-700/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-green-400">{selectedNode.k.toFixed(2)}</div>
              <div className="text-xs text-slate-400">K-Value</div>
            </div>
            <div className="bg-slate-700/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-blue-400">{selectedNode.i.toFixed(2)}</div>
              <div className="text-xs text-slate-400">I-Value</div>
            </div>
            <div className="bg-slate-700/50 rounded p-2 text-center">
              <div className="text-lg font-bold text-purple-400">{(selectedNode.automationLevel * 100).toFixed(0)}%</div>
              <div className="text-xs text-slate-400">Automation</div>
            </div>
          </div>
          
          <div className="text-xs text-slate-500">
            Connections: {selectedNode.connections.length} | Tier: {selectedNode.tier}
          </div>
        </div>
      )}
      
      {/* Domain Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-800/90 rounded-lg p-3 border border-slate-700">
        <div className="text-white text-xs font-bold mb-2">Domains</div>
        <div className="grid grid-cols-3 gap-1">
          {Object.entries(DOMAIN_COLORS).map(([domain, color]) => (
            <div key={domain} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-slate-400 text-[10px]">{domain}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default NodeCluster3D;
