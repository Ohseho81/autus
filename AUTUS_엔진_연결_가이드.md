# AUTUS 엔진 → 온리쌤 연결 가이드

**목표**: V-Engine을 온리쌤 앱에 연결해서 실시간 가치 계산
**날짜**: 2026-02-14

---

## 🎯 연결 개요

```
온리쌤 앱 (출석/결제)
  ↓
Event Ledger (Supabase)
  ↓
V-Index Calculation (Edge Function)
  ↓
Universal Profiles (V-Index 업데이트)
  ↓
실시간 표시 (EntityListScreen)
```

---

## 📊 Step 1: Event Ledger 테이블 생성

### Supabase SQL

```sql
-- ═══════════════════════════════════════════════════════════════════════════════
-- Event Ledger: 모든 의사결정 기록 (Append-Only)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE event_ledger (
  -- 기본 정보
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 주체
  entity_id UUID NOT NULL REFERENCES profiles(id),
  universal_id UUID REFERENCES universal_profiles(id),

  -- 이벤트 분류
  event_type TEXT NOT NULL, -- 'attendance', 'payment', 'absence', 'consultation'
  event_category TEXT NOT NULL CHECK (event_category IN ('motion', 'threat')),

  -- Physics 분류
  physics TEXT NOT NULL CHECK (physics IN ('CAPITAL', 'KNOWLEDGE', 'TIME', 'NETWORK', 'REPUTATION', 'HEALTH')),
  motion TEXT NOT NULL CHECK (motion IN ('ACQUIRE', 'SPEND', 'INVEST', 'WITHDRAW', 'LEND', 'BORROW', 'GIVE', 'RECEIVE', 'EXCHANGE', 'TRANSFORM', 'PROTECT', 'RISK')),
  domain TEXT NOT NULL CHECK (domain IN ('S', 'G', 'R', 'E')),

  -- 가치
  value DECIMAL(10, 2) NOT NULL, -- 이벤트의 가중치 (1.0 = 기본)
  base_value DECIMAL(10, 2) DEFAULT 1.0,

  -- 메타데이터
  metadata JSONB DEFAULT '{}',

  -- 관계 (선택)
  related_entity_id UUID REFERENCES profiles(id),

  -- 인덱스
  CONSTRAINT event_ledger_entity_created_idx UNIQUE (entity_id, created_at)
);

-- 인덱스 (빠른 조회)
CREATE INDEX idx_event_ledger_entity ON event_ledger(entity_id);
CREATE INDEX idx_event_ledger_universal ON event_ledger(universal_id);
CREATE INDEX idx_event_ledger_created ON event_ledger(created_at DESC);
CREATE INDEX idx_event_ledger_type ON event_ledger(event_type);
CREATE INDEX idx_event_ledger_category ON event_ledger(event_category);

-- RLS (Row Level Security)
ALTER TABLE event_ledger ENABLE ROW LEVEL SECURITY;

-- 정책: 자신의 이벤트만 조회
CREATE POLICY "Users can view own events"
  ON event_ledger FOR SELECT
  USING (
    entity_id IN (
      SELECT id FROM profiles WHERE id = auth.uid()
    )
    OR auth.uid() IN (
      SELECT user_id FROM academy_members WHERE role IN ('owner', 'coach', 'staff')
    )
  );

-- 정책: 서비스만 삽입 가능 (service_role)
CREATE POLICY "Service role can insert events"
  ON event_ledger FOR INSERT
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════════
-- V-Index 집계 뷰 (최근 30일)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE VIEW v_index_calculation AS
SELECT
  entity_id,
  universal_id,

  -- Motions (긍정적 행동)
  SUM(CASE WHEN event_category = 'motion' THEN value ELSE 0 END) AS motions,

  -- Threats (부정적 행동)
  SUM(CASE WHEN event_category = 'threat' THEN value ELSE 0 END) AS threats,

  -- Relations (관계 계수 - 기본 0.5)
  0.5 AS relations,

  -- Time (경과 월 수 - 최근 30일 기준)
  EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / (30 * 24 * 60 * 60) AS t_months,

  -- Base (기본값 1.0)
  1.0 AS base,

  -- InteractionExponent (기본 0.10)
  0.10 AS interaction_exponent,

  -- 계산된 V-Index
  -- V = (Motions - Threats) × (1 + InteractionExponent × Relations)^t × Base
  (
    (SUM(CASE WHEN event_category = 'motion' THEN value ELSE 0 END) -
     SUM(CASE WHEN event_category = 'threat' THEN value ELSE 0 END))
    *
    POWER(
      1 + (0.10 * 0.5),
      GREATEST(1, EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / (30 * 24 * 60 * 60))
    )
    * 1.0
  ) AS calculated_v_index,

  -- 통계
  COUNT(*) AS total_events,
  MAX(created_at) AS last_event_at

FROM event_ledger
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY entity_id, universal_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- V-Index 업데이트 트리거 함수
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_v_index()
RETURNS TRIGGER AS $$
BEGIN
  -- universal_profiles의 v_index 업데이트
  UPDATE universal_profiles
  SET
    v_index = (
      SELECT COALESCE(calculated_v_index, 100)
      FROM v_index_calculation
      WHERE universal_id = NEW.universal_id
    ),
    updated_at = NOW()
  WHERE id = NEW.universal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거: 이벤트 삽입 시 자동 V-Index 업데이트
CREATE TRIGGER trigger_update_v_index
  AFTER INSERT ON event_ledger
  FOR EACH ROW
  EXECUTE FUNCTION update_v_index();

-- ═══════════════════════════════════════════════════════════════════════════════
-- 이벤트 타입별 기본 매핑
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE event_type_mappings (
  event_type TEXT PRIMARY KEY,
  event_category TEXT NOT NULL CHECK (event_category IN ('motion', 'threat')),
  physics TEXT NOT NULL,
  motion TEXT NOT NULL,
  domain TEXT NOT NULL,
  default_value DECIMAL(10, 2) DEFAULT 1.0,
  description TEXT
);

-- 온리쌤 기본 이벤트 타입
INSERT INTO event_type_mappings (event_type, event_category, physics, motion, domain, default_value, description) VALUES
  ('attendance', 'motion', 'TIME', 'SPEND', 'G', 1.0, '출석 체크'),
  ('absence', 'threat', 'TIME', 'RISK', 'G', 1.0, '결석'),
  ('late', 'threat', 'TIME', 'RISK', 'G', 0.5, '지각'),
  ('payment_completed', 'motion', 'CAPITAL', 'SPEND', 'S', 1.0, '결제 완료'),
  ('payment_pending', 'threat', 'CAPITAL', 'RISK', 'S', 1.0, '미납'),
  ('consultation', 'motion', 'NETWORK', 'RECEIVE', 'R', 0.5, '상담'),
  ('enrollment', 'motion', 'NETWORK', 'ACQUIRE', 'R', 2.0, '등록'),
  ('feedback_positive', 'motion', 'REPUTATION', 'ACQUIRE', 'E', 1.0, '긍정적 피드백'),
  ('feedback_negative', 'threat', 'REPUTATION', 'RISK', 'E', 0.5, '부정적 피드백'),
  ('video_upload', 'motion', 'KNOWLEDGE', 'TRANSFORM', 'E', 1.0, '영상 업로드'),
  ('class_completion', 'motion', 'KNOWLEDGE', 'ACQUIRE', 'G', 1.0, '수업 완료'),
  ('achievement', 'motion', 'REPUTATION', 'ACQUIRE', 'E', 2.0, '성취 (대회, 승급)');
```

