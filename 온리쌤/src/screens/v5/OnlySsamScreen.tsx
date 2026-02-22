/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 OnlySSAM v5 — 코치 전용 화면 (WebView)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 실시간 수정 가능 구조:
 * 1. 서버에서 HTML 로드 시도 (Supabase Storage)
 * 2. 실패 시 내장 HTML 사용 (오프라인 지원)
 * 
 * 몰트봇 → Supabase Storage HTML 수정 → 앱 자동 반영
 */

import React, { useRef, useEffect, useState } from 'react';
import { Platform, Linking, BackHandler, ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { supabase } from '../../lib/supabase';
import { env } from '../../config/env';

// ═══════════════════════════════════════════════════════════════════════════════
// 서버 HTML URL (Supabase Storage 또는 CDN)
// ═══════════════════════════════════════════════════════════════════════════════
const REMOTE_HTML_URL = `${env.supabase.url}/storage/v1/object/public/app-assets/onlyssam-v5.html`;

// ═══════════════════════════════════════════════════════════════════════════════
// 내장 HTML (오프라인 폴백)
// ═══════════════════════════════════════════════════════════════════════════════
const FALLBACK_HTML = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<title>온리쌤</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
body{font-family:-apple-system,'SF Pro Display','Pretendard Variable','Pretendard',sans-serif;background:#000;color:#fff;-webkit-font-smoothing:antialiased;overflow-x:hidden}
::-webkit-scrollbar{display:none}
#root{min-height:100vh}
</style>
</head>
<body>
<div id="root">
<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;background:#000;color:#fff">
<div style="font-size:36px;margin-bottom:16px">🏀</div>
<div style="font-size:20px;font-weight:700;color:#FF6B2C">온리쌤 v5</div>
<div style="font-size:14px;color:rgba(235,235,245,0.3);margin-top:8px">로딩 중...</div>
</div>
</div>
<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js"></script>
<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js"></script>
<script crossorigin src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.23.9/babel.min.js"></script>
<script type="text/babel">
const {useState, useCallback, useMemo} = React;

const $={
  bg:"#000000",s1:"#1C1C1E",s2:"#2C2C2E",s3:"#3A3A3C",s4:"#48484A",
  l1:"#FFFFFF",l2:"#EBEBF5",l3:"rgba(235,235,245,0.6)",l4:"rgba(235,235,245,0.3)",l5:"rgba(235,235,245,0.18)",
  ac:"#FF6B2C",acS:"rgba(255,107,44,0.15)",
  grn:"#30D158",grnS:"rgba(48,209,88,0.14)",
  red:"#FF453A",redS:"rgba(255,69,58,0.14)",
  yel:"#FFD60A",yelS:"rgba(255,214,10,0.14)",
  blu:"#64D2FF",bluS:"rgba(100,210,255,0.14)",
  pnk:"#FF375F",pnkS:"rgba(255,55,95,0.14)",
  pur:"#BF5AF2",purS:"rgba(191,90,242,0.14)",
  f:"-apple-system,'SF Pro Display','Pretendard Variable','Pretendard',sans-serif",
  fm:"'SF Mono','Menlo','Pretendard',monospace",
  r:"12px",rs:"8px",rl:"16px",rx:"22px",pill:"100px",
};

const COACH={name:"김승현",academy:"온리쌤",team:"오픈팀",char:{style:"에너지 코칭",strengths:["동기부여","기초체력","게임 운영"],philosophy:"즐기면서 성장하는 농구",type:"열정형"}};
const CLS=[{id:"월15",n:"초4·5",d:"월",t:"15:00"},{id:"월19a",n:"초3·4",d:"월",t:"19:00"},{id:"월19b",n:"초5·6",d:"월",t:"19:00"},{id:"월21",n:"중등부",d:"월",t:"21:00"},{id:"화18a",n:"초1·2",d:"화",t:"18:00"},{id:"화18b",n:"초3·4",d:"화",t:"18:00"},{id:"화17",n:"초5·6A",d:"화",t:"17:00"},{id:"화20a",n:"초3·4",d:"화",t:"20:00"},{id:"화20b",n:"초5·6B",d:"화",t:"20:00"},{id:"화21f",n:"여중부",d:"화",t:"21:00"},{id:"화21m",n:"중등부",d:"화",t:"21:00"},{id:"수17a",n:"초2·3",d:"수",t:"17:00"},{id:"수17b",n:"초4·5",d:"수",t:"17:00"},{id:"수17c",n:"초6·중1",d:"수",t:"17:00"},{id:"수18",n:"초5·6",d:"수",t:"18:00"},{id:"수19",n:"초5·6",d:"수",t:"19:00"},{id:"수21",n:"중등부",d:"수",t:"21:00"},{id:"목18",n:"초1·2",d:"목",t:"18:00"},{id:"목20a",n:"초4·5",d:"목",t:"20:00"},{id:"목20b",n:"초5·6",d:"목",t:"20:00"},{id:"목21f",n:"여중부",d:"목",t:"21:00"},{id:"목21m",n:"중등부",d:"목",t:"21:00"},{id:"목22",n:"고등",d:"목",t:"22:10"},{id:"금17",n:"초5·6",d:"금",t:"17:00"},{id:"금19",n:"초5·6",d:"금",t:"19:00"},{id:"금21",n:"중등부",d:"금",t:"21:00"}];
const M2C={"월_초4,5 15~16":"월15","월_초3,4 19~20":"월19a","월_초5,6 19~20":"월19b","월_중등부 21~22":"월21","화_초1,2 18~19":"화18a","화_초3,4 18~19":"화18b","화_초5,6 17~18":"화17","화_초3,4 20~21":"화20a","화_초5,6 20~21":"화20b","화_여중부 21~22":"화21f","화_중등부 21~22":"화21m","수_초2,3 17~18":"수17a","수_초4,5 17~18":"수17b","수_초6, 중1 17~18":"수17c","수_초5,6 18~19":"수18","수_초5,6 19~20":"수19","수_중등부 21~22":"수21","목_초1,2 18~19":"목18","목_초4,5 20~21":"목20a","목_초5,6 20~21":"목20b","목_여중부 21~22":"목21f","목_중등부 21~22":"목21m","고등오픈 22:10":"목22","금_초5,6 17~18":"금17","금_초5,6 19~20":"금19","금_중등부 21~22":"금21"};
const R=[{n:"김지호",no:"실전",p:"010-9379-8816",c:"금_중등부 21~22",b:"2012",s:"휘문중",sh:0},{n:"김한준",p:"010-5870-0773",c:"수_초2,3 17~18",b:"2016",s:"한양초",sh:1},{n:"박서우",p:"010-4009-1001",c:"수_초2,3 17~18",b:"2016",s:"한양초",sh:1},{n:"박태준",p:"010-3477-0702",c:"화_초3,4 20~21",b:"2016",s:"대곡초",sh:0},{n:"이병호",p:"010-4147-2072",c:"월_초4,5 15~16",b:"2016",s:"대현초",sh:0},{n:"이시운",p:"010-4056-1905",c:"수_초5,6 19~20",b:"2015",s:"개포초",sh:0},{n:"조하은",p:"010-9000-1574",c:"월_초5,6 19~20",b:"2015",s:"대현초",sh:0},{n:"홍예준",no:"15",p:"010-4619-2780",c:"월_초4,5 15~16",b:"2015",s:"대현초",sh:0},{n:"양우성",p:"010-9962-0230",c:"월_초5,6 19~20",b:"2013",s:"개원초",sh:0},{n:"이재율",p:"010-2535-5462",c:"수_초4,5 17~18",b:"2016",s:"잠일초",sh:0}];
const mkS=i=>{const x=i*7+3;return{dri:40+((x*13)%50),sht:35+((x*17)%55),pas:38+((x*11)%52),sta:45+((x*19)%45),def:30+((x*23)%60)};};
const mkCompat=i=>{const v=55+((i*31+7)%40);return v;};
const STU=R.map((r,i)=>({id:i+1,name:r.n,note:r.no||"",phone:r.p,classId:M2C[r.c],cls:r.c,birth:r.b,school:r.s,shuttle:!!r.sh,skills:mkS(i),compat:mkCompat(i),videos:3+((i*7)%20),streak:1+((i*13)%45),level:1+Math.floor(((i*7+3)*13%50)/12)}));
const GRATS=[{id:1,from:"조하은 학부모님",child:"조하은",emoji:"💐",msg:"항상 하은이 잘 봐주셔서 감사합니다",date:"2/4",amt:30000},{id:2,from:"임태서 학부모님",child:"임태서",emoji:"☕",msg:"코치님 수업을 너무 좋아합니다",date:"2/3",amt:5000}];
const day=()=>["일","월","화","수","목","금","토"][new Date().getDay()];
const fmt=n=>n.toLocaleString("ko-KR");
const Tag=({children,color=$.l3,bg=$.s2})=>(<span style={{padding:"3px 8px",borderRadius:$.pill,fontSize:"11px",fontWeight:"600",background:bg,color,display:"inline-block"}}>{children}</span>);
const Toast=({msg,show})=>(<div style={{position:"fixed",bottom:100,left:"50%",transform:\`translateX(-50%) translateY(\${show?0:20}px)\`,background:$.s2,color:$.l1,padding:"12px 22px",borderRadius:$.rx,fontSize:"14px",fontWeight:"600",boxShadow:"0 8px 40px rgba(0,0,0,.5)",opacity:show?1:0,transition:"all .4s ease-out",pointerEvents:"none",zIndex:9999}}>{msg}</div>);

const Home=({go})=>{
  const td=day();const tc=CLS.filter(c=>c.d===td);const gt=GRATS.reduce((s,t)=>s+t.amt,0);
  return(<div style={{paddingBottom:16}}>
    <div style={{padding:"24px 20px 20px"}}>
      <div style={{fontSize:"13px",color:$.l4,fontWeight:"500",marginBottom:4}}>{new Date().getMonth()+1}월 {new Date().getDate()}일 {td}요일</div>
      <div style={{fontSize:"26px",fontWeight:"700",color:$.l1,letterSpacing:"-.04em",lineHeight:1.25}}>{COACH.name} 코치님,<br/>오늘도 감동을 만들어 보세요.</div>
    </div>
    <div style={{padding:"0 16px 16px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[{l:"내 학생",v:STU.length,u:"명",c:$.blu,tap:()=>go(2)},{l:"감사 누적",v:\`\${Math.round(gt/10000)}만\`,u:"원",c:$.pnk,tap:()=>go(3)},{l:"오늘 수업",v:tc.length,u:"반",c:$.grn,tap:()=>go(1)},{l:"궁합 우수",v:STU.filter(s=>s.compat>=85).length,u:"명",c:$.pur,tap:()=>go(2)}].map((c,i)=>(
        <div key={i} onClick={c.tap} style={{padding:16,borderRadius:$.rl,background:$.s1,cursor:"pointer"}}>
          <div style={{fontSize:"11px",color:$.l4,fontWeight:"500",marginBottom:8}}>{c.l}</div>
          <div style={{fontSize:"28px",fontWeight:"700",color:c.c,letterSpacing:"-.03em",fontFamily:$.fm}}>{c.v}<span style={{fontSize:"13px",fontWeight:"500",color:$.l4,fontFamily:$.f}}>{c.u}</span></div>
        </div>
      ))}
    </div>
    <div style={{padding:"0 16px 16px"}}>
      <div style={{fontSize:"13px",fontWeight:"600",color:$.l3,marginBottom:10}}>오늘 수업</div>
      {tc.length===0?(<div style={{padding:32,textAlign:"center",borderRadius:$.rl,background:$.s1,color:$.l4,fontSize:"15px"}}>오늘은 쉬는 날이에요</div>
      ):tc.map(c=>{const cnt=STU.filter(s=>s.classId===c.id).length;return(
        <div key={c.id} onClick={()=>go(1)} style={{display:"flex",alignItems:"center",gap:14,padding:"14px 16px",borderRadius:$.r,background:$.s1,marginBottom:6,cursor:"pointer"}}>
          <div style={{width:40,height:40,borderRadius:10,background:$.acS,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>🏀</div>
          <div style={{flex:1}}><div style={{fontSize:"15px",fontWeight:"600",color:$.l1}}>{c.n}</div><div style={{fontSize:"13px",color:$.l4}}>{c.t} · {cnt}명</div></div>
          <div style={{fontSize:"13px",color:$.ac,fontWeight:"600"}}>출석 →</div>
        </div>);})}
    </div>
  </div>);
};

const Lesson=({att,setAtt,toast})=>{
  const td=day();const dc=CLS.filter(c=>c.d===td);const fb=dc.length>0?dc:CLS.filter(c=>c.d==="월");
  const [sel,setSel]=useState(fb[0]?.id||CLS[0].id);
  const cs=STU.filter(s=>s.classId===sel);const chk=cs.filter(s=>att[s.id]).length;
  const cycle=id=>{const c=att[id];const nx=!c?"present":c==="present"?"late":c==="late"?"absent":null;setAtt(p=>{const u={...p};if(nx)u[id]=nx;else delete u[id];return u;});};
  const markAll=()=>setAtt(p=>{const u={...p};cs.forEach(s=>{u[s.id]="present"});return u;});
  const st={present:{c:$.grn,bg:$.grnS,ic:"✓"},late:{c:$.yel,bg:$.yelS,ic:"⏰"},absent:{c:$.red,bg:$.redS,ic:"✕"},none:{c:$.l5,bg:"transparent",ic:""}};
  return(<div style={{paddingBottom:16}}>
    <div style={{padding:"14px 16px 0"}}><div style={{fontSize:"13px",color:$.l4,marginBottom:8}}>{dc.length>0?\`\${td}요일 수업\`:"전체 수업"}</div>
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:6}}>{fb.map(c=>{const cnt=STU.filter(s=>s.classId===c.id).length;return(<button key={c.id} onClick={()=>setSel(c.id)} style={{padding:"8px 16px",borderRadius:$.pill,border:"none",background:sel===c.id?$.ac:$.s1,color:sel===c.id?"#fff":$.l3,fontSize:"13px",fontWeight:"600",whiteSpace:"nowrap",cursor:"pointer",flexShrink:0}}>{c.n} ({cnt})</button>);})}</div></div>
    <div style={{padding:"12px 16px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><div><span style={{fontSize:"24px",fontWeight:"700",color:$.ac,fontFamily:$.fm}}>{chk}</span><span style={{fontSize:"13px",color:$.l4}}> / {cs.length}</span></div><button onClick={markAll} style={{padding:"7px 16px",borderRadius:$.pill,background:$.grnS,border:"none",color:$.grn,fontSize:"13px",fontWeight:"600",cursor:"pointer"}}>전체 출석</button></div></div>
    <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:2}}>{cs.map(s=>{const status=att[s.id]||"none";const sc=st[status];return(<div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:$.r,background:$.s1}}>
      <div onClick={()=>cycle(s.id)} style={{width:38,height:38,borderRadius:10,background:sc.bg,border:\`2px solid \${sc.c}\`,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",flexShrink:0,fontSize:"14px",fontWeight:"700",color:sc.c}}>{sc.ic}</div>
      <div style={{flex:1,minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:5}}><span style={{fontSize:"15px",fontWeight:"600",color:$.l1}}>{s.name}</span>{s.note&&<span style={{fontSize:"10px",color:$.l4,background:$.s2,padding:"1px 6px",borderRadius:4}}>{s.note}</span>}{s.shuttle&&<Tag color={$.yel} bg={$.yelS}>🚐</Tag>}</div><div style={{fontSize:"12px",color:$.l4,marginTop:1}}>{s.school||""} · {s.birth}년생</div></div>
    </div>);})}</div>
  </div>);
};

const Student=()=>(<div style={{padding:20,textAlign:"center",color:$.l4}}>학생 관리 (준비 중)</div>);
const Gratitude=()=>{const total=GRATS.reduce((s,t)=>s+t.amt,0);return(<div style={{paddingBottom:16}}><div style={{padding:"24px 20px 20px"}}><div style={{fontSize:"13px",color:$.l4,marginBottom:6}}>감사 현황</div><div style={{fontSize:"34px",fontWeight:"700",color:$.pnk,fontFamily:$.fm}}>{fmt(total)}<span style={{fontSize:"15px",fontWeight:"500",color:$.l4,fontFamily:$.f}}>원</span></div></div></div>);};
const MyPage=()=>(<div style={{padding:"32px 20px",textAlign:"center"}}><div style={{width:80,height:80,borderRadius:20,background:$.acS,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",fontSize:"36px"}}>🏀</div><div style={{fontSize:"24px",fontWeight:"700",color:$.l1}}>{COACH.name} 코치</div><div style={{fontSize:"13px",color:$.l4,marginTop:4}}>{COACH.academy}</div></div>);

function OnlySsamV5(){
  const [tab,setTab]=useState(0);const [att,setAtt]=useState({});
  const [ts,setTs]=useState({msg:"",show:false});
  const toast=useCallback(msg=>{setTs({msg,show:true});setTimeout(()=>setTs(p=>({...p,show:false})),3000);},[]);
  const tabs=[{l:"홈",i:"🏠"},{l:"수업",i:"▶"},{l:"학생",i:"👤"},{l:"감사",i:"💝"},{l:"MY",i:"⚙"}];
  return(<div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:$.bg,color:$.l1,fontFamily:$.f}}>
    <div style={{padding:"10px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:\`0.5px solid \${$.s2}\`,background:$.bg,position:"sticky",top:0,zIndex:100}}>
      <div style={{fontSize:"17px",fontWeight:"700"}}><span style={{color:$.ac}}>온리</span>쌤</div>
      <div style={{fontSize:"11px",color:$.l4}}>{COACH.academy}</div>
    </div>
    <div style={{minHeight:"calc(100vh - 110px)",paddingBottom:76}}>
      {tab===0&&<Home go={setTab}/>}
      {tab===1&&<Lesson att={att} setAtt={setAtt} toast={toast}/>}
      {tab===2&&<Student/>}
      {tab===3&&<Gratitude/>}
      {tab===4&&<MyPage/>}
    </div>
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(0,0,0,.92)",borderTop:\`0.5px solid \${$.s2}\`,display:"flex",zIndex:100,paddingBottom:"env(safe-area-inset-bottom,4px)"}}>
      {tabs.map((t,i)=>(<button key={i} onClick={()=>setTab(i)} style={{flex:1,padding:"8px 0",background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:2,cursor:"pointer",color:tab===i?$.ac:$.l4}}><span style={{fontSize:"18px"}}>{t.i}</span><span style={{fontSize:"10px",fontWeight:tab===i?"600":"500"}}>{t.l}</span></button>))}
    </div>
    <Toast msg={ts.msg} show={ts.show}/>
  </div>);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(OnlySsamV5));
<` + `/script>
</body>
</html>`;

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function OnlySsamScreen() {
  const webViewRef = useRef<WebView>(null);
  const [htmlSource, setHtmlSource] = useState<{ html: string } | { uri: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // 서버에서 HTML 로드 시도
  useEffect(() => {
    const loadRemoteHtml = async () => {
      try {
        // 서버 HTML 로드 시도 (타임아웃 3초)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        
        const response = await fetch(REMOTE_HTML_URL, { 
          signal: controller.signal,
          cache: 'no-cache' // 항상 최신 버전 로드
        });
        clearTimeout(timeout);

        if (response.ok) {
          // 서버 HTML 사용 (실시간 수정 반영)
          setHtmlSource({ uri: REMOTE_HTML_URL });
          if (__DEV__) console.log('[OnlySSAM] 서버 HTML 로드 성공');
        } else {
          throw new Error('Server HTML not available');
        }
      } catch (error: unknown) {
        // 오프라인 또는 서버 에러 → 내장 HTML 사용
        if (__DEV__) console.log('[OnlySSAM] 내장 HTML 사용 (오프라인 모드)');
        setHtmlSource({ html: FALLBACK_HTML });
      } finally {
        setLoading(false);
      }
    };

    loadRemoteHtml();
  }, []);

  // tel: 링크 처리
  const handleRequest = (request: { url: string }) => {
    const { url } = request;
    if (url.startsWith('tel:')) {
      Linking.openURL(url);
      return false;
    }
    if (url.startsWith('http') && !url.includes('cdnjs.cloudflare.com') && !url.includes('supabase.co')) {
      Linking.openURL(url);
      return false;
    }
    return true;
  };

  // Android 뒤로가기
  useEffect(() => {
    if (Platform.OS === 'android') {
      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      });
      return () => handler.remove();
    }
  }, []);

  if (loading || !htmlSource) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
          <ActivityIndicator size="large" color="#FF6B2C" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }} edges={['top']}>
      <WebView
        ref={webViewRef}
        source={htmlSource}
        style={{ flex: 1, backgroundColor: '#000' }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        scalesPageToFit={false}
        scrollEnabled={true}
        bounces={false}
        onShouldStartLoadWithRequest={handleRequest}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        contentInsetAdjustmentBehavior="never"
        cacheEnabled={false} // 항상 최신 버전 로드
      />
    </SafeAreaView>
  );
}
