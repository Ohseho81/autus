/**
 * AUTUS SceneRoot (정본)
 * =====================
 * 
 * 단일 Scene에서 3페이지를 투영하는 루트 컨테이너.
 * 
 * 원칙:
 * - Scene은 하나, 좌표계만 전환
 * - 모든 렌더는 state → uniform 바인딩
 * - postfx 사용 금지
 * 
 * Version: 1.0.0
 * Status: LOCKED
 */

import * as THREE from 'three';
import { CoreLayer } from './CoreLayer.js';
import { GraphLayer } from './GraphLayer.js';
import { FlowLayer } from './FlowLayer.js';
import { stateToUniforms, type AutusUniforms } from '../uniforms/stateToUniform.js';
import { DeterminismSampler } from '../time/determinismSampler.js';
import type { AutusState } from '../types/state.js';

// ================================================================
// CONSTANTS (LOCKED)
// ================================================================

const BG_COLOR = 0x050608;
const FOV = 60;
const NEAR = 0.1;
const FAR = 1000;

// ================================================================
// SCENE ROOT
// ================================================================

export class SceneRoot {
  // Three.js core
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  // Layers
  private coreLayer: CoreLayer;
  private graphLayer: GraphLayer;
  private flowLayer: FlowLayer;
  
  // State
  private currentState: AutusState | null = null;
  private uniforms: AutusUniforms;
  private sampler: DeterminismSampler;
  
  // Animation
  private animationId: number | null = null;
  private lastTime: number = 0;
  
  constructor(container: HTMLElement) {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BG_COLOR);
    
    // Camera (fixed FOV)
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(FOV, aspect, NEAR, FAR);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
    
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);
    
    // Minimal lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambient);
    
    const point = new THREE.PointLight(0x00ffcc, 1, 100);
    point.position.set(0, 0, 3);
    this.scene.add(point);
    
    // Initialize uniforms with defaults
    this.uniforms = stateToUniforms(null);
    
    // Determinism sampler
    this.sampler = new DeterminismSampler();
    
    // Create layers
    this.coreLayer = new CoreLayer(this.uniforms);
    this.graphLayer = new GraphLayer(this.uniforms);
    this.flowLayer = new FlowLayer(this.uniforms);
    
    // Add to scene
    this.scene.add(this.coreLayer.getObject());
    this.scene.add(this.graphLayer.getObject());
    this.scene.add(this.flowLayer.getObject());
    
    // Handle resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }
  
  /**
   * Update state and re-render
   * 
   * 핵심: state가 바뀌면 uniform만 업데이트
   */
  setState(state: AutusState): void {
    this.currentState = state;
    
    // Update uniforms from state
    const newUniforms = stateToUniforms(state);
    Object.assign(this.uniforms, newUniforms);
    
    // Update sampler session
    this.sampler.setSession(state.session_id);
    
    // Update layers
    this.coreLayer.updateUniforms(this.uniforms);
    this.graphLayer.updateFromState(state.graph);
    this.flowLayer.updateUniforms(this.uniforms);
  }
  
  /**
   * Set current page (1, 2, 3)
   * 
   * 페이지 전환 = 카메라/좌표계만 변경, state 불변
   */
  setPage(page: 1 | 2 | 3): void {
    switch (page) {
      case 1: // Goal - Core focus
        this.camera.position.set(0, 0, 5);
        this.coreLayer.setVisible(true);
        this.graphLayer.setVisible(false);
        this.flowLayer.setVisible(true);
        break;
        
      case 2: // Route - Graph focus
        this.camera.position.set(0, 2, 8);
        this.coreLayer.setVisible(true);
        this.graphLayer.setVisible(true);
        this.flowLayer.setVisible(true);
        break;
        
      case 3: // Mandala - Top-down
        this.camera.position.set(0, 5, 3);
        this.coreLayer.setVisible(true);
        this.graphLayer.setVisible(false);
        this.flowLayer.setVisible(true);
        break;
    }
    
    this.camera.lookAt(0, 0, 0);
  }
  
  /**
   * Start render loop
   */
  start(): void {
    if (this.animationId !== null) return;
    
    const animate = (time: number) => {
      this.animationId = requestAnimationFrame(animate);
      
      // Deterministic time bucket
      const t_bucket = this.sampler.getBucket(time);
      this.uniforms.u_t.value = t_bucket;
      
      // Update layers
      const deltaTime = (time - this.lastTime) / 1000;
      this.lastTime = time;
      
      this.coreLayer.update(deltaTime);
      this.flowLayer.update(deltaTime);
      
      // Render
      this.renderer.render(this.scene, this.camera);
    };
    
    animate(0);
  }
  
  /**
   * Stop render loop
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  /**
   * Handle window resize
   */
  private handleResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  /**
   * Dispose all resources
   */
  dispose(): void {
    this.stop();
    
    this.coreLayer.dispose();
    this.graphLayer.dispose();
    this.flowLayer.dispose();
    
    this.renderer.dispose();
    this.renderer.domElement.remove();
    
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
