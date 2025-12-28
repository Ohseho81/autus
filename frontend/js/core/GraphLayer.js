/**
 * AUTUS GraphLayer — A-2
 * NodeInstances + EdgeLines 렌더링
 * 
 * 물리량 매핑:
 * - Node.mass → 노드 반지름
 * - Node.sigma → 노드 테두리 진동
 * - Edge.weight → 엣지 불투명도
 */

export class GraphLayer {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            baseNodeSize: options.baseNodeSize || 0.12,
            maxNodeSize: options.maxNodeSize || 0.25,
            nodeColor: options.nodeColor || 0x00f0ff,
            edgeColor: options.edgeColor || 0x00f0ff,
            selfNodeSize: options.selfNodeSize || 0.35,
            ...options
        };
        
        this.nodes = new Map(); // id -> { mesh, ring, data }
        this.edges = new Map(); // `${a}-${b}` -> { line, data }
        this.uniforms = { time: 0 };
        
        this._createSelfNode();
    }
    
    /**
     * 중앙 Self 노드 생성
     */
    _createSelfNode() {
        const { selfNodeSize, nodeColor } = this.options;
        
        // Self 노드 구체
        const geometry = new THREE.SphereGeometry(selfNodeSize, 32, 32);
        const material = new THREE.MeshBasicMaterial({
            color: nodeColor,
            transparent: true,
            opacity: 0.35
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, 0, 0);
        this.scene.add(mesh);
        
        // Self 노드 링
        const ringGeometry = new THREE.RingGeometry(selfNodeSize - 0.02, selfNodeSize + 0.02, 64);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: nodeColor,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.set(0, 0, 0);
        this.scene.add(ring);
        
        this.nodes.set('SELF', {
            mesh,
            ring,
            data: { id: 'SELF', mass: 0.5, sigma: 0.1, type: 'SELF' }
        });
    }
    
    /**
     * 노드 크기 계산 (mass 기반)
     */
    _calculateNodeSize(mass) {
        const { baseNodeSize, maxNodeSize } = this.options;
        return baseNodeSize + (maxNodeSize - baseNodeSize) * Math.min(mass, 1);
    }
    
    /**
     * 노드 추가
     * @param {Object} nodeData - { id, mass, sigma, type, x?, y? }
     */
    addNode(nodeData) {
        if (this.nodes.has(nodeData.id)) {
            this.updateNode(nodeData);
            return;
        }
        
        const size = this._calculateNodeSize(nodeData.mass || 0.5);
        const { nodeColor } = this.options;
        
        // 노드 구체
        const geometry = new THREE.SphereGeometry(size, 16, 16);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uColor: { value: new THREE.Color(nodeColor) },
                uSigma: { value: nodeData.sigma || 0.1 },
                uTime: { value: 0 }
            },
            vertexShader: `
                uniform float uSigma;
                uniform float uTime;
                varying vec3 vNormal;
                
                float hash(float n) { return fract(sin(n) * 43758.5453123); }
                
                void main() {
                    vNormal = normal;
                    
                    // σ에 따른 진동
                    float jitter = sin(uTime * 10.0 + position.x * 5.0) * uSigma * 0.05;
                    vec3 pos = position + normal * jitter;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                varying vec3 vNormal;
                
                void main() {
                    float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 1.5);
                    vec3 color = uColor * (0.4 + fresnel * 0.3);
                    gl_FragColor = vec4(color, 0.45);
                }
            `,
            transparent: true,
            depthWrite: false
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        
        // 위치 설정 (극좌표 또는 직교좌표)
        if (nodeData.x !== undefined && nodeData.y !== undefined) {
            mesh.position.set(nodeData.x, nodeData.y, 0);
        } else if (nodeData.angle !== undefined && nodeData.radius !== undefined) {
            mesh.position.set(
                Math.cos(nodeData.angle) * nodeData.radius,
                Math.sin(nodeData.angle) * nodeData.radius,
                0
            );
        }
        
        this.scene.add(mesh);
        
        // 노드 링
        const ringGeometry = new THREE.RingGeometry(size - 0.01, size + 0.01, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: nodeColor,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.position.copy(mesh.position);
        this.scene.add(ring);
        
        this.nodes.set(nodeData.id, { mesh, ring, data: nodeData });
    }
    
    /**
     * 노드 업데이트
     */
    updateNode(nodeData) {
        const node = this.nodes.get(nodeData.id);
        if (!node) return;
        
        // Mass 변경 시 크기 조정
        if (nodeData.mass !== undefined && nodeData.mass !== node.data.mass) {
            const newSize = this._calculateNodeSize(nodeData.mass);
            node.mesh.geometry.dispose();
            node.mesh.geometry = new THREE.SphereGeometry(newSize, 16, 16);
            
            node.ring.geometry.dispose();
            node.ring.geometry = new THREE.RingGeometry(newSize - 0.01, newSize + 0.01, 32);
        }
        
        // Sigma 변경
        if (nodeData.sigma !== undefined && node.mesh.material.uniforms) {
            node.mesh.material.uniforms.uSigma.value = nodeData.sigma;
        }
        
        // 데이터 업데이트
        node.data = { ...node.data, ...nodeData };
    }
    
    /**
     * 노드 삭제
     */
    removeNode(nodeId) {
        if (nodeId === 'SELF') return; // SELF 노드는 삭제 불가
        
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        // 연결된 엣지 삭제
        this.edges.forEach((edge, key) => {
            if (key.includes(nodeId)) {
                this.removeEdge(edge.data.a, edge.data.b);
            }
        });
        
        // 메쉬 정리
        node.mesh.geometry.dispose();
        node.mesh.material.dispose();
        this.scene.remove(node.mesh);
        
        node.ring.geometry.dispose();
        node.ring.material.dispose();
        this.scene.remove(node.ring);
        
        this.nodes.delete(nodeId);
    }
    
    /**
     * 엣지 추가
     * @param {Object} edgeData - { a, b, weight }
     */
    addEdge(edgeData) {
        const key = this._edgeKey(edgeData.a, edgeData.b);
        if (this.edges.has(key)) {
            this.updateEdge(edgeData);
            return;
        }
        
        const nodeA = this.nodes.get(edgeData.a);
        const nodeB = this.nodes.get(edgeData.b);
        
        if (!nodeA || !nodeB) return;
        
        const points = [
            nodeA.mesh.position.clone(),
            nodeB.mesh.position.clone()
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: this.options.edgeColor,
            transparent: true,
            opacity: 0.1 + (edgeData.weight || 0.5) * 0.4
        });
        
        const line = new THREE.Line(geometry, material);
        this.scene.add(line);
        
        this.edges.set(key, { line, data: edgeData });
    }
    
    /**
     * 엣지 업데이트
     */
    updateEdge(edgeData) {
        const key = this._edgeKey(edgeData.a, edgeData.b);
        const edge = this.edges.get(key);
        if (!edge) return;
        
        // Weight 변경 시 불투명도 조정
        if (edgeData.weight !== undefined) {
            edge.line.material.opacity = 0.1 + edgeData.weight * 0.4;
        }
        
        edge.data = { ...edge.data, ...edgeData };
    }
    
    /**
     * 엣지 삭제
     */
    removeEdge(a, b) {
        const key = this._edgeKey(a, b);
        const edge = this.edges.get(key);
        if (!edge) return;
        
        edge.line.geometry.dispose();
        edge.line.material.dispose();
        this.scene.remove(edge.line);
        
        this.edges.delete(key);
    }
    
    /**
     * 엣지 키 생성 (정렬된 ID 조합)
     */
    _edgeKey(a, b) {
        return a < b ? `${a}-${b}` : `${b}-${a}`;
    }
    
    /**
     * 그래프 데이터 전체 업데이트
     * @param {Object} graph - { nodes: [], edges: [] }
     */
    updateGraph(graph) {
        // 기존 노드 중 새 데이터에 없는 것 삭제
        const newNodeIds = new Set(graph.nodes.map(n => n.id));
        this.nodes.forEach((_, id) => {
            if (id !== 'SELF' && !newNodeIds.has(id)) {
                this.removeNode(id);
            }
        });
        
        // 노드 추가/업데이트
        graph.nodes.forEach(nodeData => {
            if (nodeData.id !== 'SELF') {
                this.addNode(nodeData);
            }
        });
        
        // 기존 엣지 중 새 데이터에 없는 것 삭제
        const newEdgeKeys = new Set(graph.edges.map(e => this._edgeKey(e.a, e.b)));
        this.edges.forEach((_, key) => {
            if (!newEdgeKeys.has(key)) {
                const [a, b] = key.split('-');
                this.removeEdge(a, b);
            }
        });
        
        // 엣지 추가/업데이트
        graph.edges.forEach(edgeData => {
            this.addEdge(edgeData);
        });
    }
    
    /**
     * 애니메이션 프레임 업데이트
     */
    update(deltaTime) {
        this.uniforms.time += deltaTime;
        
        // 노드 셰이더 업데이트
        this.nodes.forEach(node => {
            if (node.mesh.material.uniforms) {
                node.mesh.material.uniforms.uTime.value = this.uniforms.time;
            }
            
            // σ에 따른 스케일 진동
            const sigma = node.data.sigma || 0.1;
            const scale = 1 + Math.sin(this.uniforms.time * 8 + node.data.id.charCodeAt(0)) * sigma * 0.03;
            node.mesh.scale.set(scale, scale, scale);
            node.ring.scale.set(scale, scale, scale);
        });
        
        // Self 노드 회전
        const selfNode = this.nodes.get('SELF');
        if (selfNode) {
            selfNode.mesh.rotation.y += deltaTime * 0.2;
        }
    }
    
    /**
     * 모드 전환 (SIM/LIVE)
     */
    setMode(mode) {
        const isSim = mode === 'SIM';
        
        // SIM 모드: 엣지 점선화
        this.edges.forEach(edge => {
            edge.line.material.opacity = isSim 
                ? (0.1 + (edge.data.weight || 0.5) * 0.2)
                : (0.1 + (edge.data.weight || 0.5) * 0.4);
        });
    }
    
    /**
     * 리소스 정리
     */
    dispose() {
        this.nodes.forEach((node, id) => {
            if (id !== 'SELF') this.removeNode(id);
        });
        
        // SELF 노드 정리
        const selfNode = this.nodes.get('SELF');
        if (selfNode) {
            selfNode.mesh.geometry.dispose();
            selfNode.mesh.material.dispose();
            this.scene.remove(selfNode.mesh);
            selfNode.ring.geometry.dispose();
            selfNode.ring.material.dispose();
            this.scene.remove(selfNode.ring);
        }
        
        this.nodes.clear();
        this.edges.clear();
    }
}

export default GraphLayer;





