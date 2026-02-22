import type { Node, LayerId, Circuit, Mission, Connector } from './types';

export const INITIAL_NODES: Record<string, Node> = {
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

export const LAYERS: Record<LayerId, { name: string; ids: string[] }> = {
  L1:{name:'💰 재무',ids:['n01','n02','n03','n04','n05','n06','n07','n08']},
  L2:{name:'❤️ 생체',ids:['n09','n10','n11','n12','n13','n14']},
  L3:{name:'⚙️ 운영',ids:['n15','n16','n17','n18','n19','n20','n21','n22']},
  L4:{name:'👥 고객',ids:['n23','n24','n25','n26','n27','n28','n29']},
  L5:{name:'🌍 외부',ids:['n30','n31','n32','n33','n34','n35','n36']}
};

export const CIRCUITS: Circuit[] = [
  {name:'survival',ids:['n03','n01','n05'],value:0.40},
  {name:'fatigue',ids:['n18','n09','n10','n16'],value:0.43},
  {name:'repeat',ids:['n26','n02','n01'],value:0.15},
  {name:'people',ids:['n31','n17','n20'],value:0.08},
  {name:'growth',ids:['n29','n23','n02'],value:0.15}
];

export const INITIAL_MISSIONS: Mission[] = [
  {id:1,title:'런웨이 개선',type:'자동화',icon:'🤖',status:'자동 실행 중',progress:67,eta:'1일 후',steps:[{t:'구독 서비스 분석 완료',s:'done'},{t:'불필요 항목 3개 식별',s:'done'},{t:'취소 요청 처리 중...',s:'active'},{t:'결과 리포트 생성',s:''}]},
  {id:2,title:'태스크 정리',type:'지시',icon:'📋',status:'김철수 검토 중',progress:33,eta:'2일 후',steps:[{t:'슬랙 메시지 발송됨',s:'done'},{t:'김철수 검토 중...',s:'active'},{t:'결과 보고 대기',s:''}]},
  {id:3,title:'세무 컨설팅',type:'외주',icon:'👥',status:'준비 중',progress:15,eta:'내일 시작',steps:[{t:'세무사 매칭 완료',s:'done'},{t:'계약서 생성 중...',s:'active'},{t:'데이터 전달',s:''},{t:'분석 진행',s:''}]}
];

export const INITIAL_CONNECTORS: Connector[] = [
  {id:'bank',name:'오픈뱅킹',icon:'🏦',desc:'현금, 수입, 지출',on:true},
  {id:'health',name:'Apple Health',icon:'❤️',desc:'수면, HRV, 활동량',on:true},
  {id:'calendar',name:'Google Calendar',icon:'📅',desc:'마감, 일정',on:true},
  {id:'notion',name:'Notion',icon:'📋',desc:'태스크, 처리속도',on:false},
  {id:'slack',name:'Slack',icon:'💬',desc:'팀 커뮤니케이션',on:false}
];

export const DEVICES: Connector[] = [
  {id:'camera',name:'카메라',icon:'📷',desc:'얼굴 인식, 피로도 감지',on:false},
  {id:'mic',name:'마이크',icon:'🎤',desc:'음성 명령, 스트레스 분석',on:false},
  {id:'location',name:'위치',icon:'📍',desc:'이동 패턴, 출퇴근 감지',on:false}
];

export const WEB_SERVICES: Connector[] = [
  {id:'google',name:'Google 전체',icon:'🔵',desc:'Gmail, Drive, Calendar, Sheets',on:false},
  {id:'microsoft',name:'Microsoft 전체',icon:'🟦',desc:'Outlook, OneDrive, Teams',on:false},
  {id:'notion_web',name:'Notion',icon:'⬛',desc:'페이지, 데이터베이스, 워크스페이스',on:false},
  {id:'slack_web',name:'Slack',icon:'💜',desc:'메시지, 채널, 파일',on:false},
  {id:'github',name:'GitHub',icon:'🐙',desc:'레포, 이슈, PR',on:false},
  {id:'figma',name:'Figma',icon:'🎨',desc:'디자인, 프로토타입',on:false},
  {id:'linear',name:'Linear',icon:'🔷',desc:'이슈, 프로젝트, 사이클',on:false},
  {id:'bank_web',name:'은행/카드',icon:'💳',desc:'거래내역, 잔액, 청구서',on:false}
];

export const VALUES = ['생존','성장','건강','가족','자유'];
export const BOUNDARIES = {never:['파산','건강 붕괴'],limits:['부채 5천만 이하','수면 5시간 이상','런웨이 4주 이상']};
