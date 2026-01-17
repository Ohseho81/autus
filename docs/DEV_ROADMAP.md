# AUTUS 개발 로드맵

> 최종 업데이트: 2026-01-17

---

## ✅ 완료된 항목

### 1. 핵심 엔진 (Backend)
| 항목 | 파일 | 상태 |
|------|------|------|
| V 공식 코어 엔진 | `backend/physics/v_engine.py` | ✅ |
| AI 예측 모듈 (LSTM) | `backend/physics/v_predictor.py` | ✅ |
| 라플라스 악마 v2.0 | `backend/physics/laplace_demon.py` | ✅ |
| Transformer/PatchTST | `backend/physics/transformer_predictor.py` | ✅ |
| V API 라우터 | `backend/routers/v_router.py` | ✅ |

### 2. 업무 자동화 MVP v0.1
| 항목 | 파일 | 상태 |
|------|------|------|
| 할 일 우선순위 정렬 | `backend/automation/prioritizer.py` | ✅ |
| 회의록 결정 추출 | `backend/automation/meeting_extractor.py` | ✅ |
| 일일 보고서 생성 | `backend/automation/report_generator.py` | ✅ |
| 자동화 API | `backend/routers/automation_router.py` | ✅ |

### 3. 헌법 & 설정
| 항목 | 파일 | 상태 |
|------|------|------|
| AUTUS 헌법 | `CONSTITUTION.md` | ✅ |
| 헌법 Python 코드 | `backend/core/constitution.py` | ✅ |
| v15.2 설정 | `backend/core/config_v15_2.json` | ✅ |

### 4. 프론트엔드
| 항목 | 파일 | 상태 |
|------|------|------|
| Sovereign PWA v15.2 | `frontend/deploy/sovereign-live/` | ✅ |
| 기본 배포 설정 | `frontend/deploy/_redirects` | ✅ |

---

## 🔄 진행 중 (7-Day Sprint)

### Day 5: 프론트엔드 연결 & 테스트
| 항목 | 우선순위 | 상태 |
|------|----------|------|
| 자동화 UI 컴포넌트 | 🔴 높음 | ⏳ 대기 |
| API 연동 테스트 | 🔴 높음 | ⏳ 대기 |
| IndexedDB 연동 | 🟡 중간 | ⏳ 대기 |

### Day 6: 내부 베타 배포
| 항목 | 우선순위 | 상태 |
|------|----------|------|
| 5~10명 베타 배포 | 🔴 높음 | ⏳ 대기 |
| 피드백 폼 설정 | 🟡 중간 | ⏳ 대기 |

### Day 7: 기능 동결
| 항목 | 우선순위 | 상태 |
|------|----------|------|
| 피드백 반영 | 🔴 높음 | ⏳ 대기 |
| MVP v0.1 확정 | 🔴 높음 | ⏳ 대기 |

---

## 📋 개발 대기 목록 (Backlog)

### Phase 1: MVP 완성 (현재)
| # | 항목 | 설명 | 예상 시간 |
|---|------|------|----------|
| 1 | **자동화 UI** | 할 일/회의록/보고서 UI | 4h |
| 2 | **API 통합** | Frontend ↔ Backend 연결 | 2h |
| 3 | **로컬 저장** | IndexedDB 스키마 확정 | 2h |
| 4 | **베타 배포** | Netlify 업데이트 | 1h |

### Phase 2: 복리 시각화 (v0.2)
| # | 항목 | 설명 | 예상 시간 |
|---|------|------|----------|
| 5 | **V 그래프** | 시간에 따른 V 변화 차트 | 6h |
| 6 | **성장 애니메이션** | 복리 성장 시각 효과 | 4h |
| 7 | **비교 뷰** | 결정 전/후 비교 | 4h |
| 8 | **마일스톤** | 목표 달성 알림 | 2h |

### Phase 3: P2P & 위임 (v0.3)
| # | 항목 | 설명 | 예상 시간 |
|---|------|------|----------|
| 9 | **P2P 동기화** | Ledger 교환 | 8h |
| 10 | **결정 위임** | 다른 사용자에게 위임 | 6h |
| 11 | **팀 대시보드** | 팀 전체 V 현황 | 6h |
| 12 | **위임 보상** | 위임 수락 시 Synergy 증가 | 4h |

### Phase 4: 외부 연동 (v0.4)
| # | 항목 | 설명 | 예상 시간 |
|---|------|------|----------|
| 13 | **Gmail 연동** | OAuth + 이메일 분석 | 8h |
| 14 | **캘린더 연동** | Google Calendar 동기화 | 6h |
| 15 | **Slack 연동** | 메시지 → 할 일 변환 | 6h |
| 16 | **n8n 스와튼** | 학원 데이터 웹훅 | 4h |

### Phase 5: 고급 기능 (v1.0)
| # | 항목 | 설명 | 예상 시간 |
|---|------|------|----------|
| 17 | **음성 입력** | 회의록 음성 → 텍스트 | 8h |
| 18 | **AI 추천** | 다음 결정 제안 | 6h |
| 19 | **자동 실행** | 승인된 결정 자동 처리 | 8h |
| 20 | **분석 리포트** | 주간/월간 V 분석 | 6h |

---

## 🎯 즉시 실행 목록 (오늘)

### 최우선 (Today)
```
□ 1. 자동화 UI 컴포넌트 작성
     - TaskPrioritizer UI
     - MeetingExtractor UI  
     - ReportGenerator UI

□ 2. API fetch 함수 작성
     - /automation/prioritize
     - /automation/meeting
     - /automation/report

□ 3. IndexedDB 스키마 확정
     - tasks 테이블
     - decisions 테이블
     - reports 테이블
```

### 이번 주
```
□ 4. 베타 배포 (5-10명)
□ 5. 피드백 수집
□ 6. MVP v0.1 기능 동결
```

---

## 📊 진행률

```
Phase 1 (MVP)     ████████░░░░░░░░  50%
Phase 2 (시각화)   ░░░░░░░░░░░░░░░░   0%
Phase 3 (P2P)     ░░░░░░░░░░░░░░░░   0%
Phase 4 (연동)    ░░░░░░░░░░░░░░░░   0%
Phase 5 (고급)    ░░░░░░░░░░░░░░░░   0%
─────────────────────────────────────
전체              ████░░░░░░░░░░░░  25%
```

---

## 🚫 제외 항목 (하지 않을 것)

| 항목 | 이유 |
|------|------|
| V 예측 노출 | 핵심 원칙 위반 |
| 복잡한 온보딩 | 설명 없이 시작 |
| 소셜 기능 | 범위 초과 |
| 결제 시스템 | MVP 범위 초과 |
| 앱스토어 배포 | PWA로 충분 |

---

## 📝 다음 액션

**지금 바로**: Day 5 작업 시작 (자동화 UI 구현)

```
git checkout -b feature/automation-ui
→ UI 컴포넌트 작성
→ API 연동
→ 테스트
→ PR & 머지
```

---

*"AUTUS는 설명하지 않고 결과만 남긴다"*