---

## 🔧 Step 2: Edge Function - V-Index 계산

### 파일: `supabase/functions/calculate-v-index/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { entity_id, universal_id } = await req.json();

    // 최근 30일 이벤트 조회
    const { data: events, error: eventsError } = await supabase
      .from('event_ledger')
      .select('*')
      .eq('entity_id', entity_id)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    if (eventsError) throw eventsError;

    // V-Index 계산
    const motions = events
      .filter(e => e.event_category === 'motion')
      .reduce((sum, e) => sum + e.value, 0);

    const threats = events
      .filter(e => e.event_category === 'threat')
      .reduce((sum, e) => sum + e.value, 0);

    const relations = 0.5; // 기본값
    const interactionExponent = 0.10;
    const base = 1.0;

    // 시간 (월 단위)
    const firstEvent = events.length > 0
      ? new Date(Math.min(...events.map(e => new Date(e.created_at).getTime())))
      : new Date();
    const t = Math.max(1, (Date.now() - firstEvent.getTime()) / (30 * 24 * 60 * 60 * 1000));

    // V = (M - T) × (1 + IE × s)^t × Base
    const v_index = (motions - threats)
      * Math.pow(1 + interactionExponent * relations, t)
      * base;

    // universal_profiles 업데이트
    const { error: updateError } = await supabase
      .from('universal_profiles')
      .update({ v_index: Math.round(v_index * 100) / 100 })
      .eq('id', universal_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        entity_id,
        universal_id,
        v_index,
        motions,
        threats,
        t,
        events_count: events.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
```

---

## 📱 Step 3: 온리쌤 앱 연동

### A. Event Service 생성

**파일**: `src/services/eventService.ts`

```typescript
import { supabase } from '../lib/supabase';

export interface EventInput {
  entity_id: string;
  universal_id?: string;
  event_type: string;
  value?: number;
  metadata?: Record<string, any>;
  related_entity_id?: string;
}

export const eventService = {
  /**
   * 이벤트 기록
   */
  async logEvent(input: EventInput) {
    // event_type_mappings에서 매핑 조회
    const { data: mapping } = await supabase
      .from('event_type_mappings')
      .select('*')
      .eq('event_type', input.event_type)
      .single();

    if (!mapping) {
      console.error(`Unknown event type: ${input.event_type}`);
      return null;
    }

    // universal_id 조회 (없으면)
    let universal_id = input.universal_id;
    if (!universal_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('universal_id')
        .eq('id', input.entity_id)
        .single();

      universal_id = profile?.universal_id;
    }

    // 이벤트 삽입
    const { data, error } = await supabase
      .from('event_ledger')
      .insert({
        entity_id: input.entity_id,
        universal_id,
        event_type: input.event_type,
        event_category: mapping.event_category,
        physics: mapping.physics,
        motion: mapping.motion,
        domain: mapping.domain,
        value: input.value ?? mapping.default_value,
        metadata: input.metadata ?? {},
        related_entity_id: input.related_entity_id,
      })
      .select()
      .single();

    if (error) {
      console.error('Event log error:', error);
      return null;
    }

    return data;
  },

  /**
   * V-Index 계산 트리거 (Edge Function 호출)
   */
  async calculateVIndex(entity_id: string, universal_id: string) {
    const { data, error } = await supabase.functions.invoke('calculate-v-index', {
      body: { entity_id, universal_id },
    });

    if (error) {
      console.error('V-Index calculation error:', error);
      return null;
    }

    return data;
  },

  /**
   * 출석 체크 이벤트
   */
  async logAttendance(student_id: string, status: 'present' | 'absent' | 'late') {
    const event_type = status === 'present' ? 'attendance' : status;
    return this.logEvent({
      entity_id: student_id,
      event_type,
      metadata: { status, timestamp: new Date().toISOString() },
    });
  },

  /**
   * 결제 이벤트
   */
  async logPayment(student_id: string, status: 'completed' | 'pending', amount: number) {
    const event_type = status === 'completed' ? 'payment_completed' : 'payment_pending';
    return this.logEvent({
      entity_id: student_id,
      event_type,
      value: amount / 100000, // 10만원 = 1.0
      metadata: { status, amount },
    });
  },
};
```

---

### B. CoachHomeScreen 출석 체크 연동

**파일**: `src/screens/v2/CoachHomeScreen.tsx`

```typescript
import { eventService } from '../../services/eventService';

// 출석 상태 변경 핸들러 (Line 381)
const handlePresence = useCallback(
  async (studentId: string, status: PresenceStatus) => {
    // Haptic feedback
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Optimistic update
    setPresenceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));

    // 🔥 이벤트 기록 (V-Index 자동 업데이트)
    if (status === 'PRESENT') {
      await eventService.logAttendance(studentId, 'present');
    } else if (status === 'ABSENT') {
      await eventService.logAttendance(studentId, 'absent');
    } else if (status === 'LATE') {
      await eventService.logAttendance(studentId, 'late');
    }

    // 기존 로직...
  },
  [presenceMap]
);
```

---

### C. EntityListScreen V-Index 실시간 표시

**파일**: `src/screens/v2/EntityListScreen.tsx`

```typescript
// Line 85-98: Supabase 쿼리 수정
const { data, error } = await supabase
  .from('profiles')
  .select(`
    id,
    name,
    phone,
    metadata,
    status,
    created_at,
    universal_id,
    universal_profiles!inner(v_index)
  `)
  .eq('type', 'student')
  .eq('status', 'active')
  .order('name', { ascending: true })
  .range(offset, offset + PAGE_SIZE - 1);

