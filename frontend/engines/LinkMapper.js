// ================================================================
// LINK MAPPER ENGINE (연결 분석 엔진)
// 관계 네트워크 구축 및 물리 맵핑
// ================================================================

// ================================================================
// GRAPH DATA STRUCTURE (그래프 데이터)
// ================================================================

class GraphNode {
    constructor(id, data = {}) {
        this.id = id;
        this.label = data.label || id;
        this.type = data.type || 'default';
        this.attributes = data.attributes || {};
        this.mass = data.mass || 1;
        this.position = data.position || { x: 0, y: 0 };
        this.createdAt = Date.now();
        this.lastInteraction = Date.now();
    }
    
    toJSON() {
        return {
            id: this.id,
            label: this.label,
            type: this.type,
            attributes: this.attributes,
            mass: this.mass,
            position: this.position
        };
    }
}

class GraphEdge {
    constructor(source, target, data = {}) {
        this.source = source;
        this.target = target;
        this.weight = data.weight || 1;
        this.type = data.type || 'connection';
        this.attributes = data.attributes || {};
        this.interactions = data.interactions || 1;
        this.createdAt = Date.now();
        this.lastInteraction = Date.now();
    }
    
    toJSON() {
        return {
            source: this.source,
            target: this.target,
            weight: this.weight,
            type: this.type,
            interactions: this.interactions
        };
    }
}

// ================================================================
// NETWORK GRAPH (네트워크 그래프)
// ================================================================

const NetworkGraph = {
    nodes: new Map(),
    edges: new Map(),
    
    /**
     * 노드 추가
     */
    addNode(id, data = {}) {
        if (!this.nodes.has(id)) {
            this.nodes.set(id, new GraphNode(id, data));
        } else {
            // 기존 노드 업데이트
            const node = this.nodes.get(id);
            Object.assign(node.attributes, data.attributes || {});
            node.lastInteraction = Date.now();
            if (data.mass) node.mass = data.mass;
        }
        return this.nodes.get(id);
    },
    
    /**
     * 노드 가져오기
     */
    getNode(id) {
        return this.nodes.get(id);
    },
    
    /**
     * 노드 삭제
     */
    removeNode(id) {
        this.nodes.delete(id);
        
        // 관련 엣지도 삭제
        for (const [edgeId, edge] of this.edges) {
            if (edge.source === id || edge.target === id) {
                this.edges.delete(edgeId);
            }
        }
    },
    
    /**
     * 엣지 추가
     */
    addEdge(sourceId, targetId, data = {}) {
        // 노드가 없으면 생성
        if (!this.nodes.has(sourceId)) {
            this.addNode(sourceId);
        }
        if (!this.nodes.has(targetId)) {
            this.addNode(targetId);
        }
        
        const edgeId = `${sourceId}->${targetId}`;
        const reverseId = `${targetId}->${sourceId}`;
        
        // 양방향 중 하나라도 있으면 업데이트
        if (this.edges.has(edgeId)) {
            const edge = this.edges.get(edgeId);
            edge.interactions++;
            edge.weight += data.weight || 0.1;
            edge.lastInteraction = Date.now();
            return edge;
        }
        
        if (!data.directed && this.edges.has(reverseId)) {
            const edge = this.edges.get(reverseId);
            edge.interactions++;
            edge.weight += data.weight || 0.1;
            edge.lastInteraction = Date.now();
            return edge;
        }
        
        // 새 엣지 생성
        const edge = new GraphEdge(sourceId, targetId, data);
        this.edges.set(edgeId, edge);
        
        return edge;
    },
    
    /**
     * 엣지 가져오기
     */
    getEdge(sourceId, targetId) {
        return this.edges.get(`${sourceId}->${targetId}`) ||
               this.edges.get(`${targetId}->${sourceId}`);
    },
    
    /**
     * 노드의 이웃들 가져오기
     */
    getNeighbors(nodeId) {
        const neighbors = [];
        
        for (const edge of this.edges.values()) {
            if (edge.source === nodeId) {
                neighbors.push({
                    nodeId: edge.target,
                    edge,
                    direction: 'outgoing'
                });
            } else if (edge.target === nodeId) {
                neighbors.push({
                    nodeId: edge.source,
                    edge,
                    direction: 'incoming'
                });
            }
        }
        
        return neighbors;
    },
    
    /**
     * 노드 차수(degree) 계산
     */
    getDegree(nodeId) {
        return this.getNeighbors(nodeId).length;
    },
    
    /**
     * 그래프 초기화
     */
    clear() {
        this.nodes.clear();
        this.edges.clear();
    },
    
    /**
     * JSON으로 내보내기
     */
    toJSON() {
        return {
            nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
            edges: Array.from(this.edges.values()).map(e => e.toJSON())
        };
    },
    
    /**
     * JSON에서 가져오기
     */
    fromJSON(data) {
        this.clear();
        
        data.nodes?.forEach(n => this.addNode(n.id, n));
        data.edges?.forEach(e => this.addEdge(e.source, e.target, e));
        
        return this;
    }
};

