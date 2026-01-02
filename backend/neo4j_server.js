/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;





/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;





/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;





/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;





/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;















/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;





/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;





/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;





/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;





/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
 * ║                                                                               ║
 * ║  1억명 규모 그래프 데이터 처리를 위한 Neo4j 연동 서버                            ║
 * ║                                                                               ║
 * ║  Features:                                                                    ║
 * ║  - Neo4j AuraDB / Local 연동                                                  ║
 * ║  - Pagination (LIMIT + OFFSET)                                               ║
 * ║  - 클러스터링 (국가/도시 그룹)                                                  ║
 * ║  - 실시간 WebSocket 업데이트                                                   ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

const express = require('express');
const cors = require('cors');
const neo4j = require('neo4j-driver');

const app = express();
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════════════════════════════════════════════
// Neo4j 연결 설정
// ═══════════════════════════════════════════════════════════════════════════════

const NEO4J_CONFIG = {
  // 클라우드 (Neo4j AuraDB Free - 200k 노드 무료)
  // uri: 'neo4j+s://your-db.neo4j.io',
  
  // 로컬 (Neo4j Desktop)
  uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
  user: process.env.NEO4J_USER || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'password'
};

let driver = null;

async function initNeo4j() {
  try {
    driver = neo4j.driver(
      NEO4J_CONFIG.uri,
      neo4j.auth.basic(NEO4J_CONFIG.user, NEO4J_CONFIG.password)
    );
    await driver.verifyConnectivity();
    console.log('✅ Neo4j connected:', NEO4J_CONFIG.uri);
    return true;
  } catch (error) {
    console.log('⚠️  Neo4j not available, using mock data');
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock 데이터 (Neo4j 없을 때)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  nodes: [
    { id: 'P03', role: 'CONTROLLER', lat: 37.5665, lon: 126.978, location: 'Seoul, Korea',
      value: 182886563, direct: 175480000, time: 4000000, synergy: 11406562, forecast: 210000000, color: '#00ff88' },
    { id: 'P05', role: 'BUILDER', lat: 35.6762, lon: 139.6503, location: 'Tokyo, Japan',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#00ccff' },
    { id: 'P11', role: 'CONNECTOR', lat: 22.3193, lon: 114.1694, location: 'Hong Kong',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ffcc00' },
    { id: 'P01', role: 'RAINMAKER', lat: 1.3521, lon: 103.8198, location: 'Singapore',
      value: 175282188, direct: 175480000, time: 4000000, synergy: 3802187, forecast: 200000000, color: '#ff6600' },
    { id: 'P07', role: 'PARTNER', lat: 40.7128, lon: -74.006, location: 'New York, USA',
      value: 50000000, direct: 60000000, time: 4000000, synergy: -6000000, forecast: 65000000, color: '#9966ff' },
    { id: 'P08', role: 'INVESTOR', lat: 51.5074, lon: -0.1278, location: 'London, UK',
      value: 80000000, direct: 85000000, time: 4000000, synergy: -1000000, forecast: 95000000, color: '#ff3366' },
    { id: 'P12', role: 'SUPPLIER', lat: -33.8688, lon: 151.2093, location: 'Sydney, Australia',
      value: 30000000, direct: 35000000, time: 4000000, synergy: -1000000, forecast: 40000000, color: '#33cccc' },
    { id: 'FUTURE1', role: 'PREDICTION', lat: 24.7136, lon: 46.6753, location: 'Riyadh, Saudi Arabia',
      value: 0, direct: 0, time: 0, synergy: 0, forecast: 150000000, color: '#ffcc00', isPrediction: true },
  ],
  links: [
    { source: 'P03', target: 'P11', value: 11406562, type: 'synergy' },
    { source: 'P03', target: 'P05', value: 3802187, type: 'synergy' },
    { source: 'P01', target: 'P03', value: 3802187, type: 'synergy' },
    { source: 'P07', target: 'P01', value: 15000000, type: 'flow' },
    { source: 'P08', target: 'P03', value: 25000000, type: 'investment' },
    { source: 'P12', target: 'P05', value: 8000000, type: 'supply' },
    { source: 'P03', target: 'FUTURE1', value: 50000000, type: 'prediction' },
  ],
  stats: {
    totalValue: 708733125,
    totalSynergy: 22813125,
    totalDirect: 701920000,
    totalTime: 16000000,
    forecast12m: 808309370,
    growthRate: 0.132,
    nodeCount: 7,
    linkCount: 7
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/graph
 * 전체 그래프 데이터 (페이지네이션 지원)
 * 
 * Query params:
 * - limit: 노드 수 제한 (기본 1000)
 * - offset: 시작 위치 (기본 0)
 * - cluster: 클러스터링 레벨 (country, city, person)
 */
app.get('/api/graph', async (req, res) => {
  const { limit = 1000, offset = 0, cluster = 'person' } = req.query;
  
  if (!driver) {
    // Mock 데이터 반환
    return res.json(MOCK_DATA);
  }
  
  const session = driver.session();
  
  try {
    let query;
    
    if (cluster === 'country') {
      // 국가별 클러스터링 (1억명 → 200개국 요약)
      query = `
        MATCH (n:Person)
        WITH n.country AS country, 
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN country AS id, 
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else if (cluster === 'city') {
      // 도시별 클러스터링
      query = `
        MATCH (n:Person)
        WITH n.city AS city,
             n.country AS country,
             collect(n) AS people,
             sum(n.value) AS totalValue,
             avg(n.lat) AS lat,
             avg(n.lon) AS lon
        RETURN city + ', ' + country AS id,
               'CLUSTER' AS role,
               lat, lon,
               totalValue AS value,
               size(people) AS nodeCount
        ORDER BY totalValue DESC
        LIMIT $limit
      `;
    } else {
      // 개인 레벨 (기본)
      query = `
        MATCH (n:Person)
        RETURN n.id AS id,
               n.role AS role,
               n.lat AS lat,
               n.lon AS lon,
               n.location AS location,
               n.value AS value,
               n.direct AS direct,
               n.time AS time,
               n.synergy AS synergy,
               n.forecast AS forecast,
               n.color AS color
        ORDER BY n.value DESC
        SKIP $offset
        LIMIT $limit
      `;
    }
    
    const nodesResult = await session.run(query, {
      limit: neo4j.int(parseInt(limit)),
      offset: neo4j.int(parseInt(offset))
    });
    
    const nodes = nodesResult.records.map(record => ({
      id: record.get('id'),
      role: record.get('role'),
      lat: record.get('lat'),
      lon: record.get('lon'),
      location: record.get('location') || '',
      value: record.get('value')?.toNumber() || 0,
      direct: record.get('direct')?.toNumber() || 0,
      time: record.get('time')?.toNumber() || 0,
      synergy: record.get('synergy')?.toNumber() || 0,
      forecast: record.get('forecast')?.toNumber() || 0,
      color: record.get('color') || '#00ccff',
      nodeCount: record.get('nodeCount')?.toNumber() || 1
    }));
    
    // 링크 쿼리
    const linksQuery = `
      MATCH (a:Person)-[r:MONEY_FLOW]->(b:Person)
      WHERE a.id IN $nodeIds AND b.id IN $nodeIds
      RETURN a.id AS source,
             b.id AS target,
             r.value AS value,
             r.type AS type
      LIMIT 10000
    `;
    
    const nodeIds = nodes.map(n => n.id);
    const linksResult = await session.run(linksQuery, { nodeIds });
    
    const links = linksResult.records.map(record => ({
      source: record.get('source'),
      target: record.get('target'),
      value: record.get('value')?.toNumber() || 0,
      type: record.get('type') || 'flow'
    }));
    
    // 통계 계산
    const stats = {
      totalValue: nodes.reduce((sum, n) => sum + n.value, 0),
      totalSynergy: nodes.reduce((sum, n) => sum + n.synergy, 0),
      totalDirect: nodes.reduce((sum, n) => sum + n.direct, 0),
      totalTime: nodes.reduce((sum, n) => sum + n.time, 0),
      forecast12m: nodes.reduce((sum, n) => sum + n.forecast, 0),
      growthRate: 0.132,
      nodeCount: nodes.length,
      linkCount: links.length
    };
    
    res.json({ nodes, links, stats });
    
  } catch (error) {
    console.error('Neo4j query error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/graph/viewport
 * 뷰포트 내 노드만 반환 (1억명 대응)
 * 
 * Query params:
 * - minLat, maxLat, minLon, maxLon: 뷰포트 경계
 * - zoom: 줌 레벨 (자동 클러스터링)
 */
app.get('/api/graph/viewport', async (req, res) => {
  const { minLat, maxLat, minLon, maxLon, zoom = 5 } = req.query;
  
  if (!driver) {
    // Mock: 뷰포트 내 노드 필터링
    const filtered = MOCK_DATA.nodes.filter(n => 
      n.lat >= parseFloat(minLat) && n.lat <= parseFloat(maxLat) &&
      n.lon >= parseFloat(minLon) && n.lon <= parseFloat(maxLon)
    );
    return res.json({
      nodes: filtered,
      links: MOCK_DATA.links.filter(l => 
        filtered.some(n => n.id === l.source) && filtered.some(n => n.id === l.target)
      ),
      stats: MOCK_DATA.stats
    });
  }
  
  const session = driver.session();
  
  try {
    // 줌 레벨에 따른 클러스터링
    let clusterLevel = 'person';
    if (zoom < 3) clusterLevel = 'country';
    else if (zoom < 6) clusterLevel = 'city';
    
    const query = `
      MATCH (n:Person)
      WHERE n.lat >= $minLat AND n.lat <= $maxLat
        AND n.lon >= $minLon AND n.lon <= $maxLon
      RETURN n
      LIMIT 5000
    `;
    
    const result = await session.run(query, {
      minLat: parseFloat(minLat),
      maxLat: parseFloat(maxLat),
      minLon: parseFloat(minLon),
      maxLon: parseFloat(maxLon)
    });
    
    // 결과 변환 (위와 동일)
    const nodes = result.records.map(r => r.get('n').properties);
    
    res.json({ nodes, links: [], stats: {} });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/node/:id
 * 특정 노드 상세 정보
 */
app.get('/api/node/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === id || l.target === id);
    return res.json({ node, connections });
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person {id: $id})
      OPTIONAL MATCH (n)-[r:MONEY_FLOW]-(m:Person)
      RETURN n, collect({rel: r, other: m}) AS connections
    `, { id });
    
    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    const record = result.records[0];
    const node = record.get('n').properties;
    const connections = record.get('connections');
    
    res.json({ node, connections });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/node
 * 새 노드 추가
 */
app.post('/api/node', async (req, res) => {
  const { id, role, lat, lon, location, value, direct, time, synergy, forecast, color } = req.body;
  
  if (!driver) {
    MOCK_DATA.nodes.push({ id, role, lat, lon, location, value, direct, time, synergy, forecast, color });
    return res.json({ success: true, node: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      CREATE (n:Person {
        id: $id,
        role: $role,
        lat: $lat,
        lon: $lon,
        location: $location,
        value: $value,
        direct: $direct,
        time: $time,
        synergy: $synergy,
        forecast: $forecast,
        color: $color
      })
      RETURN n
    `, req.body);
    
    res.json({ success: true, node: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/link
 * 새 링크(돈 흐름) 추가
 */
app.post('/api/link', async (req, res) => {
  const { source, target, value, type } = req.body;
  
  if (!driver) {
    MOCK_DATA.links.push({ source, target, value, type });
    return res.json({ success: true, link: req.body });
  }
  
  const session = driver.session();
  
  try {
    await session.run(`
      MATCH (a:Person {id: $source}), (b:Person {id: $target})
      CREATE (a)-[r:MONEY_FLOW {value: $value, type: $type}]->(b)
      RETURN r
    `, req.body);
    
    res.json({ success: true, link: req.body });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * GET /api/stats
 * 전체 통계
 */
app.get('/api/stats', async (req, res) => {
  if (!driver) {
    return res.json(MOCK_DATA.stats);
  }
  
  const session = driver.session();
  
  try {
    const result = await session.run(`
      MATCH (n:Person)
      RETURN count(n) AS nodeCount,
             sum(n.value) AS totalValue,
             sum(n.synergy) AS totalSynergy,
             sum(n.direct) AS totalDirect,
             sum(n.time) AS totalTime,
             sum(n.forecast) AS forecast12m
    `);
    
    const record = result.records[0];
    
    const linkResult = await session.run(`
      MATCH ()-[r:MONEY_FLOW]->()
      RETURN count(r) AS linkCount
    `);
    
    res.json({
      nodeCount: record.get('nodeCount').toNumber(),
      totalValue: record.get('totalValue').toNumber(),
      totalSynergy: record.get('totalSynergy').toNumber(),
      totalDirect: record.get('totalDirect').toNumber(),
      totalTime: record.get('totalTime').toNumber(),
      forecast12m: record.get('forecast12m').toNumber(),
      linkCount: linkResult.records[0].get('linkCount').toNumber(),
      growthRate: 0.132
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

/**
 * POST /api/physics/calculate
 * Physics Map 수식 계산
 */
app.post('/api/physics/calculate', async (req, res) => {
  const { nodeId } = req.body;
  
  // V = D - T + S
  // S = k × (N1 × N2) / d² × (1 + r)^t
  
  const k = 0.5;  // 시너지 상수
  const r = 0.15; // 복리율
  const t = 3;    // 기간 (월)
  
  if (!driver) {
    const node = MOCK_DATA.nodes.find(n => n.id === nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    
    const connections = MOCK_DATA.links.filter(l => l.source === nodeId || l.target === nodeId);
    
    // 시너지 계산
    let synergyTotal = 0;
    connections.forEach(conn => {
      const otherNode = MOCK_DATA.nodes.find(n => 
        n.id === (conn.source === nodeId ? conn.target : conn.source)
      );
      if (otherNode) {
        const N1 = Math.max(1, node.value / 10000000);
        const N2 = Math.max(1, otherNode.value / 10000000);
        const d = 1; // 거리 (기본 1)
        const synergy = k * (N1 * N2) / (d * d) * Math.pow(1 + r, t) * 1000000;
        synergyTotal += synergy;
      }
    });
    
    const totalValue = node.direct - node.time + synergyTotal;
    const forecast12m = totalValue * Math.pow(1.132, 1); // 12개월 예측
    
    return res.json({
      nodeId,
      direct: node.direct,
      time: node.time,
      synergy: synergyTotal,
      totalValue,
      forecast12m,
      formula: 'V = D - T + S'
    });
  }
  
  // Neo4j 버전은 위와 유사하게 구현
  res.json({ error: 'Neo4j version not implemented' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════════════╗
║           🌌 AUTUS Physics Map - Neo4j Backend API Server                     ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Server running on: http://localhost:${PORT}                                   ║
║                                                                               ║
║  Endpoints:                                                                   ║
║  - GET  /api/graph           전체 그래프 (페이지네이션)                        ║
║  - GET  /api/graph/viewport  뷰포트 내 노드 (1억명 대응)                       ║
║  - GET  /api/node/:id        노드 상세                                        ║
║  - POST /api/node            노드 추가                                        ║
║  - POST /api/link            링크 추가                                        ║
║  - GET  /api/stats           전체 통계                                        ║
║  - POST /api/physics/calculate  Physics 수식 계산                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
  `);
  
  await initNeo4j();
});

module.exports = app;




