// Line 106-115: 데이터 매핑 수정
const formatted: Entity[] = data.map((profile: any) => ({
  id: profile.id,
  name: profile.name || '이름 없음',
  contact: profile.phone || '-',
  vIndex: Math.round(profile.universal_profiles?.v_index ?? 50), // 🔥 실제 V-Index
  status: getStatusFromVIndex(profile.universal_profiles?.v_index ?? 50),
  lastSession: undefined,
  nextSession: undefined,
  unpaidAmount: undefined,
}));

// 새로운 함수: V-Index → 상태 매핑
function getStatusFromVIndex(vIndex: number): 'safe' | 'caution' | 'risk' {
  if (vIndex >= 70) return 'safe';
  if (vIndex >= 40) return 'caution';
  return 'risk';
}
```

---

## 🎨 Step 4: UI 개선

### V-Index 색상 및 아이콘

**EntityListScreen.tsx**:

```typescript
// V-Index 배지 색상
const getVIndexColor = (vIndex: number) => {
  if (vIndex >= 70) return colors.success.primary; // 녹색
  if (vIndex >= 40) return colors.caution.primary; // 주황색
  return colors.danger.primary; // 빨간색
};

// Line 240-244: V-Index 표시 개선
<View style={[
  styles.vIndexBadge,
  { backgroundColor: `${getVIndexColor(item.vIndex)}20` }
]}>
  <Text style={[styles.vIndexText, { color: getVIndexColor(item.vIndex) }]}>
    {item.vIndex}°
  </Text>