// ================================================================
// NETWORK ANALYZER (네트워크 분석)
// ================================================================

const NetworkAnalyzer = {
    /**
     * 기본 통계
     */
    getBasicStats(graph) {
        const nodeCount = graph.nodes.size;
        const edgeCount = graph.edges.size;
        
        // 평균 차수
        let totalDegree = 0;
        for (const nodeId of graph.nodes.keys()) {
            totalDegree += graph.getDegree(nodeId);
        }
        const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;
        
        // 밀도 (density)
        const maxEdges = nodeCount * (nodeCount - 1) / 2;
        const density = maxEdges > 0 ? edgeCount / maxEdges : 0;
        
        // 총 가중치
        let totalWeight = 0;
        for (const edge of graph.edges.values()) {
            totalWeight += edge.weight;
        }
        
        return {
            nodeCount,
            edgeCount,
            avgDegree: Math.round(avgDegree * 100) / 100,
            density: Math.round(density * 1000) / 1000,
            totalWeight: Math.round(totalWeight * 100) / 100
        };
    },
    
    /**
     * 중심성(Centrality) 계산
     */
    calculateCentrality(graph) {
        const centrality = {};
        
        for (const [nodeId, node] of graph.nodes) {
            const degree = graph.getDegree(nodeId);
            const neighbors = graph.getNeighbors(nodeId);
            
            // 차수 중심성
            const degreeCentrality = graph.nodes.size > 1 
                ? degree / (graph.nodes.size - 1) 
                : 0;
            
            // 가중치 중심성
            const weightCentrality = neighbors.reduce((sum, n) => sum + n.edge.weight, 0);
            
            centrality[nodeId] = {
                degree: degreeCentrality,
                weight: weightCentrality,
                combined: (degreeCentrality + weightCentrality / 10) / 2
            };
        }
        
        return centrality;
    },
    
    /**
     * 상위 중심 노드들
     */
    getTopCentralNodes(graph, count = 5) {
        const centrality = this.calculateCentrality(graph);
        
        return Object.entries(centrality)
            .sort((a, b) => b[1].combined - a[1].combined)
            .slice(0, count)
            .map(([nodeId, scores]) => ({
                nodeId,
                node: graph.getNode(nodeId),
                ...scores
            }));
    },
    
    /**
     * 클러스터링 계수
     */
    calculateClusteringCoefficient(graph, nodeId) {
        const neighbors = graph.getNeighbors(nodeId);
        const k = neighbors.length;
        
        if (k < 2) return 0;
        
        // 이웃들 사이의 연결 수
        let triangles = 0;
        const neighborIds = neighbors.map(n => n.nodeId);
        
        for (let i = 0; i < neighborIds.length; i++) {
            for (let j = i + 1; j < neighborIds.length; j++) {
                if (graph.getEdge(neighborIds[i], neighborIds[j])) {
                    triangles++;
                }
            }
        }
        
        const possibleTriangles = k * (k - 1) / 2;
        return triangles / possibleTriangles;
    },
    
    /**
     * 커뮤니티 감지 (간단한 레이블 전파)
     */
    detectCommunities(graph, iterations = 10) {
        // 초기 레이블 (각자 자신의 ID)
        const labels = {};
        for (const nodeId of graph.nodes.keys()) {
            labels[nodeId] = nodeId;
        }
        
        // 레이블 전파
        for (let i = 0; i < iterations; i++) {
            for (const nodeId of graph.nodes.keys()) {
                const neighbors = graph.getNeighbors(nodeId);
                if (neighbors.length === 0) continue;
                
                // 이웃들의 레이블 빈도
                const labelCounts = {};
                neighbors.forEach(n => {
                    const label = labels[n.nodeId];
                    labelCounts[label] = (labelCounts[label] || 0) + n.edge.weight;
                });
                
                // 가장 빈번한 레이블로 업데이트
                const maxLabel = Object.entries(labelCounts)
                    .sort((a, b) => b[1] - a[1])[0][0];
                labels[nodeId] = maxLabel;
            }
        }
        
        // 커뮤니티 그룹화
        const communities = {};
        Object.entries(labels).forEach(([nodeId, label]) => {
            if (!communities[label]) communities[label] = [];
            communities[label].push(nodeId);
        });
        
        return {
            labels,
            communities: Object.values(communities),
            count: Object.keys(communities).length
        };
    },
    
    /**
     * 연결 강도 분석
     */
    analyzeConnectionStrength(graph) {
        const edges = Array.from(graph.edges.values());
        
        if (edges.length === 0) {
            return { strong: [], weak: [], average: 0 };
        }
        
        const weights = edges.map(e => e.weight);
        const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
        const stdDev = Math.sqrt(
            weights.reduce((sq, w) => sq + Math.pow(w - avgWeight, 2), 0) / weights.length
        );
        
        const strong = edges.filter(e => e.weight > avgWeight + stdDev);
        const weak = edges.filter(e => e.weight < avgWeight - stdDev);
        
        return {
            strong: strong.map(e => e.toJSON()),
            weak: weak.map(e => e.toJSON()),
            average: avgWeight,
            stdDev
        };
    }
};

