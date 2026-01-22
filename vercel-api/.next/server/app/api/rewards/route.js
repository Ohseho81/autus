(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[146],{2067:e=>{"use strict";e.exports=require("node:async_hooks")},6195:e=>{"use strict";e.exports=require("node:buffer")},7922:(e,t,a)=>{"use strict";a.r(t),a.d(t,{ComponentMod:()=>b,default:()=>x});var s={};a.r(s),a.d(s,{GET:()=>g,OPTIONS:()=>m,POST:()=>h,runtime:()=>p});var n={};a.r(n),a.d(n,{originalPathname:()=>S,patchFetch:()=>E,requestAsyncStorage:()=>w,routeModule:()=>k,serverHooks:()=>f,staticGenerationAsyncStorage:()=>y});var r=a(932),o=a(2561),i=a(4828),c=a(6631),u=a(9985),_=a(8621),d=a(5740);let p="edge",l={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, PUT, OPTIONS","Access-Control-Allow-Headers":"Content-Type, Authorization"};async function m(){return new u.xk(null,{status:200,headers:l})}async function g(e){try{let{searchParams:t}=new URL(e.url),a=t.get("userId");if(!a)return u.xk.json({success:!1,error:"userId is required"},{status:400,headers:l});let s=await _.db.getUnreadRewards(a);return u.xk.json({success:!0,data:{unread_count:s.length,cards:s}},{status:200,headers:l})}catch(e){return console.error("Rewards GET Error:",e),u.xk.json({success:!1,error:e.message},{status:500,headers:l})}}async function h(e){try{let{action:t,userId:s,payload:n}=await e.json();if("generate"===t){let e=await _.db.getUser(s);if(!e)return u.xk.json({success:!1,error:"User not found"},{status:404,headers:l});let t=await d.ai.generateRewardCard({role:e.role_id,pain_point:e.pain_point_top1||"general",orbit_distance:e.sync_orbit,context_data:n?.context||{}}),a=await _.db.createRewardCard({user_id:s,card_type:e.pain_point_top1||"general",title:t.title,icon:t.icon,message:t.message,actions:t.actions,is_read:!1,is_acted:!1});return u.xk.json({success:!0,data:a},{status:201,headers:l})}if("mark_read"===t){let{cardId:e}=n,{getSupabaseAdmin:t}=await Promise.resolve().then(a.bind(a,8621));return await t().from("reward_cards").update({is_read:!0}).eq("id",e),u.xk.json({success:!0,data:{card_id:e,is_read:!0}},{status:200,headers:l})}if("mark_acted"===t){let{cardId:e,actionType:t}=n,{getSupabaseAdmin:s}=await Promise.resolve().then(a.bind(a,8621));return await s().from("reward_cards").update({is_acted:!0}).eq("id",e),u.xk.json({success:!0,data:{card_id:e,is_acted:!0,action_type:t}},{status:200,headers:l})}return u.xk.json({success:!1,error:"Unknown action"},{status:400,headers:l})}catch(e){return console.error("Rewards POST Error:",e),u.xk.json({success:!1,error:e.message},{status:500,headers:l})}}let k=new o.AppRouteRouteModule({definition:{kind:i.x.APP_ROUTE,page:"/api/rewards/route",pathname:"/api/rewards",filename:"route",bundlePath:"app/api/rewards/route"},resolvedPagePath:"/Users/oseho/Desktop/autus/vercel-api/app/api/rewards/route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:w,staticGenerationAsyncStorage:y,serverHooks:f}=k,S="/api/rewards/route";function E(){return(0,c.XH)({serverHooks:f,staticGenerationAsyncStorage:y})}let b=n,x=r.a.wrap(k)},5740:(e,t,a)=>{"use strict";a.d(t,{ai:()=>i});var s=a(7357),n=a(4956);function r(){if(!process.env.CLAUDE_API_KEY)throw Error("CLAUDE_API_KEY environment variable not configured");return new s.ZP({apiKey:process.env.CLAUDE_API_KEY})}async function o(e){let t=function(){let e=process.env.SUPABASE_URL||"https://pphzvnaedmzcvpxjulti.supabase.co",t=process.env.SUPABASE_SERVICE_ROLE_KEY;return e&&t?(0,n.eI)(e,t):null}();if(!t)return;let a=e.input_tokens+e.output_tokens,s=(e.cache_read_input_tokens||0)>0,r=e.input_tokens/1e3*.003+e.output_tokens/1e3*.015+(e.cache_creation_input_tokens||0)/1e3*.00375+(e.cache_read_input_tokens||0)/1e3*3e-4,o=s?(e.cache_read_input_tokens||0)/1e3*.0027:0;try{await t.from("prompt_cache_metrics").insert({endpoint:e.endpoint,cache_hit:s,cache_creation_input_tokens:e.cache_creation_input_tokens,cache_read_input_tokens:e.cache_read_input_tokens,input_tokens:e.input_tokens,output_tokens:e.output_tokens,total_tokens:a,estimated_cost_usd:r,savings_usd:o,response_time_ms:e.response_time_ms})}catch(e){console.error("Failed to log cache metrics:",e)}}let i={async generateRewardCard(e){let t=Date.now(),a=`너는 AUTUS의 실행형 AI 에이전트야. 
사용자의 역할과 고민에 맞는 '즉시 보상 카드'를 생성하고, 버튼 클릭 시 자동 실행할 수 있는 webhook_payload도 포함해.

규칙:
1. 숫자나 퍼센트를 직접 노출하지 마
2. 따뜻하고 격려하는 톤 유지
3. 즉시 행동할 수 있는 구체적 제안
4. orbit_distance에 따라 자동화 수준 조절:
   - 0.2 (가까이): 원클릭 자동 실행 제안
   - 0.5 (중간): 승인 후 실행 제안
   - 0.8 (멀리): 정보 제공만

사용 가능한 action_type:
- send_sms: 문자 발송 (알리고)
- send_kakao: 카카오 알림톡
- update_erp: ERP 업데이트
- issue_reward: 리워드 발급
- generate_report: 보고서 생성
- sync_data: 데이터 동기화

JSON 형식으로 응답:
{
  "title": "카드 제목",
  "icon": "이모지",
  "message": "메인 메시지 (1-2문장)",
  "actions": [
    {
      "label": "버튼텍스트",
      "type": "action_type",
      "requires_approval": boolean,
      "webhook_payload": {
        "action_type": "send_sms|send_kakao|update_erp|...",
        "target": "대상 (전화번호, ID 등)",
        "message": "실행할 메시지 내용",
        "template_id": "템플릿 ID (선택)",
        "metadata": {}
      }
    }
  ]
}`,s=`역할: ${e.role}
주요 고민: ${e.pain_point}
자동화 거리: ${e.orbit_distance}
컨텍스트 데이터: ${JSON.stringify(e.context_data)}

이 사용자를 위한 보상 카드를 생성해.`,n=await r().messages.create({model:"claude-sonnet-4-20250514",max_tokens:500,messages:[{role:"user",content:s}],system:a}),i=Date.now()-t;o({endpoint:"/api/brain/generateRewardCard",input_tokens:n.usage?.input_tokens||0,output_tokens:n.usage?.output_tokens||0,cache_creation_input_tokens:n.usage?.cache_creation_input_tokens,cache_read_input_tokens:n.usage?.cache_read_input_tokens,response_time_ms:i});let c="text"===n.content[0].type?n.content[0].text:"";try{let e=c.match(/\{[\s\S]*\}/);if(e)return JSON.parse(e[0])}catch(e){console.error("JSON parse error:",e)}return{title:"오늘의 제안",icon:"✨",message:"새로운 기회가 준비되어 있습니다.",actions:[{label:"확인하기",type:"view",requires_approval:!1}]}},async analyzeData(e){let t=Date.now(),a=`너는 AUTUS의 데이터 분석 AI야.
${{churn_risk:"퇴원/이탈 위험 분석",cashflow:"현금흐름 및 미납 분석",performance:"성과 및 생산성 분석",engagement:"참여도 및 만족도 분석"}[e.type]}을 수행하고 결과를 JSON으로 반환해.

응답 형식:
{
  "summary": "1문장 요약",
  "risk_level": "low|medium|high",
  "recommendations": ["추천1", "추천2", "추천3"],
  "predicted_impact": 0.0~1.0 사이 영향도
}

규칙:
1. 구체적이고 실행 가능한 추천
2. 숫자는 내부 분석용으로만 사용
3. 사용자 친화적 요약 제공`,s=await r().messages.create({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:`분석 대상 데이터:
${JSON.stringify(e.data,null,2)}`}],system:a}),n=Date.now()-t;o({endpoint:`/api/brain/analyzeData/${e.type}`,input_tokens:s.usage?.input_tokens||0,output_tokens:s.usage?.output_tokens||0,cache_creation_input_tokens:s.usage?.cache_creation_input_tokens,cache_read_input_tokens:s.usage?.cache_read_input_tokens,response_time_ms:n});let i="text"===s.content[0].type?s.content[0].text:"";try{let e=i.match(/\{[\s\S]*\}/);if(e)return JSON.parse(e[0])}catch(e){console.error("JSON parse error:",e)}return{summary:"분석이 완료되었습니다.",risk_level:"medium",recommendations:["데이터를 더 수집해 주세요."],predicted_impact:.5}},async generateThreeOptions(e){let t=`사용자가 요청한 업무에 대해 정확히 3가지 선택지를 생성해.

규칙:
1) A: 가장 빠르고 간단한 방법 (T 최소화)
2) B: 표준적이고 균형 잡힌 방법 (T 중간, s 중간)
3) C: 장기적으로 가장 가치가 쌓이는 방법 (s 최대화)

제약:
- 각 옵션은 1문장
- 시간은 "짧게/보통/길게" 범주만
- 숫자/퍼센트 금지

JSON 형식:
{
  "a": "옵션 A 설명",
  "b": "옵션 B 설명", 
  "c": "옵션 C 설명",
  "meta": {"a_time": "짧게", "b_time": "보통", "c_time": "길게"}
}`,a=await r().messages.create({model:"claude-sonnet-4-20250514",max_tokens:500,messages:[{role:"user",content:`업무: ${e}`}],system:t}),s="text"===a.content[0].type?a.content[0].text:"";try{let e=s.match(/\{[\s\S]*\}/);if(e)return JSON.parse(e[0])}catch(e){console.error("JSON parse error:",e)}return{a:"기존 방식으로 빠르게 처리",b:"표준 프로세스를 따라 진행",c:"자동화 시스템 구축 후 반복 활용",meta:{a_time:"짧게",b_time:"보통",c_time:"길게"}}},async generateDailyContent(e){let t=Date.now(),a=["퇴원 관리","미수금 회수","학부모 상담","마케팅 노하우","강사 관리"],s=e.topic||a[Math.floor(Math.random()*a.length)],n={cafe_post:`학원 원장 커뮤니티(학원노)에 올릴 가치 제공형 글을 작성해줘.

주제: ${s}
${e.context?`추가 컨텍스트: ${e.context}`:""}

규칙:
1. 제목 포함 ([제목] 형식)
2. 따뜻하고 공감하는 톤
3. 구체적인 숫자나 사례 1-2개 포함
4. 300-500자 내외
5. 마지막에 댓글 유도 문구
6. 홍보성 절대 금지 - 순수 노하우 공유만
7. 이모지 적절히 사용

JSON 형식으로 응답:
{"title": "제목", "content": "본문 내용"}`,comment:`학원 원장이 쓴 고민 글에 달 공감 댓글을 작성해줘.

주제: ${s}
${e.context?`원글 내용: ${e.context}`:""}

규칙:
1. 2-3문장으로 짧게
2. 진심 어린 공감
3. 구체적인 조언 1개
4. 홍보 절대 금지

JSON 형식으로 응답:
{"content": "댓글 내용"}`,dm:`학원 원장에게 보낼 첫 DM을 작성해줘.

상황: 퇴원/미수금 고민 글을 쓴 원장님에게 연락
${e.context?`추가 정보: ${e.context}`:""}

규칙:
1. 자연스럽고 부담 없는 톤
2. 무료 파일럿 언급 (효과 없으면 0원)
3. 통화 제안으로 마무리
4. 100자 내외

JSON 형식으로 응답:
{"content": "DM 내용"}`},i=await r().messages.create({model:"claude-sonnet-4-20250514",max_tokens:800,messages:[{role:"user",content:n[e.type]||n.cafe_post}],system:"너는 학원 운영 전문가야. 학원 원장 커뮤니티에서 신뢰받는 조언을 제공해."}),c=Date.now()-t;o({endpoint:"/api/brain/generateDailyContent",input_tokens:i.usage?.input_tokens||0,output_tokens:i.usage?.output_tokens||0,cache_creation_input_tokens:i.usage?.cache_creation_input_tokens,cache_read_input_tokens:i.usage?.cache_read_input_tokens,response_time_ms:c});let u="text"===i.content[0].type?i.content[0].text:"";try{let e=u.match(/\{[\s\S]*\}/);if(e)return JSON.parse(e[0])}catch(e){console.error("JSON parse error:",e)}return{content:u}},async generateConsultReport(e){let t=`학부모 상담 일지 초안을 작성해.
톤: 따뜻하고 전문적
길이: 3-4문단
포함: 학생 강점, 개선점, 다음 목표`,a=await r().messages.create({model:"claude-sonnet-4-20250514",max_tokens:600,messages:[{role:"user",content:`학생: ${e.studentName}
과목: ${e.subject}
출석률: ${e.attendance}%
성취도: ${e.performance}
메모: ${e.notes}`}],system:t});return"text"===a.content[0].type?a.content[0].text:""}}},8621:(e,t,a)=>{"use strict";a.d(t,{db:()=>o,getSupabaseAdmin:()=>r});var s=a(4956);let n=null;function r(){if(!process.env.SUPABASE_SERVICE_ROLE_KEY)throw Error("Supabase environment variables not configured");return(0,s.eI)("https://pphzvnaedmzcvpxjulti.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:!1,persistSession:!1}})}process.env.SUPABASE_SERVICE_ROLE_KEY&&(0,s.eI)("https://pphzvnaedmzcvpxjulti.supabase.co",process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{autoRefreshToken:!1,persistSession:!1}}),n||(n=(0,s.eI)("https://pphzvnaedmzcvpxjulti.supabase.co","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwaHp2bmFlZG16Y3ZweGp1bHRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NTI0NjUsImV4cCI6MjA4NDMyODQ2NX0.kj7hRwujBXRmEwA4B9C8Hml9bbBkEQfGaZ3XYi-GnqQ"));let o={async getUser(e){let t=r(),{data:a,error:s}=await t.from("users").select("*").eq("id",e).single();return s?null:a},async updateUserKernel(e,t){let a=r(),{error:s}=await a.from("users").update(t).eq("id",e);return!s},async getOrganisms(e){let t=r(),{data:a,error:s}=await t.from("organisms").select("*").eq("user_id",e).order("urgency",{ascending:!1});return s?[]:a},async getOrganism(e){let t=r(),{data:a,error:s}=await t.from("organisms").select("*").eq("id",e).single();return s?null:a},async updateOrganism(e,t){let a=r(),{error:s}=await a.from("organisms").update(t).eq("id",e);return!s},async createUsageLog(e){let t=r(),{data:a,error:s}=await t.from("usage_logs").insert(e).select().single();return s?null:a},async getSolutionRanking(e){let t=r().from("solution_ranking").select("*");e&&(t=t.eq("task_id",e));let{data:a,error:s}=await t.order("avg_score",{ascending:!1});return s?[]:a},async createRewardCard(e){let t=r(),{data:a,error:s}=await t.from("reward_cards").insert(e).select().single();return s?null:a},async getUnreadRewards(e){let t=r(),{data:a,error:s}=await t.from("reward_cards").select("*").eq("user_id",e).eq("is_read",!1).order("created_at",{ascending:!1});return s?[]:a},async getLeaderboard(e=10){let t=r(),{data:a,error:s}=await t.from("v_leaderboard").select("*").order("rank",{ascending:!0}).limit(e);return s?[]:a},async getStandard(e){let t=r(),{data:a,error:s}=await t.from("standards").select("*, solutions(*)").eq("task_id",e).single();return s?null:a}}}},e=>{var t=t=>e(e.s=t);e.O(0,[546,956,796],()=>t(7922));var a=e.O();(_ENTRIES="undefined"==typeof _ENTRIES?{}:_ENTRIES)["middleware_app/api/rewards/route"]=a}]);
//# sourceMappingURL=route.js.map