</View>
```

---

## 📊 Step 5: 실시간 업데이트

### Supabase Realtime 구독

**EntityListScreen.tsx**:

```typescript
useEffect(() => {
  // V-Index 변경 실시간 구독
  const subscription = supabase
    .channel('v-index-changes')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'universal_profiles',
        filter: 'id=in.(학생들의 universal_id)',
      },
      (payload) => {
        // V-Index 업데이트 시 자동 리프레시
        setEntities(prev =>
          prev.map(entity =>
            entity.universal_id === payload.new.id
              ? { ...entity, vIndex: payload.new.v_index }
              : entity
          )
        );
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, []);
```

---

## ✅ 배포 체크리스트

### 1. Supabase 설정
- [ ] Event Ledger 테이블 생성
- [ ] V-Index 계산 뷰 생성
- [ ] 트리거 함수 생성
- [ ] Event Type Mappings 데이터 삽입
- [ ] RLS 정책 활성화

### 2. Edge Function 배포
```bash
cd /Users/seho/Desktop/autus/온리쌤
supabase functions deploy calculate-v-index
```

### 3. 앱 코드 업데이트
- [ ] eventService.ts 생성
- [ ] CoachHomeScreen 출석 체크 연동
- [ ] EntityListScreen V-Index 표시
- [ ] Realtime 구독 설정

### 4. 테스트
- [ ] 출석 체크 → Event Ledger 기록 확인
- [ ] V-Index 자동 계산 확인
- [ ] EntityListScreen에서 V-Index 표시 확인
- [ ] 실시간 업데이트 확인

---

## 🎯 예상 결과

### Before (현재)
```
EntityListScreen
├─ 김민준: 50° (기본값)
├─ 이서윤: 50° (기본값)
└─ 박지호: 50° (기본값)
```

### After (연결 후)
```
EntityListScreen
├─ 김민준: 95° ✅ (출석 12/12, 결제 완료)
├─ 이서윤: 78° ⚠️ (출석 11/12, 결제 완료)
└─ 박지호: 42° ❌ (출석 8/12, 미납)
```

**실시간 계산**:
- 출석 1회 → V-Index +1
- 결석 1회 → V-Index -1
- 결제 완료 → V-Index +1
- 미납 → V-Index -1

---

## 🚀 다음 단계

### Phase 1 (이번 주)
1. Supabase 테이블 생성
2. Edge Function 배포
3. eventService.ts 구현

### Phase 2 (다음 주)
4. CoachHomeScreen 연동
5. EntityListScreen V-Index 표시
6. 실시간 업데이트

### Phase 3 (3주차)
7. 결제 이벤트 연동
8. 성장 그래프 (V-Index 추이)
9. 랭킹 시스템

---

**작성**: 2026-02-14
**예상 완성**: 2026-02-28 (2주)
**첫 테스트**: 유비 배구 아카데미
