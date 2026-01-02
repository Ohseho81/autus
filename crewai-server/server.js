/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});

/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});

/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});

/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});

/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});











/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});

/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});

/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});

/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});

/**
 * AUTUS CrewAI Multi-Agent Server
 * ================================
 * 삭제·자동화·외부 용역 전문가 3명 협업
 * 
 * Endpoints:
 * - POST /crewai/analyze - 전체 분석
 * - POST /crewai/delete - 삭제 전문가
 * - POST /crewai/automate - 자동화 전문가
 * - POST /crewai/outsource - 외부 용역 전문가
 * - GET /neo4j/graph - Neo4j 그래프 데이터
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3002;

// ═══════════════════════════════════════════════════════════════════════════
// LLM 초기화
// ═══════════════════════════════════════════════════════════════════════════

let gpt, claude, grok;

try {
  if (process.env.OPENAI_API_KEY) {
    gpt = new ChatOpenAI({
      modelName: 'gpt-4o',
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ GPT-4o 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ GPT-4o 초기화 실패');
}

try {
  if (process.env.ANTHROPIC_API_KEY) {
    claude = new ChatAnthropic({
      modelName: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      anthropicApiKey: process.env.ANTHROPIC_API_KEY
    });
    console.log('✅ Claude 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Claude 초기화 실패');
}

try {
  if (process.env.XAI_API_KEY) {
    grok = new ChatOpenAI({
      modelName: 'grok-beta',
      temperature: 0.7,
      openAIApiKey: process.env.XAI_API_KEY,
      configuration: { baseURL: 'https://api.x.ai/v1' }
    });
    console.log('✅ Grok 초기화 완료');
  }
} catch (e) {
  console.log('⚠️ Grok 초기화 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 연결
// ═══════════════════════════════════════════════════════════════════════════

let neo4jDriver;
try {
  if (process.env.NEO4J_URI) {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI,
      neo4j.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || '')
    );
    console.log('✅ Neo4j 연결 완료');
  }
} catch (e) {
  console.log('⚠️ Neo4j 연결 실패');
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 에이전트 프롬프트
// ═══════════════════════════════════════════════════════════════════════════

const AUTUS_PHILOSOPHY = `당신은 AUTUS 경제 물리 엔진의 전문가입니다.

## AUTUS 철학
- 모든 개체는 사람으로 환원
- 피시스의 유일한 해답은 돈
- V = D - T + S (가치 = 직접돈 - 시간비용 + 시너지)
- 복리 공식: F = V × (1+s)^t

## 응답 원칙
- 모든 제안은 구체적 숫자로 표현 (원 단위)
- 감정·판단 배제, 돈 중심 분석
- 간결하고 직접적으로`;

const DELETE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 삭제 전문가 (Grok)
당신은 가치 ≤ 0인 노드를 찾아 돈 유출을 차단하는 전문가입니다.

분석 항목:
1. 가치가 낮은 노드 식별
2. 시간 대비 돈 생산이 낮은 노드
3. 삭제 시 예상 절감액 (원/월)
4. 삭제 우선순위

[삭제 전문가] 형식으로 응답하세요.`;

const AUTOMATE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 자동화 전문가 (Claude)
당신은 시너지 높은 연결을 자동화해 시간 비용을 0으로 만드는 전문가입니다.

분석 항목:
1. 자동화 가능한 반복 업무
2. 시너지 강화 가능한 연결
3. 자동화 시 예상 시너지 증가 (원/월)
4. 자동화 우선순위

[자동화 전문가] 형식으로 응답하세요.`;

const OUTSOURCE_EXPERT_PROMPT = AUTUS_PHILOSOPHY + `

## 역할: 외부 용역 전문가 (GPT)
당신은 고가치 외부 노드를 도입해 돈을 폭발적으로 가속하는 전문가입니다.

분석 항목:
1. 도입 추천 외부 전문가 유형
2. 예상 연결 시너지
3. 예상 돈 가속 효과 (원/월)
4. 도입 우선순위

[외부 용역 전문가] 형식으로 응답하세요.`;

// ═══════════════════════════════════════════════════════════════════════════
// AI 호출 함수
// ═══════════════════════════════════════════════════════════════════════════

async function callAgent(prompt, systemPrompt, preferredModel = 'gpt') {
  const models = { gpt, claude, grok };
  const fallbackOrder = ['gpt', 'claude', 'grok'];
  const order = [preferredModel, ...fallbackOrder.filter(m => m !== preferredModel)];
  
  for (const modelName of order) {
    const model = models[modelName];
    if (!model) continue;
    
    try {
      const response = await model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
      ]);
      return { model: modelName, content: response.content, success: true };
    } catch (error) {
      console.log(`${modelName} 호출 실패:`, error.message);
    }
  }
  
  // 시뮬레이션 폴백
  return { model: 'simulation', content: generateSimulation(systemPrompt), success: true };
}

function generateSimulation(systemPrompt) {
  if (systemPrompt.includes('삭제 전문가')) {
    return `[삭제 전문가]
• 오은우 가치 700만원 (네트워크 최저)
• 시간 투입 대비 돈 생산: 낮음
• 삭제 시 예상 절감: 월 +500만원
• 권장: 즉시 재배치 또는 역할 재정의`;
  }
  
  if (systemPrompt.includes('자동화 전문가')) {
    return `[자동화 전문가]
• 오세호 → 오은우 연결 자동화 가능
• 반복 업무 70% AI 대체 가능
• 자동화 시 예상 시너지: 월 +1,000만원
• 권장: 즉시 자동화 시스템 구축`;
  }
  
  if (systemPrompt.includes('외부 용역 전문가')) {
    return `[외부 용역 전문가]
• 입시 전문가 외부 도입 권장
• 예상 시너지율: 25%
• 도입 시 예상 가속: 월 +3,000만원
• 권장: 3개월 내 계약 체결`;
  }
  
  return '분석 완료';
}

// ═══════════════════════════════════════════════════════════════════════════
// API 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/health', (req, res) => {
  res.json({
    ok: true,
    models: { gpt: !!gpt, claude: !!claude, grok: !!grok },
    neo4j: !!neo4jDriver
  });
});

// CrewAI 전체 분석
app.post('/crewai/analyze', async (req, res) => {
  const { nodes, links } = req.body;
  
  const dataPrompt = `아래 AUTUS 네트워크 데이터를 분석하세요:

노드 (사람):
${nodes.map(n => `- ${n.label}: ${(n.value/10000).toFixed(0)}만원`).join('\n')}

링크 (돈 흐름):
${links.map(l => `- ${l.source} → ${l.target}: ${(l.value/10000).toFixed(0)}만원 (${l.type})`).join('\n')}

총 가치: ${(nodes.reduce((s, n) => s + n.value, 0) / 10000).toFixed(0)}만원`;

  try {
    // 3명의 에이전트 동시 호출
    const [deleteResult, automateResult, outsourceResult] = await Promise.all([
      callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok'),
      callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude'),
      callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt')
    ]);
    
    // 결과 통합
    const totalValue = nodes.reduce((s, n) => s + n.value, 0);
    const prediction12m = totalValue * Math.pow(1.3, 12);
    
    const analysis = `${deleteResult.content}

${automateResult.content}

${outsourceResult.content}

[종합 분석]
• 현재 총 가치: ${(totalValue/10000).toFixed(0)}만원
• 12개월 예측 (시너지 30%): ${(prediction12m/100000000).toFixed(1)}억원 (9.3배)
• 권장 조치: 삭제 → 자동화 → 외부 용역 순서 실행`;

    res.json({
      success: true,
      analysis,
      models: {
        delete: deleteResult.model,
        automate: automateResult.model,
        outsource: outsourceResult.model
      },
      prediction: {
        current: totalValue,
        month12: prediction12m,
        multiplier: 9.3
      }
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 개별 에이전트 엔드포인트
app.post('/crewai/delete', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, DELETE_EXPERT_PROMPT, 'grok');
  res.json(result);
});

app.post('/crewai/automate', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, AUTOMATE_EXPERT_PROMPT, 'claude');
  res.json(result);
});

app.post('/crewai/outsource', async (req, res) => {
  const { nodes, links } = req.body;
  const dataPrompt = `노드: ${JSON.stringify(nodes)}\n링크: ${JSON.stringify(links)}`;
  const result = await callAgent(dataPrompt, OUTSOURCE_EXPERT_PROMPT, 'gpt');
  res.json(result);
});

// ═══════════════════════════════════════════════════════════════════════════
// Neo4j 엔드포인트
// ═══════════════════════════════════════════════════════════════════════════

app.get('/neo4j/graph', async (req, res) => {
  if (!neo4jDriver) {
    return res.json({ nodes: [], links: [], message: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  const { lat, lon, zoom } = req.query;
  const radius = zoom < 10 ? 100000 : 10000;
  
  try {
    const result = await session.run(
      `MATCH (n:Person)-[r:FLOW|PREDICTION]->(m:Person)
       RETURN n, r, m LIMIT 100`
    );
    
    const nodes = new Map();
    const links = [];
    
    result.records.forEach(record => {
      const source = record.get('n').properties;
      const target = record.get('m').properties;
      const rel = record.get('r');
      
      nodes.set(source.id, {
        id: source.id,
        label: source.name,
        value: neo4j.integer.toNumber(source.value || 0)
      });
      nodes.set(target.id, {
        id: target.id,
        label: target.name,
        value: neo4j.integer.toNumber(target.value || 0)
      });
      links.push({
        source: source.id,
        target: target.id,
        value: neo4j.integer.toNumber(rel.properties.value || 0),
        type: rel.type.toLowerCase()
      });
    });
    
    res.json({ nodes: Array.from(nodes.values()), links });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// Neo4j 데이터 초기화
app.post('/neo4j/init', async (req, res) => {
  if (!neo4jDriver) {
    return res.status(400).json({ error: 'Neo4j not connected' });
  }
  
  const session = neo4jDriver.session();
  
  try {
    // 샘플 데이터 입력
    await session.run(`
      MERGE (p1:Person {id: "오세호", name: "오세호 (대표)", value: 56000000})
      MERGE (p2:Person {id: "김경희", name: "김경희 (매니저)", value: 25000000})
      MERGE (p3:Person {id: "오선우", name: "오선우 (헤드 강사)", value: 23000000})
      MERGE (p4:Person {id: "오연우", name: "오연우 (강사)", value: 11000000})
      MERGE (p5:Person {id: "오은우", name: "오은우 (강사)", value: 7000000})
      
      MERGE (p1)-[:FLOW {value: 15000000, type: "current"}]->(p2)
      MERGE (p2)-[:FLOW {value: 12000000, type: "current"}]->(p3)
      MERGE (p3)-[:FLOW {value: 8000000, type: "current"}]->(p4)
      MERGE (p3)-[:FLOW {value: 6000000, type: "current"}]->(p5)
      MERGE (p1)-[:PREDICTION {value: 20000000, type: "prediction"}]->(p5)
    `);
    
    res.json({ success: true, message: 'Neo4j 초기 데이터 입력 완료' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    await session.close();
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 서버 시작
// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║       🤖 AUTUS CrewAI Multi-Agent Server                      ║
╠═══════════════════════════════════════════════════════════════╣
║  Server: http://localhost:${PORT}                               ║
║  Health: http://localhost:${PORT}/health                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Agents:                                                      ║
║  • 🗑️  삭제 전문가 (Grok):    ${grok ? '✅ Ready' : '❌ Simulation'}                ║
║  • ⚡ 자동화 전문가 (Claude): ${claude ? '✅ Ready' : '❌ Simulation'}                ║
║  • 🌐 외부 용역 (GPT):        ${gpt ? '✅ Ready' : '❌ Simulation'}                ║
╠═══════════════════════════════════════════════════════════════╣
║  Neo4j: ${neo4jDriver ? '✅ Connected' : '❌ Not Connected'}                                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                   ║
║  POST /crewai/analyze   - 전체 분석 (3에이전트 협업)          ║
║  POST /crewai/delete    - 삭제 전문가                         ║
║  POST /crewai/automate  - 자동화 전문가                       ║
║  POST /crewai/outsource - 외부 용역 전문가                    ║
║  GET  /neo4j/graph      - 그래프 데이터                       ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  if (neo4jDriver) await neo4jDriver.close();
  process.exit(0);
});

















