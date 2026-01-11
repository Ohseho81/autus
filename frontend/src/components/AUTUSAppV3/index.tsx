/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS App V2.1 - Mobile-First Design
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = 'home' | 'mission' | 'trinity' | 'setup' | 'me';
type NodeState = 'IGNORABLE' | 'PRESSURING' | 'IRREVERSIBLE';
type LayerId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

interface Node {
  id: string;
  name: string;
  icon: string;
  layer: LayerId;
  active: boolean;
  value: number;
  pressure: number;
  state: NodeState;
}

interface Circuit {
  name: string;
  ids: string[];
  value: number;
}

interface Mission {
  id: number;
  title: string;
  type: string;
  icon: string;
  status: string;
  progress: number;
  eta: string;
  steps: { t: string; s: string }[];
}

interface Connector {
  id: string;
  name: string;
  icon: string;
  desc: string;
  on: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════════════════════════

const INITIAL_NODES: Record<string, Node> = {
  n01:{id:'n01',name:'현금',icon:'💵',layer:'L1',active:true,value:25000000,pressure:0.45,state:'PRESSURING'},
  n02:{id:'n02',name:'수입',icon:'📈',layer:'L1',active:false,value:8000000,pressure:0.20,state:'IGNORABLE'},
  n03:{id:'n03',name:'지출',icon:'📉',layer:'L1',active:false,value:6500000,pressure:0.35,state:'PRESSURING'},
  n04:{id:'n04',name:'부채',icon:'💳',layer:'L1',active:false,value:30000000,pressure:0.25,state:'IGNORABLE'},
  n05:{id:'n05',name:'런웨이',icon:'⏱️',layer:'L1',active:true,value:9,pressure:0.75,state:'IRREVERSIBLE'},
  n06:{id:'n06',name:'예비비',icon:'🛡️',layer:'L1',active:true,value:5000000,pressure:0.85,state:'IRREVERSIBLE'},
  n07:{id:'n07',name:'미수금',icon:'📄',layer:'L1',active:false,value:8000000,pressure:0.15,state:'IGNORABLE'},
  n08:{id:'n08',name:'마진',icon:'💹',layer:'L1',active:false,value:18,pressure:0.28,state:'IGNORABLE'},
  n09:{id:'n09',name:'수면',icon:'😴',layer:'L2',active:true,value:5.0,pressure:0.55,state:'PRESSURING'},
  n10:{id:'n10',name:'HRV',icon:'💓',layer:'L2',active:true,value:32,pressure:0.60,state:'PRESSURING'},
  n11:{id:'n11',name:'활동량',icon:'🏃',layer:'L2',active:false,value:35,pressure:0.25,state:'IGNORABLE'},
  n12:{id:'n12',name:'연속작업',icon:'⌨️',layer:'L2',active:false,value:4.5,pressure:0.42,state:'PRESSURING'},
  n13:{id:'n13',name:'휴식간격',icon:'☕',layer:'L2',active:false,value:2.5,pressure:0.33,state:'PRESSURING'},
  n14:{id:'n14',name:'병가',icon:'🏥',layer:'L2',active:false,value:0,pressure:0.00,state:'IGNORABLE'},
  n15:{id:'n15',name:'마감',icon:'📅',layer:'L3',active:true,value:7,pressure:0.58,state:'PRESSURING'},
  n16:{id:'n16',name:'지연',icon:'⏰',layer:'L3',active:true,value:5,pressure:0.25,state:'IGNORABLE'},
  n17:{id:'n17',name:'가동률',icon:'⚡',layer:'L3',active:false,value:78,pressure:0.22,state:'IGNORABLE'},
  n18:{id:'n18',name:'태스크',icon:'📋',layer:'L3',active:true,value:38,pressure:0.58,state:'PRESSURING'},
  n19:{id:'n19',name:'오류율',icon:'🐛',layer:'L3',active:false,value:3.2,pressure:0.28,state:'IGNORABLE'},
  n20:{id:'n20',name:'처리속도',icon:'🚀',layer:'L3',active:false,value:15,pressure:0.30,state:'PRESSURING'},
  n21:{id:'n21',name:'재고',icon:'📦',layer:'L3',active:false,value:18,pressure:0.20,state:'IGNORABLE'},
  n22:{id:'n22',name:'의존도',icon:'🔗',layer:'L3',active:false,value:35,pressure:0.22,state:'IGNORABLE'},
  n23:{id:'n23',name:'고객수',icon:'👤',layer:'L4',active:true,value:45,pressure:0.30,state:'PRESSURING'},
  n24:{id:'n24',name:'이탈률',icon:'🚪',layer:'L4',active:true,value:7,pressure:0.48,state:'PRESSURING'},
  n25:{id:'n25',name:'NPS',icon:'⭐',layer:'L4',active:false,value:32,pressure:0.24,state:'IGNORABLE'},
  n26:{id:'n26',name:'반복구매',icon:'🔄',layer:'L4',active:false,value:22,pressure:0.30,state:'PRESSURING'},
  n27:{id:'n27',name:'CAC',icon:'💰',layer:'L4',active:false,value:85000,pressure:0.28,state:'IGNORABLE'},
  n28:{id:'n28',name:'LTV',icon:'💎',layer:'L4',active:false,value:280000,pressure:0.25,state:'IGNORABLE'},
  n29:{id:'n29',name:'리드',icon:'📥',layer:'L4',active:true,value:6,pressure:0.20,state:'IGNORABLE'},
  n30:{id:'n30',name:'직원',icon:'👥',layer:'L5',active:false,value:5,pressure:0.15,state:'IGNORABLE'},
  n31:{id:'n31',name:'이직률',icon:'🚶',layer:'L5',active:false,value:12,pressure:0.18,state:'IGNORABLE'},
  n32:{id:'n32',name:'경쟁자',icon:'🎯',layer:'L5',active:false,value:5,pressure:0.22,state:'IGNORABLE'},
  n33:{id:'n33',name:'시장성장',icon:'📊',layer:'L5',active:false,value:8,pressure:0.20,state:'IGNORABLE'},
  n34:{id:'n34',name:'환율',icon:'💱',layer:'L5',active:false,value:5,pressure:0.18,state:'IGNORABLE'},
  n35:{id:'n35',name:'금리',icon:'🏦',layer:'L5',active:false,value:4.5,pressure:0.25,state:'IGNORABLE'},
  n36:{id:'n36',name:'규제',icon:'📜',layer:'L5',active:false,value:1,pressure:0.10,state:'IGNORABLE'}
};

const LAYERS: Record<LayerId, { name: string; ids: string[] }> = {
  L1:{name:'💰 재무',ids:['n01','n02','n03','n04','n05','n06','n07','n08']},
  L2:{name:'❤️ 생체',ids:['n09','n10','n11','n12','n13','n14']},
  L3:{name:'⚙️ 운영',ids:['n15','n16','n17','n18','n19','n20','n21','n22']},
  L4:{name:'👥 고객',ids:['n23','n24','n25','n26','n27','n28','n29']},
  L5:{name:'🌍 외부',ids:['n30','n31','n32','n33','n34','n35','n36']}
};

const CIRCUITS: Circuit[] = [
  {name:'survival',ids:['n03','n01','n05'],value:0.40},
  {name:'fatigue',ids:['n18','n09','n10','n16'],value:0.43},
  {name:'repeat',ids:['n26','n02','n01'],value:0.15},
  {name:'people',ids:['n31','n17','n20'],value:0.08},
  {name:'growth',ids:['n29','n23','n02'],value:0.15}
];

const INITIAL_MISSIONS: Mission[] = [
  {id:1,title:'런웨이 개선',type:'자동화',icon:'🤖',status:'자동 실행 중',progress:67,eta:'1일 후',steps:[{t:'구독 서비스 분석 완료',s:'done'},{t:'불필요 항목 3개 식별',s:'done'},{t:'취소 요청 처리 중...',s:'active'},{t:'결과 리포트 생성',s:''}]},
  {id:2,title:'태스크 정리',type:'지시',icon:'📋',status:'김철수 검토 중',progress:33,eta:'2일 후',steps:[{t:'슬랙 메시지 발송됨',s:'done'},{t:'김철수 검토 중...',s:'active'},{t:'결과 보고 대기',s:''}]},
  {id:3,title:'세무 컨설팅',type:'외주',icon:'👥',status:'준비 중',progress:15,eta:'내일 시작',steps:[{t:'세무사 매칭 완료',s:'done'},{t:'계약서 생성 중...',s:'active'},{t:'데이터 전달',s:''},{t:'분석 진행',s:''}]}
];

const INITIAL_CONNECTORS: Connector[] = [
  {id:'bank',name:'오픈뱅킹',icon:'🏦',desc:'현금, 수입, 지출',on:true},
  {id:'health',name:'Apple Health',icon:'❤️',desc:'수면, HRV, 활동량',on:true},
  {id:'calendar',name:'Google Calendar',icon:'📅',desc:'마감, 일정',on:true},
  {id:'notion',name:'Notion',icon:'📋',desc:'태스크, 처리속도',on:false},
  {id:'slack',name:'Slack',icon:'💬',desc:'팀 커뮤니케이션',on:false}
];

const DEVICES: Connector[] = [
  {id:'camera',name:'카메라',icon:'📷',desc:'얼굴 인식, 피로도 감지',on:false},
  {id:'mic',name:'마이크',icon:'🎤',desc:'음성 명령, 스트레스 분석',on:false},
  {id:'location',name:'위치',icon:'📍',desc:'이동 패턴, 출퇴근 감지',on:false}
];

const WEB_SERVICES: Connector[] = [
  {id:'google',name:'Google 전체',icon:'🔵',desc:'Gmail, Drive, Calendar, Sheets',on:false},
  {id:'microsoft',name:'Microsoft 전체',icon:'🟦',desc:'Outlook, OneDrive, Teams',on:false},
  {id:'notion_web',name:'Notion',icon:'⬛',desc:'페이지, 데이터베이스, 워크스페이스',on:false},
  {id:'slack_web',name:'Slack',icon:'💜',desc:'메시지, 채널, 파일',on:false},
  {id:'github',name:'GitHub',icon:'🐙',desc:'레포, 이슈, PR',on:false},
  {id:'figma',name:'Figma',icon:'🎨',desc:'디자인, 프로토타입',on:false},
  {id:'linear',name:'Linear',icon:'🔷',desc:'이슈, 프로젝트, 사이클',on:false},
  {id:'bank_web',name:'은행/카드',icon:'💳',desc:'거래내역, 잔액, 청구서',on:false}
];

const VALUES = ['생존','성장','건강','가족','자유'];
const BOUNDARIES = {never:['파산','건강 붕괴'],limits:['부채 5천만 이하','수면 5시간 이상','런웨이 4주 이상']};

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const CSS = {
  bg: '#0a0a0f',
  bg2: '#12121a',
  bg3: '#1a1a2e',
  border: '#2a2a4e',
  text: '#e0e0e0',
  text2: '#888',
  text3: '#555',
  accent: '#00d4ff',
  success: '#00d46a',
  warning: '#ffa500',
  danger: '#ff3b3b',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════════════════════════════════════════

const fmt = (n: Node): string => {
  const v = n.value;
  if (['n01','n02','n03','n04','n06','n07','n27','n28'].includes(n.id)) {
    if (v >= 10000000) return (v/10000000).toFixed(1)+'천만';
    if (v >= 10000) return (v/10000).toFixed(0)+'만';
    return v.toLocaleString();
  }
  if (n.id === 'n05') return v+'주';
  if (['n09','n12','n13'].includes(n.id)) return v.toFixed(1)+'h';
  if (n.id === 'n10') return v+'ms';
  if (['n08','n17','n19','n24','n26','n31','n33','n34','n35'].includes(n.id)) return v+'%';
  if (n.id === 'n29') return v+'/주';
  return String(v);
};

const pColor = (p: number): string => p >= 0.7 ? CSS.danger : p >= 0.3 ? CSS.warning : CSS.success;
const sClass = (s: NodeState): string => s === 'IRREVERSIBLE' ? 'danger' : s === 'PRESSURING' ? 'warning' : '';

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

export default function AUTUSAppV3() {
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [nodes, setNodes] = useState<Record<string, Node>>(INITIAL_NODES);
  const [connectors, setConnectors] = useState(INITIAL_CONNECTORS);
  const [devices, setDevices] = useState(DEVICES);
  const [webServices, setWebServices] = useState(WEB_SERVICES);
  const [nodeFilter, setNodeFilter] = useState<'active' | 'all' | 'danger'>('active');
  const [missionFilter, setMissionFilter] = useState<'active' | 'done' | 'ignored'>('active');
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const sortedNodes = useMemo(() => 
    Object.values(nodes).sort((a, b) => b.pressure - a.pressure), 
    [nodes]
  );

  const topNode = sortedNodes[0];
  const dangerNodes = sortedNodes.filter(n => n.state !== 'IGNORABLE').slice(0, 5);
  const activeCount = Object.values(nodes).filter(n => n.active).length;

  const toggleConnector = (id: string) => {
    setConnectors(prev => prev.map(c => c.id === id ? {...c, on: !c.on} : c));
    const c = connectors.find(x => x.id === id);
    showToast(c?.on ? `${c.name} 연결 해제됨` : `${c?.name} 연결됨`);
  };

  const toggleNode = (id: string) => {
    setNodes(prev => ({...prev, [id]: {...prev[id], active: !prev[id].active}}));
  };

  const connectAllWeb = () => {
    setWebServices(prev => prev.map(w => ({...w, on: true})));
    showToast('🎉 모든 웹 서비스가 연결되었습니다!');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Tab Content
  // ═══════════════════════════════════════════════════════════════════════════

  const renderHome = () => (
    <div>
      {/* Top-1 Card */}
      <div 
        onClick={() => setShowModal(true)}
        style={{
          background: CSS.bg2,
          borderRadius: 12,
          padding: 20,
          marginBottom: 12,
          border: `1px solid ${topNode.state === 'IRREVERSIBLE' ? CSS.danger : CSS.warning}`,
          textAlign: 'center',
          cursor: 'pointer',
          animation: topNode.state === 'IRREVERSIBLE' ? 'pulse 2s infinite' : 'none',
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>
          {topNode.state === 'IRREVERSIBLE' ? '🔴' : '🟡'}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>
          {topNode.name} {fmt(topNode)}
        </div>
        <span style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 600,
          background: topNode.state === 'IRREVERSIBLE' ? 'rgba(255,59,59,0.15)' : 'rgba(255,165,0,0.15)',
          color: topNode.state === 'IRREVERSIBLE' ? CSS.danger : CSS.warning,
        }}>
          {topNode.state}
        </span>
        <div style={{ marginTop: 10, fontSize: 12, color: CSS.text3 }}>
          탭하여 미션 생성 →
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 15 }}>
        {[
          { val: '0.14', lbl: '평형점' },
          { val: '0.67', lbl: '안정성' },
          { val: String(dangerNodes.length), lbl: '위험' },
          { val: '3', lbl: '미션' },
        ].map((s, i) => (
          <div key={i} style={{
            background: CSS.bg2,
            borderRadius: 10,
            padding: '12px 8px',
            textAlign: 'center',
            border: `1px solid ${CSS.border}`,
          }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: CSS.accent }}>{s.val}</div>
            <div style={{ fontSize: 10, color: CSS.text3, marginTop: 2 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Circuits */}
      <div style={{ fontSize: 13, color: CSS.text2, margin: '15px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        🔌 핵심 회로
      </div>
      <div style={{ background: CSS.bg2, borderRadius: 12, padding: 15, marginBottom: 12, border: `1px solid ${CSS.border}` }}>
        {CIRCUITS.map(c => (
          <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${CSS.border}` }}>
            <div style={{ width: 70, fontSize: 12, color: CSS.text2 }}>{c.name}</div>
            <div style={{ flex: 1, height: 6, background: CSS.bg3, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ 
                width: `${c.value * 100}%`, 
                height: '100%', 
                background: c.value > 0.5 ? CSS.danger : c.value > 0.3 ? CSS.warning : CSS.success,
                borderRadius: 3 
              }} />
            </div>
            <div style={{ width: 40, textAlign: 'right', fontSize: 13, fontWeight: 600, color: pColor(c.value) }}>
              {c.value.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Nodes */}
      <div style={{ fontSize: 13, color: CSS.text2, margin: '15px 0 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
        ⚠️ 위험 노드
      </div>
      {dangerNodes.map(n => (
        <div 
          key={n.id}
          onClick={() => showToast(`${n.icon} ${n.name}: 압력 ${(n.pressure*100).toFixed(0)}%`)}
          style={{
            background: CSS.bg2,
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
            border: `1px solid ${n.state === 'IRREVERSIBLE' ? CSS.danger : CSS.warning}`,
            display: 'flex',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span>{n.icon}</span>
            <span style={{ fontWeight: 600 }}>{n.name}</span>
            <span style={{ color: CSS.text3, fontSize: 13 }}>{fmt(n)}</span>
          </div>
          <span style={{ fontWeight: 600, color: pColor(n.pressure) }}>{n.pressure.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );

  const renderMission = () => {
    const missions = missionFilter === 'active' ? INITIAL_MISSIONS : [];
    
    return (
      <div>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 15, overflowX: 'auto' }}>
          {[
            { id: 'active', label: '활성 (3)' },
            { id: 'done', label: '완료 (12)' },
            { id: 'ignored', label: '무시 (5)' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setMissionFilter(f.id as typeof missionFilter)}
              style={{
                padding: '6px 14px',
                background: missionFilter === f.id ? CSS.accent : CSS.bg2,
                border: `1px solid ${missionFilter === f.id ? CSS.accent : CSS.border}`,
                borderRadius: 15,
                fontSize: 12,
                color: missionFilter === f.id ? '#000' : CSS.text,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {missions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: CSS.text3 }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
            미션이 없습니다
          </div>
        ) : (
          missions.map(m => (
            <div 
              key={m.id}
              onClick={() => showToast(`${m.icon} ${m.title}: ${m.progress}% 완료`)}
              style={{
                background: CSS.bg2,
                borderRadius: 10,
                padding: 14,
                marginBottom: 10,
                border: `1px solid ${CSS.border}`,
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{m.icon} {m.title}</span>
                  <span style={{ fontSize: 10, padding: '2px 6px', background: CSS.bg3, borderRadius: 6, color: CSS.text2, marginLeft: 6 }}>{m.type}</span>
                </div>
                <div style={{ fontSize: 12, color: CSS.accent }}>{m.status}</div>
              </div>
              <div style={{ height: 5, background: CSS.bg3, borderRadius: 3, marginBottom: 5 }}>
                <div style={{ height: '100%', background: CSS.accent, borderRadius: 3, width: `${m.progress}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: CSS.text3 }}>
                <span>{m.progress}% 완료</span>
                <span>{m.eta}</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 12 }}>
                {m.steps.map((s, i) => (
                  <div key={i} style={{ padding: '4px 0', color: s.s === 'done' ? CSS.success : s.s === 'active' ? CSS.accent : CSS.text2 }}>
                    {s.s === 'done' ? '✅' : s.s === 'active' ? '🔄' : '⬜'} {s.t}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const renderTrinity = () => (
    <div>
      {/* Goal Card */}
      <div 
        onClick={() => showToast('Me 탭에서 목표를 수정할 수 있습니다')}
        style={{
          background: `linear-gradient(135deg, ${CSS.bg2}, ${CSS.bg3})`,
          borderRadius: 14,
          padding: 20,
          textAlign: 'center',
          marginBottom: 15,
          border: `1px solid ${CSS.border}`,
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: 12, color: CSS.text3, marginBottom: 8 }}>현재 목표</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: CSS.accent }}>12개월 내 PMF 달성</div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 15, overflowX: 'auto' }}>
        {[
          { id: 'active', label: '활성 노드' },
          { id: 'all', label: '전체 36개' },
          { id: 'danger', label: '위험만' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setNodeFilter(f.id as typeof nodeFilter)}
            style={{
              padding: '6px 14px',
              background: nodeFilter === f.id ? CSS.accent : CSS.bg2,
              border: `1px solid ${nodeFilter === f.id ? CSS.accent : CSS.border}`,
              borderRadius: 15,
              fontSize: 12,
              color: nodeFilter === f.id ? '#000' : CSS.text,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Nodes by Layer */}
      {(Object.entries(LAYERS) as [LayerId, typeof LAYERS[LayerId]][]).map(([lid, layer]) => {
        let layerNodes = layer.ids.map(id => nodes[id]);
        
        if (nodeFilter === 'active') {
          layerNodes = layerNodes.filter(n => n.active);
        } else if (nodeFilter === 'danger') {
          layerNodes = layerNodes.filter(n => n.state !== 'IGNORABLE');
        }

        if (layerNodes.length === 0 && nodeFilter !== 'all') return null;
        if (nodeFilter === 'all') layerNodes = layer.ids.map(id => nodes[id]);

        const activeInLayer = layer.ids.filter(id => nodes[id].active).length;

        return (
          <div key={lid}>
            <div style={{ fontSize: 13, color: CSS.text2, margin: '15px 0 10px' }}>
              {layer.name} ({nodeFilter === 'all' ? layer.ids.length : activeInLayer}/{layer.ids.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 15 }}>
              {layerNodes.map(n => (
                <div
                  key={n.id}
                  onClick={() => showToast(`${n.icon} ${n.name}: ${fmt(n)} (압력 ${(n.pressure*100).toFixed(0)}%)`)}
                  style={{
                    background: n.state === 'IRREVERSIBLE' ? 'rgba(255,59,59,0.05)' : CSS.bg2,
                    borderRadius: 8,
                    padding: '10px 6px',
                    textAlign: 'center',
                    border: `1px solid ${n.state === 'IRREVERSIBLE' ? CSS.danger : n.state === 'PRESSURING' ? CSS.warning : CSS.border}`,
                    cursor: 'pointer',
                    opacity: !n.active && nodeFilter === 'all' ? 0.35 : 1,
                  }}
                >
                  <div style={{ fontSize: 18 }}>{n.icon}</div>
                  <div style={{ fontSize: 11, color: CSS.text2, margin: '3px 0' }}>{n.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{fmt(n)}</div>
                  <div style={{ height: 3, background: CSS.bg3, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: pColor(n.pressure), width: `${n.pressure * 100}%`, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderSetup = () => (
    <div>
      {/* Devices */}
      <div style={{ fontSize: 13, color: CSS.text2, margin: '0 0 10px' }}>📷 디바이스 권한</div>
      {devices.map(d => (
        <div
          key={d.id}
          onClick={() => {
            setDevices(prev => prev.map(x => x.id === d.id ? {...x, on: !x.on} : x));
            showToast(d.on ? `${d.name} 권한 해제됨` : `${d.name} 권한 허용됨!`);
          }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 14,
            background: CSS.bg2,
            borderRadius: 10,
            marginBottom: 8,
            border: `1px solid ${CSS.border}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{d.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
              <div style={{ fontSize: 11, color: CSS.text3 }}>{d.desc}</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: d.on ? CSS.success : CSS.text3 }}>
            {d.on ? '✅ 허용됨' : '허용하기 →'}
          </span>
        </div>
      ))}

      {/* Web Services */}
      <div style={{ fontSize: 13, color: CSS.text2, margin: '20px 0 10px' }}>🌐 웹 서비스 연결</div>
      <div style={{
        background: CSS.bg2,
        borderRadius: 10,
        padding: 12,
        marginBottom: 12,
        border: `1px solid ${CSS.accent}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: CSS.accent }}>🌐 모든 서비스 한번에 연결</div>
          <div style={{ fontSize: 11, color: CSS.text3, marginTop: 2 }}>GPT Atlas 방식 - 한 번의 동의로 모든 권한</div>
        </div>
        <button
          onClick={connectAllWeb}
          style={{
            padding: '8px 16px',
            background: CSS.accent,
            border: 'none',
            borderRadius: 10,
            color: '#000',
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          전체 연결
        </button>
      </div>
      {webServices.map(w => (
        <div
          key={w.id}
          onClick={() => {
            setWebServices(prev => prev.map(x => x.id === w.id ? {...x, on: !x.on} : x));
            showToast(w.on ? `${w.name} 연결 해제됨` : `${w.name} 연결됨!`);
          }}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 14,
            background: CSS.bg2,
            borderRadius: 10,
            marginBottom: 8,
            border: `1px solid ${CSS.border}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{w.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</div>
              <div style={{ fontSize: 11, color: CSS.text3 }}>{w.desc}</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: w.on ? CSS.success : CSS.text3 }}>
            {w.on ? '✅ 연결됨' : '연결하기 →'}
          </span>
        </div>
      ))}

      {/* Connectors */}
      <div style={{ fontSize: 13, color: CSS.text2, margin: '20px 0 10px' }}>🔗 데이터 연결</div>
      {connectors.map(c => (
        <div
          key={c.id}
          onClick={() => toggleConnector(c.id)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 14,
            background: CSS.bg2,
            borderRadius: 10,
            marginBottom: 8,
            border: `1px solid ${CSS.border}`,
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>{c.icon}</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: CSS.text3 }}>{c.desc}</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: c.on ? CSS.success : CSS.text3 }}>
            {c.on ? '✅ 연결됨' : '연결하기 →'}
          </span>
        </div>
      ))}

      {/* Settings */}
      <div style={{ fontSize: 13, color: CSS.text2, margin: '20px 0 10px' }}>⚙️ 설정</div>
      {[
        { name: '일일 발화 제한', desc: '하루 최대 알림', val: '3회' },
        { name: '자율 수준', desc: 'L0: 알림만', val: 'L0' },
      ].map((s, i) => (
        <div
          key={i}
          onClick={() => showToast(`${s.name} 설정 (개발 예정)`)}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 14,
            background: CSS.bg2,
            borderRadius: 10,
            marginBottom: 8,
            border: `1px solid ${CSS.border}`,
            cursor: 'pointer',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
            <div style={{ fontSize: 11, color: CSS.text3 }}>{s.desc}</div>
          </div>
          <span style={{ color: CSS.accent, fontWeight: 600, fontSize: 13 }}>{s.val} →</span>
        </div>
      ))}
    </div>
  );

  const renderMe = () => {
    const activeNodes = Object.values(nodes).filter(n => n.active);
    
    return (
      <div>
        {/* Goal */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🎯 목표</div>
          <div style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}` }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: CSS.accent, marginBottom: 10 }}>12개월 내 PMF 달성</div>
            <button
              onClick={() => showToast('목표 수정 (개발 예정)')}
              style={{
                width: '100%',
                padding: 10,
                background: CSS.bg3,
                border: `1px solid ${CSS.border}`,
                borderRadius: 10,
                color: CSS.text,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              목표 수정
            </button>
          </div>
        </div>

        {/* Active Nodes */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>📦 활성 노드 ({activeCount}/36)</div>
          <div style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}` }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {activeNodes.map(n => (
                <span key={n.id} style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>
                  {n.icon} {n.name}
                </span>
              ))}
            </div>
            <button
              onClick={() => setShowEditModal('nodes')}
              style={{
                width: '100%',
                padding: 10,
                marginTop: 10,
                background: CSS.bg3,
                border: `1px solid ${CSS.border}`,
                borderRadius: 10,
                color: CSS.text,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              노드 편집
            </button>
          </div>
        </div>

        {/* Identity */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🎭 정체성</div>
          <div 
            onClick={() => showToast('정체성 편집 (개발 예정)')}
            style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}`, cursor: 'pointer' }}
          >
            <div>나는 <span style={{ color: CSS.accent, fontWeight: 600 }}>초기 스타트업 창업자</span>입니다</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              <span style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>유형: 창업자</span>
              <span style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>단계: 초기</span>
              <span style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>산업: 테크</span>
            </div>
          </div>
        </div>

        {/* Values */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>💎 가치 우선순위</div>
          <div 
            onClick={() => showToast('가치 편집 (개발 예정)')}
            style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}`, cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {VALUES.map((v, i) => (
                <span key={v} style={{ padding: '6px 10px', background: CSS.bg3, borderRadius: 15, fontSize: 12 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 16,
                    height: 16,
                    background: CSS.accent,
                    color: '#000',
                    borderRadius: '50%',
                    fontSize: 10,
                    marginRight: 4,
                  }}>{i + 1}</span>
                  {v}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Boundaries */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🚫 경계</div>
          <div 
            onClick={() => showToast('경계 편집 (개발 예정)')}
            style={{ background: CSS.bg2, borderRadius: 10, padding: 14, border: `1px solid ${CSS.border}`, cursor: 'pointer' }}
          >
            <div style={{ fontSize: 12, color: CSS.danger, marginBottom: 8, fontWeight: 600 }}>절대 안 함</div>
            {BOUNDARIES.never.map(b => (
              <div key={b} style={{ padding: '4px 0', fontSize: 13 }}>⛔ {b}</div>
            ))}
            <div style={{ fontSize: 12, color: CSS.warning, margin: '10px 0 8px', fontWeight: 600 }}>한계선</div>
            {BOUNDARIES.limits.map(b => (
              <div key={b} style={{ padding: '4px 0', fontSize: 13 }}>📊 {b}</div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'home': return renderHome();
      case 'mission': return renderMission();
      case 'trinity': return renderTrinity();
      case 'setup': return renderSetup();
      case 'me': return renderMe();
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // Main Render
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: CSS.bg,
      color: CSS.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 480,
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 15px 15px',
        borderBottom: `1px solid ${CSS.border}`,
        position: 'sticky',
        top: 0,
        background: CSS.bg,
        zIndex: 100,
      }}>
        <h1 style={{ fontSize: 19, color: CSS.accent, margin: 0 }}>AUTUS v2.1</h1>
        <span style={{ fontSize: 11, color: CSS.text3 }}>{activeCount}/36 노드</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: 15, paddingBottom: 90, overflowY: 'auto' }}>
        {renderTab()}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        maxWidth: 480,
        background: CSS.bg2,
        borderTop: `1px solid ${CSS.border}`,
        display: 'flex',
        zIndex: 1000,
      }}>
        {[
          { id: 'home', icon: '🏠', label: 'Home' },
          { id: 'mission', icon: '📋', label: 'Mission' },
          { id: 'trinity', icon: '△', label: 'Trinity' },
          { id: 'setup', icon: '⚙️', label: 'Setup' },
          { id: 'me', icon: '👤', label: 'Me' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            style={{
              flex: 1,
              padding: '12px 5px 20px',
              textAlign: 'center',
              background: 'none',
              border: 'none',
              color: activeTab === tab.id ? CSS.accent : CSS.text3,
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', fontSize: 19 }}>{tab.icon}</span>
            <small style={{ fontSize: 10 }}>{tab.label}</small>
          </button>
        ))}
      </div>

      {/* Mission Modal */}
      {showModal && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <div style={{
            background: CSS.bg2,
            width: '100%',
            maxWidth: 480,
            maxHeight: '85vh',
            borderRadius: '20px 20px 0 0',
            padding: 16,
            overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, background: CSS.border, borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 28 }}>{topNode.state === 'IRREVERSIBLE' ? '🔴' : '🟡'}</div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{topNode.name} {fmt(topNode)}</div>
              <div style={{ fontSize: 13, color: CSS.text2, marginTop: 6 }}>
                현재: {fmt(topNode)} | 압력: {(topNode.pressure*100).toFixed(0)}%
              </div>
            </div>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>어떻게 하시겠습니까?</div>
            
            {[
              { id: 'ignore', name: '❌ 무시', desc: '지금은 조치하지 않습니다', meta: ['💰 ₩0', '⏱️ 0분'], warn: '⚠️ 압력 상승', recommended: false },
              { id: 'auto', name: '🤖 자동화', desc: 'AUTUS가 자동으로 최적화', meta: ['💰 ₩0', '⏱️ 3일'], warn: '📈 개선', recommended: true },
              { id: 'out', name: '👥 외주', desc: '전문가에게 분석 의뢰', meta: ['💰 ₩300,000', '⏱️ 7일'], warn: '📈 큰 개선', recommended: false },
              { id: 'direct', name: '📋 지시', desc: '팀원에게 검토 지시', meta: ['💰 ₩0', '⏱️ 1일'], warn: '📈 소폭 개선', recommended: false },
            ].map(action => (
              <div
                key={action.id}
                onClick={() => {
                  if (action.id === 'ignore') {
                    showToast('무시됨 - 압력이 계속 상승합니다');
                  } else {
                    showToast('미션이 생성되었습니다!');
                    setActiveTab('mission');
                  }
                  setShowModal(false);
                }}
                style={{
                  background: action.recommended ? 'rgba(0,212,255,0.05)' : CSS.bg,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 8,
                  border: `1px solid ${action.recommended ? CSS.accent : CSS.border}`,
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{action.name}</span>
                  {action.recommended && (
                    <span style={{ fontSize: 10, padding: '2px 6px', background: CSS.accent, color: '#000', borderRadius: 8 }}>⭐ 추천</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: CSS.text2, marginBottom: 8 }}>{action.desc}</div>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, color: CSS.text3, flexWrap: 'wrap' }}>
                  {action.meta.map((m, i) => <span key={i}>{m}</span>)}
                  <span style={{ color: action.id === 'ignore' ? CSS.danger : CSS.success }}>{action.warn}</span>
                </div>
              </div>
            ))}
            
            <button
              onClick={() => setShowModal(false)}
              style={{
                width: '100%',
                padding: 12,
                background: CSS.bg3,
                border: `1px solid ${CSS.border}`,
                borderRadius: 10,
                color: CSS.text,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Edit Nodes Modal */}
      {showEditModal === 'nodes' && (
        <div
          onClick={(e) => e.target === e.currentTarget && setShowEditModal(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 2000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <div style={{
            background: CSS.bg2,
            width: '100%',
            maxWidth: 480,
            maxHeight: '85vh',
            borderRadius: '20px 20px 0 0',
            padding: 16,
            overflowY: 'auto',
          }}>
            <div style={{ width: 36, height: 4, background: CSS.border, borderRadius: 2, margin: '0 auto 16px' }} />
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>활성 노드 선택 (36개)</div>
            </div>
            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {Object.values(nodes).map(n => (
                <label
                  key={n.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 0',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${CSS.border}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={n.active}
                    onChange={() => toggleNode(n.id)}
                    style={{ width: 18, height: 18 }}
                  />
                  <span>{n.icon}</span>
                  <span style={{ flex: 1 }}>{n.name}</span>
                  <span style={{ fontSize: 12, color: CSS.text3 }}>{n.layer}</span>
                </label>
              ))}
            </div>
            <button
              onClick={() => {
                showToast('저장되었습니다');
                setShowEditModal(null);
              }}
              style={{
                width: '100%',
                padding: 12,
                background: CSS.accent,
                border: 'none',
                borderRadius: 10,
                color: '#000',
                fontWeight: 600,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 12,
              }}
            >
              저장
            </button>
            <button
              onClick={() => setShowEditModal(null)}
              style={{
                width: '100%',
                padding: 12,
                background: CSS.bg3,
                border: `1px solid ${CSS.border}`,
                borderRadius: 10,
                color: CSS.text,
                fontSize: 14,
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          background: CSS.bg3,
          color: CSS.text,
          padding: '12px 20px',
          borderRadius: 10,
          fontSize: 14,
          zIndex: 3000,
        }}>
          {toast}
        </div>
      )}

      {/* Pulse Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 10px rgba(255,59,59,0.2); }
          50% { box-shadow: 0 0 20px rgba(255,59,59,0.4); }
        }
      `}</style>
    </div>
  );
}