// ================================================================
// RELATIONSHIP TYPES (관계 유형)
// ================================================================

const RelationshipTypes = {
    FAMILY: { weight: 10, color: '#ff6b6b', label: '가족' },
    FRIEND: { weight: 5, color: '#4ecdc4', label: '친구' },
    COLLEAGUE: { weight: 3, color: '#45b7d1', label: '동료' },
    MENTOR: { weight: 7, color: '#96ceb4', label: '멘토' },
    STUDENT: { weight: 4, color: '#ffeaa7', label: '학생' },
    CLIENT: { weight: 6, color: '#dfe6e9', label: '고객' },
    ACQUAINTANCE: { weight: 1, color: '#b2bec3', label: '지인' },
    
    get(type) {
        return this[type.toUpperCase()] || { weight: 1, color: '#999', label: type };
    }
};

// ================================================================
// PHYSICS CONVERTER (물리 속성 변환)
// ================================================================

const LinkPhysicsConverter = {
    /**
     * 네트워크를 물리 속성으로 변환
     */
    convert(graph) {
        const stats = NetworkAnalyzer.getBasicStats(graph);
        const centrality = NetworkAnalyzer.calculateCentrality(graph);
        const communities = NetworkAnalyzer.detectCommunities(graph);
        const strength = NetworkAnalyzer.analyzeConnectionStrength(graph);
        
        // 1. MASS = 노드 수 + 연결 수
        const mass = Math.log10(stats.nodeCount + 1) * 10 + 
                     Math.log10(stats.edgeCount + 1) * 5;
        
        // 2. ENERGY = 총 연결 가중치 + 상호작용 수
        let totalInteractions = 0;
        for (const edge of graph.edges.values()) {
            totalInteractions += edge.interactions;
        }
        const energy = Math.log10(stats.totalWeight + 1) * 20 + 
                       Math.log10(totalInteractions + 1) * 10;
        
        // 3. ENTROPY = 밀도의 역수 (희소할수록 높음)
        const entropy = 1 - stats.density;
        
        // 4. VELOCITY = 평균 차수 (연결 활발도)
        const velocity = Math.min(stats.avgDegree / 5, 2);
        
        // 5. 노드별 물리 속성
        const nodePhysics = {};
        for (const [nodeId, node] of graph.nodes) {
            const cent = centrality[nodeId];
            nodePhysics[nodeId] = {
                mass: node.mass * (1 + cent.degree),
                gravity: cent.weight,
                importance: cent.combined
            };
        }
        
        return {
            mass: Math.round(mass * 100) / 100,
            energy: Math.round(energy * 100) / 100,
            entropy: Math.round(entropy * 1000) / 1000,
            velocity: Math.round(velocity * 100) / 100,
            
            metadata: {
                stats,
                topNodes: NetworkAnalyzer.getTopCentralNodes(graph, 5),
                communityCount: communities.count,
                strongConnections: strength.strong.length,
                weakConnections: strength.weak.length
            },
            
            nodePhysics,
            
            // 시각화용 데이터
            visualization: graph.toJSON(),
            
            analyzedAt: new Date().toISOString()
        };
    }
};

// ================================================================
// LINK MAPPER ENGINE (통합 엔진)
// ================================================================

