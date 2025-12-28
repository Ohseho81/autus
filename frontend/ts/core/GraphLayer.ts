/**
 * AUTUS GraphLayer (정본)
 * =======================
 * 
 * 노드와 엣지 시각화 (Page 2 - Route)
 * 
 * 물리량 바인딩:
 * - node.mass → 노드 크기
 * - node.sigma → 노드 흔들림
 * - node.density → 노드 밝기
 * - edge.flow → 선 두께 + 파티클 속도
 * 
 * Version: 1.0.0
 * Status: LOCKED
 */

import * as THREE from 'three';
import type { AutusUniforms } from '../uniforms/stateToUniform.js';

// ================================================================
// TYPES
// ================================================================

interface GraphNode {
  id: string;
  mass: number;
  sigma: number;
  density: number;
  type: 'SELF' | 'GOAL' | 'L1' | 'L2';
  layer: number;
  position?: { x: number; y: number; z: number };
}

interface GraphEdge {
  a: string;
  b: string;
  flow: number;
  sigma: number;
}

interface GraphState {
  anchor_node_id: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ================================================================
// CONSTANTS
// ================================================================

const MAX_NODES = 50;
const MAX_EDGES = 100;
const NODE_BASE_SIZE = 0.2;
const EDGE_BASE_WIDTH = 0.02;

// Colors
const TEAL = new THREE.Color(0x00ffcc);
const HIGH_SIGMA = new THREE.Color(0xff4444);

// ================================================================
// GRAPH LAYER
// ================================================================

export class GraphLayer {
  private group: THREE.Group;
  private uniforms: AutusUniforms;
  
  // Node instances
  private nodeGeometry: THREE.SphereGeometry;
  private nodeMaterial: THREE.MeshStandardMaterial;
  private nodeInstances: THREE.InstancedMesh;
  private nodeMap: Map<string, number> = new Map();
  
  // Edge lines
  private edgeGeometry: THREE.BufferGeometry;
  private edgeMaterial: THREE.LineBasicMaterial;
  private edgeLines: THREE.LineSegments;
  
  // Current state
  private currentNodes: GraphNode[] = [];
  private currentEdges: GraphEdge[] = [];
  
  constructor(uniforms: AutusUniforms) {
    this.uniforms = uniforms;
    this.group = new THREE.Group();
    
    // Node instances (InstancedMesh for performance)
    this.nodeGeometry = new THREE.SphereGeometry(NODE_BASE_SIZE, 16, 16);
    this.nodeMaterial = new THREE.MeshStandardMaterial({
      color: TEAL,
      emissive: TEAL,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9,
    });
    
    this.nodeInstances = new THREE.InstancedMesh(
      this.nodeGeometry,
      this.nodeMaterial,
      MAX_NODES
    );
    this.nodeInstances.count = 0;
    this.group.add(this.nodeInstances);
    
    // Edge lines
    this.edgeGeometry = new THREE.BufferGeometry();
    const edgePositions = new Float32Array(MAX_EDGES * 6); // 2 points * 3 coords
    this.edgeGeometry.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
    
    this.edgeMaterial = new THREE.LineBasicMaterial({
      color: TEAL,
      transparent: true,
      opacity: 0.6,
      linewidth: 1, // Note: linewidth > 1 not supported in WebGL
    });
    
    this.edgeLines = new THREE.LineSegments(this.edgeGeometry, this.edgeMaterial);
    this.group.add(this.edgeLines);
    
    // Initialize with default SELF node
    this.updateFromState({
      anchor_node_id: 'SELF',
      nodes: [
        { id: 'SELF', mass: 1.0, sigma: 0.3, density: 0.9, type: 'SELF', layer: 0 }
      ],
      edges: []
    });
  }
  
  /**
   * Update from graph state
   */
  updateFromState(graph: GraphState): void {
    this.currentNodes = graph.nodes;
    this.currentEdges = graph.edges;
    
    this.updateNodes();
    this.updateEdges();
  }
  
