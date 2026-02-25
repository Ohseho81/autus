# 추가 정리할 리스트

> 2026-02 정리 기준 · 우선순위순
> **적용 완료**: 2026-02-26 (docs 재구성, scripts 분류, upload 통합, 남은 정리)

---

## 1. docs/ (139개 파일) — 우선순위 높음

### 1-1. 중복/구버전 병합
| 유사 문서 | 조치 |
|----------|------|
| ARCHITECTURE.md vs ARCHITECTURE_FINAL.md | 하나로 통합 후 아카이브 |
| DEPLOYMENT.md vs DEPLOYMENT_GUIDE.md vs DEPLOYMENT_READY.md | 통합 |
| KAKAO_*.md (4개) | KAKAO_IMPLEMENTATION_GUIDE 중심으로 통합 |
| N8N_*.md (3개) | N8N_COMPLETE_SETUP 중심으로 통합 |
| SUPABASE_SETUP_GUIDE vs ATB_SUPABASE_SETUP | 통합 |
| AUTUS_SPEC_v1 vs AUTUS_SYSTEM_SPEC vs AUTUS_V1_FINAL | 핵심 1개 남기고 _archive |

### 1-2. 기한 지난 일회성 문서 → docs/_archive
- ERROR_FIX_REPORT_20260222.md
- ONLYSSAM_SUMMARY_20260222.md
- FULL_INVENTORY_20260223.md
- FIX_401_ERROR.md
- LAUNCH_NOW.md, START_NOW.md, MVP_V0.1_RELEASE.md (완료된 캠페인)
- GENESIS_README.py (문서 폴더에 .py?)

### 1-3. 폴더별 분류 재구성
```
docs/
├── spec/        # SPEC, SPEC_v1, ARCHITECTURE
├── setup/       # KAKAO, N8N, SUPABASE, SECRETS
├── api/         # API_REFERENCE, API_SPEC, AGENT_API_SPEC
├── _ref/        # (현재) 엑셀·설계 참조
└── _archive/    # 구버전·일회성
```

---

## 2. scripts/ (48개) — 우선순위 중간

### 2-1. upload_students 중복 (5개)
| 파일 | 조치 |
|------|------|
| upload_students.py | 메인 유지 |
| upload_students_fixed.py | upload_students.py에 통합 후 삭제 |
| upload_students_secure.py | " |
| upload_students_to_supabase.py | " |
| direct_upload.py | 역할 확인 후 유지/통합 |

### 2-2. 사용 여부 확인 후 정리
- autonomous_builder.py, autonomous_monitor.py
- create_*.py (matching_sheet, optimization_checklist 등) — 일회성 생성 스크립트
- *.sh (backup, cleanup, deploy, install 등) — Makefile 대체 가능성 검토
- migrate-autus-v2.ts — migration 완료 시 삭제
- trinity_report.py, replay_simulation.py — 사용처 확인

### 2-3. scripts/ 하위 분류
```
scripts/
├── upload/      # upload_*, direct_upload
├── setup/       # setup_*, install-*, verify-*
├── deploy/      # deploy.sh, backup.sh
├── sql/         # *.sql
└── (기타)
```

---

## 3. 프로젝트 폴더 — 우선순위 낮음

### 3-1. 사용 여부 확인
| 폴더 | 내용 | 조치 |
|------|------|------|
| app/ | main.py, engine | backend와 통합? 별도 서비스? |
| core/ | kernel만 | autus-core vs core 중복 여부 |
| contracts/ | AutusAnchor.sol | 블록체인 사용 시 유지, 아니면 _archive |
| dags/ | autus_monthly_update.py | Airflow DAG? 사용 여부 확인 |

### 3-2. autus-ui-v1
- kraton-v2와 역할 겹침 — deprecated 표시 또는 _archive 검토

### 3-3. screenshots/ ✅
- `docs/assets/`로 이동 완료

---

## 4. 루트 정리

### 4-1. MD 통합
- SETUP.md vs QUICKSTART.md vs CURSOR_QUICKSTART.md → README에 통합 링크만

### 4-2. 배포 설정 중복
- railway.json, railway.toml, render.yaml — 실제 사용하는 것만 유지

---

## 5. 즉시 적용 가능 (저위험)

- [ ] docs/GENESIS_README.py → scripts/ 이동 또는 삭제
- [ ] scripts/ 내 upload_students_* 4개 → 1개로 통합
- [ ] docs/ 20260222, 20260223 일회성 리포트 → docs/_archive/
- [ ] .gitignore에 docs/_archive/ 추가 (선택)

---

## 6. 참고

- FULL_INVENTORY_20260223.md: 전체 자산 현황
- FOLDER_STRUCTURE.md: 현재 폴더 구조
- FOLDER_CONSOLIDATION.md: 이전 통합 이력