export const LinkMapper = {
    // 그래프 인스턴스
    graph: NetworkGraph,
    
    // 컴포넌트
    analyzer: NetworkAnalyzer,
    converter: LinkPhysicsConverter,
    relationshipTypes: RelationshipTypes,
    
    // 상태
    lastResult: null,
    history: [],
    
    /**
     * 초기화
     */
    init() {
        this.graph.clear();
        console.log('[LinkMapper] 초기화 완료');
        return this;
    },
    
    /**
     * 중심 노드 설정 (주로 사용자)
     */
    setCenter(id, data = {}) {
        const node = this.graph.addNode(id, {
            ...data,
            type: 'center',
            mass: 100
        });
        node.position = { x: 0, y: 0 };
        return node;
    },
    
    /**
     * 관계 추가
     */
    addRelation(sourceId, targetId, relationType, data = {}) {
        const typeConfig = this.relationshipTypes.get(relationType);
        
        // 타겟 노드 추가
        this.graph.addNode(targetId, {
            ...data,
            type: relationType
        });
        
        // 엣지 추가
        const edge = this.graph.addEdge(sourceId, targetId, {
            type: relationType,
            weight: typeConfig.weight,
            ...data
        });
        
        return edge;
    },
    
    /**
     * 상호작용 기록
     */
    recordInteraction(sourceId, targetId, interactionType = 'general') {
        const edge = this.graph.getEdge(sourceId, targetId);
        
        if (edge) {
            edge.interactions++;
            edge.weight += 0.1;
            edge.lastInteraction = Date.now();
        } else {
            this.addRelation(sourceId, targetId, 'ACQUAINTANCE', {
                interactionType
            });
        }
        
        // 노드 업데이트
        const node = this.graph.getNode(targetId);
        if (node) {
            node.lastInteraction = Date.now();
        }
        
        return edge;
    },
    
    /**
     * CSV에서 관계 데이터 로드
     */
    loadFromCSV(csvData, options = {}) {
        const { 
            sourceCol = 'source', 
            targetCol = 'target', 
            typeCol = 'type',
            weightCol = 'weight'
        } = options;
        
        csvData.forEach(row => {
            const source = row[sourceCol];
            const target = row[targetCol];
            const type = row[typeCol] || 'ACQUAINTANCE';
            const weight = parseFloat(row[weightCol]) || 1;
            
            if (source && target) {
                this.graph.addNode(source, { label: source });
                this.graph.addNode(target, { label: target });
                this.graph.addEdge(source, target, { type, weight });
            }
        });
        
        console.log(`[LinkMapper] CSV 로드: ${csvData.length} 관계`);
    },
    
    /**
     * 네트워크 분석 실행
     */
    analyze() {
        const physics = this.converter.convert(this.graph);
        
        this.lastResult = physics;
        this.history.push({
            timestamp: new Date().toISOString(),
            nodeCount: physics.metadata.stats.nodeCount,
            edgeCount: physics.metadata.stats.edgeCount
        });
        
        return physics;
    },
    
    /**
     * 추천 연결 찾기
     */
    findRecommendations(nodeId, count = 5) {
        const neighbors = this.graph.getNeighbors(nodeId);
        const neighborIds = new Set(neighbors.map(n => n.nodeId));
        neighborIds.add(nodeId);
        
        // 2차 연결 찾기 (친구의 친구)
        const secondDegree = new Map();
        
        neighbors.forEach(neighbor => {
            const theirNeighbors = this.graph.getNeighbors(neighbor.nodeId);
            theirNeighbors.forEach(n => {
                if (!neighborIds.has(n.nodeId)) {
                    const current = secondDegree.get(n.nodeId) || { count: 0, weight: 0 };
                    current.count++;
                    current.weight += neighbor.edge.weight;
                    secondDegree.set(n.nodeId, current);
                }
            });
        });
        
        // 점수 기반 정렬
        return Array.from(secondDegree.entries())
            .map(([id, data]) => ({
                nodeId: id,
                node: this.graph.getNode(id),
                mutualConnections: data.count,
                score: data.count * data.weight
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, count);
    },
    
    /**
     * 약한 연결 찾기 (리텐션 필요)
     */
    findWeakConnections(nodeId, daysSinceInteraction = 30) {
        const neighbors = this.graph.getNeighbors(nodeId);
        const cutoff = Date.now() - daysSinceInteraction * 24 * 60 * 60 * 1000;
        
        return neighbors
            .filter(n => n.edge.lastInteraction < cutoff)
            .map(n => ({
                nodeId: n.nodeId,
                node: this.graph.getNode(n.nodeId),
                daysSinceContact: Math.floor(
                    (Date.now() - n.edge.lastInteraction) / (24 * 60 * 60 * 1000)
                ),
                connectionStrength: n.edge.weight
            }))
            .sort((a, b) => b.daysSinceContact - a.daysSinceContact);
    },
    
    /**
     * 요약 생성
     */
    generateSummary() {
        if (!this.lastResult) {
            this.analyze();
        }
        
        const result = this.lastResult;
        const stats = result.metadata.stats;
        
        return {
            overview: {
                totalConnections: stats.nodeCount,
                totalRelationships: stats.edgeCount,
                avgConnectionsPerPerson: stats.avgDegree,
                networkDensity: `${(stats.density * 100).toFixed(1)}%`
            },
            
            interpretation: {
                mass: result.mass > 30 
                    ? '🌐 넓은 인맥 네트워크'
                    : result.mass > 15 
                        ? '👥 적정 규모 네트워크'
                        : '🔗 소규모 네트워크',
                
                energy: result.energy > 50 
                    ? '⚡ 활발한 상호작용'
                    : result.energy > 25 
                        ? '💬 보통 활동 수준'
                        : '💤 상호작용 필요',
                
                entropy: result.entropy > 0.7 
                    ? '🌊 분산된 네트워크'
                    : result.entropy > 0.4 
                        ? '⚖️ 균형잡힌 네트워크'
                        : '🎯 집중된 네트워크'
            },
            
            keyPeople: result.metadata.topNodes.map(n => ({
                name: n.node?.label || n.nodeId,
                importance: Math.round(n.combined * 100) / 100
            })),
            
            communities: `${result.metadata.communityCount}개 그룹`
        };
    },
    
    /**
     * 상태 조회
     */
    getStatus() {
        const stats = this.analyzer.getBasicStats(this.graph);
        
        return {
            nodeCount: stats.nodeCount,
            edgeCount: stats.edgeCount,
            historyCount: this.history.length,
            lastAnalysis: this.history[this.history.length - 1]?.timestamp
        };
    },
    
    /**
     * 그래프 내보내기
     */
    export() {
        return this.graph.toJSON();
    },
    
    /**
     * 그래프 가져오기
     */
    import(data) {
        this.graph.fromJSON(data);
        return this;
    },
    
    /**
     * 초기화
     */
    clear() {
        this.graph.clear();
        this.lastResult = null;
        this.history = [];
    }
};

// ================================================================
// 테스트 함수
// ================================================================

export async function testLinkMapper() {
    console.log('='.repeat(50));
    console.log('[TEST] LinkMapper 테스트');
    console.log('='.repeat(50));
    
    // 새 그래프 생성
    LinkMapper.init();
    
    // 중심 노드 (사용자)
    LinkMapper.setCenter('USER', { label: '나' });
    
    // 관계 추가
    console.log('\n[TEST] 관계 추가:');
    LinkMapper.addRelation('USER', 'mom', 'FAMILY', { label: '엄마' });
    LinkMapper.addRelation('USER', 'dad', 'FAMILY', { label: '아빠' });
    LinkMapper.addRelation('USER', 'friend1', 'FRIEND', { label: '철수' });
    LinkMapper.addRelation('USER', 'friend2', 'FRIEND', { label: '영희' });
    LinkMapper.addRelation('USER', 'colleague1', 'COLLEAGUE', { label: '김과장' });
    LinkMapper.addRelation('USER', 'mentor', 'MENTOR', { label: '박선생님' });
    
    // 친구 사이 연결
    LinkMapper.graph.addEdge('friend1', 'friend2', { type: 'FRIEND', weight: 3 });
    
    console.log('노드 수:', LinkMapper.graph.nodes.size);
    console.log('엣지 수:', LinkMapper.graph.edges.size);
    
    // 분석
    console.log('\n[TEST] 네트워크 분석:');
    const physics = LinkMapper.analyze();
    
    console.log('Mass:', physics.mass);
    console.log('Energy:', physics.energy);
    console.log('Entropy:', physics.entropy);
    console.log('Velocity:', physics.velocity);
    
    // 중심 노드
    console.log('\n[TEST] 중요 노드:');
    physics.metadata.topNodes.forEach((n, i) => {
        console.log(`${i + 1}. ${n.node?.label || n.nodeId} (중요도: ${n.combined.toFixed(2)})`);
    });
    
    // 커뮤니티
    console.log('\n[TEST] 커뮤니티 수:', physics.metadata.communityCount);
    
    // 요약
    console.log('\n[TEST] 요약:');
    const summary = LinkMapper.generateSummary();
    console.log(summary.interpretation);
    
    console.log('\n' + '='.repeat(50));
    console.log('[TEST] 완료!');
    console.log('='.repeat(50));
    
    return physics;
}

// ================================================================
// EXPORTS
// ================================================================

export { 
    NetworkGraph, 
    GraphNode, 
    GraphEdge,
    NetworkAnalyzer, 
    RelationshipTypes,
    LinkPhysicsConverter 
};

export default LinkMapper;




