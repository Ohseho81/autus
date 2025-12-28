/**
 * AUTUS Renderer — 통합 렌더 시스템
 * 
 * A-1~A-5 모듈을 통합하여 3페이지 렌더링을 관리
 */

import { CoreLayer } from './CoreLayer.js';
import { GraphLayer } from './GraphLayer.js';
import { FlowLayer } from './FlowLayer.js';
import { stateToUniform, getModeStyle } from './StateUniform.js';
import { DeterministicRandom, ParticleSampler, generateSeed } from './DeterminismSampler.js';

/**
 * 디자인 토큰 (tokens.autus.json 참조)
 */
const TOKENS = {
    color: {
        bg_base: '#050608',
        bg_dark: '#000000',
        cyan_primary: 0x00f0ff,
        cyan_dim: 0x00f0ff,
        warning_orange: 0xf0a000
    },
    motion: {
        transition_ms: 300,
        lerp_alpha: {
            alloc: 0.08,
            mass: 0.12,
            volume: 0.1,
            node: 0.15
        }
    }
};

/**
 * AUTUS 통합 렌더러
 */
export class AutusRenderer {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            sessionId: options.sessionId || 'default_session',
            apiBaseUrl: options.apiBaseUrl || 'http://localhost:8001',
            ...options
        };
        
        // Three.js 기본 설정
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // 레이어
        this.layers = {
            core: null,
            graph: null,
            flow: null
        };
        
        // 상태
        this.state = null;
        this.uniforms = null;
        this.mode = 'SIM';
        this.currentPage = 1;
        
        // 애니메이션
        this.clock = null;
        this.animationId = null;
        this.isRunning = false;
        
        // 결정론적 샘플러
        this.particleSampler = null;
        
        this._init();
    }
    
    /**
     * 초기화
     */
    _init() {
        // Scene
        this.scene = new THREE.Scene();
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 5;
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(TOKENS.color.bg_dark, 1);
        this.container.appendChild(this.renderer.domElement);
        
        // Clock
        this.clock = new THREE.Clock();
        
        // Particle Sampler
        this.particleSampler = new ParticleSampler(this.options.sessionId, 1500);
        this.particleSampler.initForTime(Date.now());
        
        // 리사이즈 핸들러
        this._handleResize = this._handleResize.bind(this);
        window.addEventListener('resize', this._handleResize);
    }
    
    /**
     * 레이어 생성
     */
    _createLayers() {
        // Core Layer (Page 1, 3)
        this.layers.core = new CoreLayer(this.scene, {
            baseRadius: 1.3,
            baseColor: TOKENS.color.cyan_primary
        });
        
        // Graph Layer (Page 2)
        this.layers.graph = new GraphLayer(this.scene, {
            nodeColor: TOKENS.color.cyan_primary,
            edgeColor: TOKENS.color.cyan_primary
        });
        
        // Flow Layer (모든 페이지)
        this.layers.flow = new FlowLayer(this.scene, {
            particleCount: 1500,
            baseColor: TOKENS.color.cyan_primary
        });
    }
    
    /**
     * 페이지별 레이어 가시성 설정
     */
    setPage(page) {
        this.currentPage = page;
        
        // 모든 레이어 숨김
        if (this.layers.core) {
            Object.values(this.layers.core.meshes).forEach(m => m.visible = false);
        }
        if (this.layers.graph) {
            this.layers.graph.nodes.forEach(n => {
                n.mesh.visible = false;
                n.ring.visible = false;
            });
            this.layers.graph.edges.forEach(e => e.line.visible = false);
        }
        
        // 페이지별 레이어 표시
        switch (page) {
            case 1: // Goal Calibration
                if (this.layers.core) {
                    Object.values(this.layers.core.meshes).forEach(m => m.visible = true);
                }
                this.layers.flow?.setVisible(true);
                this._setupPage1Extras();
                break;
                
            case 2: // Route / Topology
                if (this.layers.graph) {
                    this.layers.graph.nodes.forEach(n => {
                        n.mesh.visible = true;
                        n.ring.visible = true;
                    });
                    this.layers.graph.edges.forEach(e => e.line.visible = true);
                }
                this.layers.flow?.setVisible(true);
                this._setupPage2Extras();
                break;
                
            case 3: // Mandala Investment
                if (this.layers.core) {
                    // Mandala에서는 작은 코어만 표시
                    this.layers.core.meshes.core?.scale.set(0.5, 0.5, 0.5);
                    Object.values(this.layers.core.meshes).forEach(m => m.visible = true);
                }
                this.layers.flow?.setVisible(true);
                this._setupPage3Extras();
                break;
        }
    }
    
    /**
     * Page 1 추가 요소 (궤도, P_outcome 마커)
     */
    _setupPage1Extras() {
        // Volume Ring
        if (!this._page1Extras) {
            this._page1Extras = {};
            
            // Volume Ring
            const volumeRingGeometry = new THREE.RingGeometry(2.1, 2.13, 128);
            const volumeRingMaterial = new THREE.MeshBasicMaterial({
                color: TOKENS.color.cyan_primary,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            this._page1Extras.volumeRing = new THREE.Mesh(volumeRingGeometry, volumeRingMaterial);
            this.scene.add(this._page1Extras.volumeRing);
            
            // Sigma Orbits
            this._page1Extras.sigmaOrbitA = this._createOrbitLine(2.4, 1.9, 0.4, -0.25);
            this._page1Extras.sigmaOrbitV = this._createOrbitLine(2.5, 1.5, 0.5, 0.3);
            this.scene.add(this._page1Extras.sigmaOrbitA);
            this.scene.add(this._page1Extras.sigmaOrbitV);
            
            // P_outcome Marker
            const markerGeometry = new THREE.SphereGeometry(0.08, 16, 16);
            const markerMaterial = new THREE.MeshBasicMaterial({ color: TOKENS.color.cyan_primary });
            this._page1Extras.marker = new THREE.Mesh(markerGeometry, markerMaterial);
            this._page1Extras.marker.position.set(1.8, 1.0, 0.3);
            this.scene.add(this._page1Extras.marker);
        }
        
        Object.values(this._page1Extras).forEach(obj => obj.visible = true);
    }
    
    /**
     * Page 2 추가 요소 (동심원, 방사선)
     */
    _setupPage2Extras() {
        if (!this._page2Extras) {
            this._page2Extras = { rings: [], radials: [] };
            
            // 동심원
            for (let i = 1; i <= 6; i++) {
                const ring = this._createRing(i * 0.45, 0.12 + (6 - i) * 0.02);
                this._page2Extras.rings.push(ring);
                this.scene.add(ring);
            }
            
            // 방사선
            for (let i = 0; i < 24; i++) {
                const angle = (i / 24) * Math.PI * 2;
                const points = [
                    new THREE.Vector3(0, 0, 0),
                    new THREE.Vector3(Math.cos(angle) * 3.5, Math.sin(angle) * 3.5, 0)
                ];
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const material = new THREE.LineBasicMaterial({
                    color: TOKENS.color.cyan_primary,
                    transparent: true,
                    opacity: 0.06
                });
                const line = new THREE.Line(geometry, material);
                this._page2Extras.radials.push(line);
                this.scene.add(line);
            }
        }
        
        this._page2Extras.rings.forEach(r => r.visible = true);
        this._page2Extras.radials.forEach(r => r.visible = true);
    }
    
    /**
     * Page 3 추가 요소 (만다라 세그먼트)
     */
    _setupPage3Extras() {
        if (!this._page3Extras) {
            this._page3Extras = { segments: [], outlines: [] };
            
            const segments = 8;
            const innerRadius = 0.75;
            const outerRadius = 2.1;
            const redTintSlots = [0, 1, 3, 5, 7];
            
            for (let i = 0; i < segments; i++) {
                const segment = this._createMandalaSegment(i, segments, innerRadius, outerRadius, redTintSlots.includes(i));
                this._page3Extras.segments.push(segment);
                this.scene.add(segment);
                
                const outline = this._createMandalaOutline(i, segments, innerRadius, outerRadius);
                this._page3Extras.outlines.push(outline);
                this.scene.add(outline);
            }
        }
        
        this._page3Extras.segments.forEach(s => s.visible = true);
        this._page3Extras.outlines.forEach(o => o.visible = true);
    }
    
    /**
     * 궤도 라인 생성
     */
    _createOrbitLine(radiusX, radiusY, tiltX, tiltZ) {
        const curve = new THREE.EllipseCurve(0, 0, radiusX, radiusY, 0, 2 * Math.PI, false, 0);
        const points = curve.getPoints(128);
        const geometry = new THREE.BufferGeometry().setFromPoints(
            points.map(p => new THREE.Vector3(p.x, p.y, 0))
        );
        const material = new THREE.LineBasicMaterial({
            color: TOKENS.color.cyan_primary,
            transparent: true,
            opacity: 0.3
        });
        const line = new THREE.Line(geometry, material);
        line.rotation.x = tiltX;
        line.rotation.z = tiltZ;
        return line;
    }
    
    /**
     * 링 생성
     */
    _createRing(radius, opacity) {
        const geometry = new THREE.RingGeometry(radius - 0.01, radius + 0.01, 128);
        const material = new THREE.MeshBasicMaterial({
            color: TOKENS.color.cyan_primary,
            transparent: true,
            opacity: opacity,
            side: THREE.DoubleSide
        });
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * 만다라 세그먼트 생성
     */
    _createMandalaSegment(index, total, innerRadius, outerRadius, hasRedTint) {
        const angleStart = (index / total) * Math.PI * 2 - Math.PI / 2 - Math.PI / total;
        const angleEnd = ((index + 1) / total) * Math.PI * 2 - Math.PI / 2 - Math.PI / total;
        
        const shape = new THREE.Shape();
        const outerPoints = [];
        for (let i = 0; i <= 16; i++) {
            const angle = angleStart + (angleEnd - angleStart) * (i / 16);
            outerPoints.push(new THREE.Vector2(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius));
        }
        const innerPoints = [];
        for (let i = 16; i >= 0; i--) {
            const angle = angleStart + (angleEnd - angleStart) * (i / 16);
            innerPoints.push(new THREE.Vector2(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius));
        }
        
        shape.moveTo(outerPoints[0].x, outerPoints[0].y);
        outerPoints.forEach(p => shape.lineTo(p.x, p.y));
        innerPoints.forEach(p => shape.lineTo(p.x, p.y));
        shape.closePath();
        
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
            color: hasRedTint ? 0x401030 : 0x002025,
            transparent: true,
            opacity: 0.65,
            side: THREE.DoubleSide
        });
        
        return new THREE.Mesh(geometry, material);
    }
    
    /**
     * 만다라 아웃라인 생성
     */
    _createMandalaOutline(index, total, innerRadius, outerRadius) {
        const angleStart = (index / total) * Math.PI * 2 - Math.PI / 2 - Math.PI / total;
        const angleEnd = ((index + 1) / total) * Math.PI * 2 - Math.PI / 2 - Math.PI / total;
        
        const points = [];
        for (let i = 0; i <= 16; i++) {
            const angle = angleStart + (angleEnd - angleStart) * (i / 16);
            points.push(new THREE.Vector3(Math.cos(angle) * outerRadius, Math.sin(angle) * outerRadius, 0));
        }
        for (let i = 16; i >= 0; i--) {
            const angle = angleStart + (angleEnd - angleStart) * (i / 16);
            points.push(new THREE.Vector3(Math.cos(angle) * innerRadius, Math.sin(angle) * innerRadius, 0));
        }
        points.push(points[0].clone());
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: TOKENS.color.cyan_primary,
            transparent: true,
            opacity: 0.45
        });
        
        return new THREE.Line(geometry, material);
    }
    
    /**
     * 상태 업데이트
     */
    updateState(state) {
        this.state = state;
        this.uniforms = stateToUniform(state);
        
        // 레이어 업데이트
        if (this.layers.core) {
            this.layers.core.updateMeasure({
                density: this.uniforms.core.density,
                stability: this.uniforms.core.stability,
                sigma: this.uniforms.core.sigma
            });
        }
        
        if (this.layers.graph && this.uniforms.graph) {
            this.layers.graph.updateGraph({
                nodes: this.uniforms.graph.nodes,
                edges: this.uniforms.graph.edges
            });
        }
        
        if (this.layers.flow) {
            this.layers.flow.updateMeasure({
                energy: this.uniforms.flow.energy,
                leak: this.uniforms.flow.leak
            });
        }
        
        // 모드 업데이트
        if (this.uniforms.ui.mode !== this.mode) {
            this.setMode(this.uniforms.ui.mode);
        }
    }
    
    /**
     * 모드 전환 (SIM/LIVE)
     */
    setMode(mode) {
        this.mode = mode;
        const style = getModeStyle(mode);
        
        this.layers.core?.setMode(mode);
        this.layers.graph?.setMode(mode);
    }
    
    /**
     * API에서 상태 가져오기
     */
    async fetchState() {
        try {
            const res = await fetch(
                `${this.options.apiBaseUrl}/state?session_id=${this.options.sessionId}`
            );
            const data = await res.json();
            this.updateState(data);
            return data;
        } catch (e) {
            console.error('Failed to fetch state:', e);
            return null;
        }
    }
    
    /**
     * 애니메이션 루프
     */
    _animate() {
        if (!this.isRunning) return;
        
        this.animationId = requestAnimationFrame(() => this._animate());
        
        const deltaTime = this.clock.getDelta();
        
        // 레이어 업데이트
        this.layers.core?.update(deltaTime);
        this.layers.graph?.update(deltaTime);
        this.layers.flow?.update(deltaTime);
        
        // Page 1 마커 애니메이션
        if (this._page1Extras?.marker && this.currentPage === 1) {
            const time = this.clock.getElapsedTime();
            this._page1Extras.marker.position.x = 2.3 * Math.cos(time * 0.5);
            this._page1Extras.marker.position.y = 1.3 * Math.sin(time * 0.5);
        }
        
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * 렌더링 시작
     */
    start() {
        if (this.isRunning) return;
        
        this._createLayers();
        this.setPage(this.currentPage);
        
        this.isRunning = true;
        this.clock.start();
        this._animate();
    }
    
    /**
     * 렌더링 중지
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * 리사이즈 핸들러
     */
    _handleResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    /**
     * 리소스 정리
     */
    dispose() {
        this.stop();
        
        window.removeEventListener('resize', this._handleResize);
        
        this.layers.core?.dispose();
        this.layers.graph?.dispose();
        this.layers.flow?.dispose();
        
        // 추가 요소 정리
        [this._page1Extras, this._page2Extras, this._page3Extras].forEach(extras => {
            if (extras) {
                Object.values(extras).forEach(obj => {
                    if (Array.isArray(obj)) {
                        obj.forEach(item => {
                            item.geometry?.dispose();
                            item.material?.dispose();
                            this.scene.remove(item);
                        });
                    } else {
                        obj.geometry?.dispose();
                        obj.material?.dispose();
                        this.scene.remove(obj);
                    }
                });
            }
        });
        
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}

export default AutusRenderer;