  /**
   * Update node instances
   */
  private updateNodes(): void {
    const dummy = new THREE.Object3D();
    this.nodeMap.clear();
    
    const nodeCount = Math.min(this.currentNodes.length, MAX_NODES);
    this.nodeInstances.count = nodeCount;
    
    for (let i = 0; i < nodeCount; i++) {
      const node = this.currentNodes[i];
      this.nodeMap.set(node.id, i);
      
      // Position (use provided or calculate based on layer)
      let position: THREE.Vector3;
      if (node.position) {
        position = new THREE.Vector3(node.position.x, node.position.y, node.position.z);
      } else {
        // Auto-position based on layer and index
        position = this.calculateNodePosition(node, i);
      }
      
      dummy.position.copy(position);
      
      // Scale based on mass
      const scale = 0.5 + node.mass * 1.5;
      dummy.scale.setScalar(scale);
      
      dummy.updateMatrix();
      this.nodeInstances.setMatrixAt(i, dummy.matrix);
      
      // Color based on sigma
      const color = new THREE.Color().lerpColors(
        TEAL,
        HIGH_SIGMA,
        Math.min(node.sigma / 0.8, 1)
      );
      this.nodeInstances.setColorAt(i, color);
    }
    
    this.nodeInstances.instanceMatrix.needsUpdate = true;
    if (this.nodeInstances.instanceColor) {
      this.nodeInstances.instanceColor.needsUpdate = true;
    }
  }
  
  /**
   * Calculate node position based on layer
   */
  private calculateNodePosition(node: GraphNode, index: number): THREE.Vector3 {
    if (node.type === 'SELF' || node.id === 'SELF') {
      return new THREE.Vector3(0, 0, 0);
    }
    
    // Layer determines distance from center
    const layerRadius = (node.layer + 1) * 2;
    
    // Distribute nodes in circle
    const angle = (index / Math.max(this.currentNodes.length - 1, 1)) * Math.PI * 2;
    
    return new THREE.Vector3(
      Math.cos(angle) * layerRadius,
      Math.sin(angle) * layerRadius * 0.5, // Flatten Y
      Math.sin(angle) * layerRadius * 0.3
    );
  }
  
  /**
   * Update edge lines
   */
  private updateEdges(): void {
    const positions = this.edgeGeometry.attributes.position.array as Float32Array;
    
    const edgeCount = Math.min(this.currentEdges.length, MAX_EDGES);
    
    for (let i = 0; i < edgeCount; i++) {
      const edge = this.currentEdges[i];
      
      // Get node positions
      const nodeA = this.currentNodes.find(n => n.id === edge.a);
      const nodeB = this.currentNodes.find(n => n.id === edge.b);
      
      if (!nodeA || !nodeB) continue;
      
      const idxA = this.nodeMap.get(edge.a);
      const idxB = this.nodeMap.get(edge.b);
      
      if (idxA === undefined || idxB === undefined) continue;
      
      // Get positions from instance matrix
      const posA = this.getNodePosition(idxA);
      const posB = this.getNodePosition(idxB);
      
      // Set line segment positions
      const baseIdx = i * 6;
      positions[baseIdx + 0] = posA.x;
      positions[baseIdx + 1] = posA.y;
      positions[baseIdx + 2] = posA.z;
      positions[baseIdx + 3] = posB.x;
      positions[baseIdx + 4] = posB.y;
      positions[baseIdx + 5] = posB.z;
    }
    
    // Clear remaining positions
    for (let i = edgeCount * 6; i < positions.length; i++) {
      positions[i] = 0;
    }
    
    this.edgeGeometry.attributes.position.needsUpdate = true;
    this.edgeGeometry.setDrawRange(0, edgeCount * 2);
    
    // Update edge color based on average sigma
    const avgSigma = this.currentEdges.reduce((sum, e) => sum + e.sigma, 0) / 
                     Math.max(this.currentEdges.length, 1);
    const edgeColor = new THREE.Color().lerpColors(TEAL, HIGH_SIGMA, avgSigma);
    this.edgeMaterial.color = edgeColor;
  }
  
  /**
   * Get node position from instance matrix
   */
  private getNodePosition(index: number): THREE.Vector3 {
    const matrix = new THREE.Matrix4();
    this.nodeInstances.getMatrixAt(index, matrix);
    
    const position = new THREE.Vector3();
    position.setFromMatrixPosition(matrix);
    
    return position;
  }
  
  /**
   * Update uniforms
   */
  updateUniforms(uniforms: AutusUniforms): void {
    this.uniforms = uniforms;
    
    // Update material based on mode
    const mode = uniforms.u_mode.value;
    this.nodeMaterial.opacity = mode > 0.5 ? 0.6 : 0.9;
    this.edgeMaterial.opacity = mode > 0.5 ? 0.4 : 0.6;
  }
  
  /**
   * Get Three.js object
   */
  getObject(): THREE.Object3D {
    return this.group;
  }
  
  /**
   * Set visibility
   */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }
  
  /**
   * Dispose resources
   */
  dispose(): void {
    this.nodeGeometry.dispose();
    this.nodeMaterial.dispose();
    this.nodeInstances.dispose();
    
    this.edgeGeometry.dispose();
    this.edgeMaterial.dispose();
  }
}
