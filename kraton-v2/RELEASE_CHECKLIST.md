# AUTUS v1.0 최종 출시 체크리스트

## 📋 현재 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| 코어 아키텍처 | ✅ 완료 | EventBus, Persistence, ConstitutionEnforcer |
| V-Factory 엔진 | ✅ 완료 | Working Backwards 계산 |
| Pain Signal 분류 | ✅ 완료 | 학습형 키워드 기반 |
| K1-K5 헌법 강제 | ✅ 완료 | 미들웨어 패턴 |
| Operations 대시보드 | ✅ 완료 | #ops 라우트 |
| 빌드 | ✅ 성공 | npm run build |

---

## 🔴 필수 작업 (출시 전 반드시 완료)

### 1. 기능 테스트 (로컬에서 수행)
```
예상 소요: 2시간
```

- [ ] **Pain Signal 분류 테스트**
  - 환불/결제오류 입력 → PAIN 분류 확인
  - 문의 입력 → REQUEST 분류 확인
  - 잡담 입력 → NOISE 분류 확인
  - 분류 후 pain_queue/request_queue에 저장 확인

- [ ] **V 생성 테스트**
  - Pain 해결 시 V 금액 입력 → V 기록 확인
  - VFactory 대시보드에 V 반영 확인

- [ ] **데이터 영속성 테스트**
  - 입력 후 페이지 새로고침 → 데이터 유지 확인
  - LocalStorage에 autus_ 키로 저장 확인

- [ ] **헌법 검사 테스트**
  - K3 위반 테스트: 증거 없는 승진 시도 → 차단 확인
  - K4 위반 테스트: 24시간 미경과 강등 시도 → 차단 확인

### 2. 디버그 로그 제거
```
예상 소요: 30분
```

- [ ] `AUTUSRuntime.js`에서 console.log 제거 또는 조건부 로깅으로 변경
  - processInput 로그
  - _routeToPain 로그
  - _registerEventHandlers 로그

```javascript
// 프로덕션용 조건부 로깅 예시
const DEBUG = import.meta.env.DEV;
if (DEBUG) console.log('[Runtime] ...');
```

### 3. 에러 핸들링 강화
```
예상 소요: 1시간
```

- [ ] **AUTUSOperations.jsx에 Error Boundary 추가**
```jsx
<ErrorBoundary fallback={<ErrorFallback />}>
  <AUTUSOperations />
</ErrorBoundary>
```

- [ ] **API 호출 실패 시 사용자 알림**
  - Toast 또는 Alert 컴포넌트 추가
  - 네트워크 오류 시 재시도 버튼

- [ ] **Persistence 실패 시 폴백**
  - LocalStorage quota 초과 처리
  - 오래된 데이터 자동 정리

### 4. 환경변수 설정 문서화
```
예상 소요: 30분
```

- [ ] `.env.example` 파일 생성
```env
# Supabase (선택)
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# 디버그 모드
VITE_DEBUG=false
```

---

## 🟡 권장 작업 (시범 운영 중 개선)

### 5. Supabase 연동 테스트
```
예상 소요: 2시간
```

- [ ] Supabase 프로젝트 생성
- [ ] 테이블 스키마 설정
  - pain_queue
  - request_queue
  - log_v_creation
  - log_violations
- [ ] 환경변수 설정 후 동기화 테스트

### 6. UI/UX 개선
```
예상 소요: 3시간
```

- [ ] 로딩 스피너 개선 (Skeleton UI)
- [ ] 빈 상태 메시지 개선
- [ ] 입력 폼 유효성 검사 메시지
- [ ] 모바일 반응형 확인

### 7. 성능 최적화
```
예상 소요: 2시간
```

- [ ] React.memo로 불필요한 리렌더링 방지
- [ ] useMemo/useCallback 최적화
- [ ] 대량 데이터 가상 스크롤 (Pain 큐가 많을 때)

### 8. 모니터링 설정
```
예상 소요: 1시간
```

- [ ] 에러 로깅 서비스 연동 (Sentry 등)
- [ ] 핵심 메트릭 대시보드 설정
- [ ] 알림 설정 (헌법 위반 시)

---

## 🟢 향후 개선 (v1.1+)

### 9. 고급 기능
- [ ] ML 기반 Pain Signal 분류
- [ ] 자동 워크플로우 추천
- [ ] 멀티 테넌트 지원
- [ ] API 엔드포인트 (외부 연동)

### 10. 보안 강화
- [ ] Row Level Security (Supabase)
- [ ] 감사 로그 암호화
- [ ] API 키 로테이션

---

## 📅 출시 일정 제안

| 단계 | 기간 | 내용 |
|------|------|------|
| **알파 테스트** | D+0 ~ D+3 | 개발팀 내부 테스트 |
| **버그 수정** | D+4 ~ D+5 | 발견된 버그 수정 |
| **베타 출시** | D+6 | 소수 사용자 시범 운영 시작 |
| **시범 운영** | D+6 ~ D+34 | 4주 시범 운영 |
| **정식 출시** | D+35 | v1.0 정식 출시 |

---

## ⚡ 빠른 출시를 위한 최소 요구사항

**내일 당장 출시하려면 아래만 완료:**

1. ✅ 빌드 성공 확인
2. ⬜ Pain Signal 분류 기능 테스트 (30분)
3. ⬜ 데이터 영속성 테스트 (15분)
4. ⬜ 디버그 로그 제거 (15분)

**총 예상 시간: 1시간**

---

## 🚀 출시 명령어

```bash
# 1. 빌드
npm run build

# 2. 프리뷰 (로컬 테스트)
npm run preview

# 3. 배포 (예: Vercel)
vercel --prod

# 또는 정적 파일 배포
# dist/ 폴더를 웹서버에 업로드
```

---

*Last Updated: 2026-02-02*
