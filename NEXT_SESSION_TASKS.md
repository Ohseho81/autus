# 다음 세션 작업 (프로젝트 방에서)

> 작성일: 2024-11-22  
> 목표: Workflow Graph 완성 및 Local Memory OS 시작

---

## 🎯 우선순위 작업

### 1️⃣ Workflow Graph 테스트 완성 (80% → 100%)

**현재 상태**: 80% 완성
- ✅ Graph 구조 설계 완료
- ✅ Node, Edge 모델 구현 완료
- ✅ JSON 스키마 정의 완료
- ⏳ 테스트 코드 필요
- ⏳ 문서 생성 필요

**작업 순서**:

#### Step 1: 테스트 코드 자동 생성 (🟡 아우투스)
```bash
cd ~/Desktop/autus

# 테스트 코드 자동 생성
python core/pack/runner.py testgen_pack \
  '{"source_file": "protocols/workflow/graph.py", "source_code": "...", "module_name": "workflow"}'
```

**예상 시간**: 1-2시간

#### Step 2: 테스트 실행 및 검증 (🔵 터미널)
```bash
# 테스트 실행
pytest tests/protocols/workflow/ -v

# 커버리지 확인
pytest tests/protocols/workflow/ --cov=protocols/workflow --cov-report=html
```

**예상 시간**: 30분-1시간

#### Step 3: 버그 수정 및 최적화 (🟢 커서)
- [ ] 테스트 실패 케이스 수정
- [ ] 에러 처리 개선
- [ ] 성능 최적화
- [ ] Edge case 처리

**예상 시간**: 2-3시간

#### Step 4: 문서 자동 생성 (🟡 아우투스)
```bash
# API 문서 생성
python core/pack/runner.py docgen_pack \
  '{"source_file": "protocols/workflow/graph.py", "doc_type": "api"}'

# 사용 예시 생성
python core/pack/runner.py codegen_pack \
  '{"file_path": "docs/examples/workflow_example.py", "purpose": "Workflow Graph usage example"}'
```

**예상 시간**: 1시간

#### Step 5: 최종 검증 및 커밋 (🔵 터미널)
```bash
# 최종 테스트
pytest tests/protocols/workflow/ -v
ruff check protocols/workflow/
mypy protocols/workflow/

# 커밋
git add protocols/workflow/ tests/protocols/workflow/ docs/
git commit -m "feat: Complete Workflow Graph Protocol (100%)

- Add comprehensive tests
- Fix edge cases
- Add documentation
- Performance optimization"
```

**예상 시간**: 30분

**총 예상 시간**: 5-7시간

---

### 2️⃣ Local Memory OS 구현 시작 (20% → 50%)

**현재 상태**: 20% (계획 완료)
- ✅ 계획 생성 완료 (architect_pack 사용)
- ⏳ 환경 설정 필요
- ⏳ 구조 설계 필요
- ⏳ 기본 구현 필요

**작업 순서**:

#### Step 1: 환경 설정 (🔵 터미널)
```bash
cd ~/Desktop/autus

# 의존성 설치
pip install sentence-transformers duckdb pyyaml

# 디렉토리 생성
mkdir -p protocols/memory
mkdir -p tests/protocols/memory
mkdir -p .autus/memory  # 로컬 저장소
```

**예상 시간**: 15분

#### Step 2: 구조 설계 (🟢 커서)
- [ ] `protocols/memory/__init__.py` - 모듈 초기화
- [ ] `protocols/memory/os.py` - MemoryOS 클래스 설계
  - 저장소 스키마 설계
  - 벡터 인덱싱 전략
  - 검색 알고리즘 설계
- [ ] `protocols/memory/storage.py` - 로컬 저장소 설계
- [ ] `protocols/memory/index.py` - 벡터 인덱스 설계

**예상 시간**: 4-6시간

#### Step 3: 스키마 자동 생성 (🟡 아우투스)
```bash
# YAML 예시 자동 생성
python core/pack/runner.py codegen_pack \
  '{"file_path": "protocols/memory/example.yaml", "purpose": "Memory OS YAML example"}'

# 스키마 정의 자동 생성
python core/pack/runner.py codegen_pack \
  '{"file_path": "protocols/memory/schema.yaml", "purpose": "Memory OS schema definition"}'
```

**예상 시간**: 1시간

#### Step 4: 기본 구현 (🟢 커서)
- [ ] `protocols/memory/storage.py` - 로컬 저장소 구현
  - SQLite/DuckDB 연결
  - 기본 CRUD 작업
- [ ] `protocols/memory/index.py` - 벡터 인덱스 구현
  - 임베딩 생성
  - 벡터 검색
- [ ] `protocols/memory/os.py` - MemoryOS 기본 구현
  - `store_preference()` 메서드
  - `store_pattern()` 메서드
  - `search()` 메서드 (기본)

**예상 시간**: 6-8시간

#### Step 5: 테스트 및 검증 (🔵 터미널 + 🟢 커서)
```bash
# 테스트 실행
pytest tests/protocols/memory/ -v

# 성능 테스트
python -m pytest tests/protocols/memory/ -k "test_performance" -v
```

**예상 시간**: 2-3시간

#### Step 6: 커밋 (🔵 터미널)
```bash
git add protocols/memory/ tests/protocols/memory/
git commit -m "feat: Local Memory OS Protocol implementation (50%)

- Basic storage implementation
- Vector indexing setup
- Core MemoryOS class
- Initial tests"
```

**예상 시간**: 15분

**총 예상 시간**: 14-19시간 (2-3일)

---

### 3️⃣ 정기 커밋 유지

**목표**: 기능 단위로 자주 커밋하여 진행 상황 추적

**커밋 전략**:

#### 작은 단위 커밋
```bash
# 각 기능 완성 시마다
git add <변경된 파일>
git commit -m "feat: <기능 설명>"
```

#### 일일 커밋
```bash
# 하루 작업 마무리 시
git add .
git commit -m "docs: Daily progress update

- Workflow Graph: <진행 상황>
- Local Memory OS: <진행 상황>
- 기타: <기타 작업>"
```

#### 주간 요약 커밋
```bash
# 주말에 주간 진행 상황 정리
git commit -m "docs: Weekly progress summary

Week: <날짜>
- Completed: <완료된 작업>
- In Progress: <진행 중 작업>
- Next: <다음 주 계획>"
```

**커밋 메시지 규칙**:
- `feat:` - 새 기능
- `fix:` - 버그 수정
- `docs:` - 문서
- `refactor:` - 리팩토링
- `test:` - 테스트

---

## 📅 예상 일정

### Day 1 (Workflow Graph 완성)
- 오전: 테스트 코드 생성 (아우투스)
- 오후: 테스트 실행 및 버그 수정 (터미널 + 커서)
- 저녁: 문서 생성 및 최종 검증 (아우투스 + 터미널)

### Day 2-3 (Local Memory OS 시작)
- Day 2 오전: 환경 설정 및 구조 설계 (터미널 + 커서)
- Day 2 오후: 스키마 생성 및 기본 구현 시작 (아우투스 + 커서)
- Day 3: 기본 구현 완성 및 테스트 (커서 + 터미널)

---

## ✅ 체크리스트

### Workflow Graph 완성
- [ ] 테스트 코드 자동 생성
- [ ] 테스트 실행 및 통과
- [ ] 버그 수정
- [ ] 문서 생성
- [ ] 최종 검증
- [ ] Git 커밋

### Local Memory OS 시작
- [ ] 환경 설정
- [ ] 구조 설계
- [ ] 스키마 생성
- [ ] 기본 구현
- [ ] 테스트 작성
- [ ] Git 커밋

### 정기 커밋
- [ ] 기능 단위 커밋
- [ ] 일일 진행 상황 커밋
- [ ] 주간 요약 커밋

---

## 🎯 목표 달성 기준

### Workflow Graph 100% 완성
- ✅ 모든 테스트 통과
- ✅ 문서 완성
- ✅ 예시 코드 작성
- ✅ 성능 검증 완료

### Local Memory OS 50% 완성
- ✅ 기본 저장소 구현
- ✅ 벡터 인덱스 설정
- ✅ Core 메서드 구현
- ✅ 기본 테스트 통과

---

## 💡 팁

1. **아우투스 자동생성 최대 활용**
   - 테스트 코드는 자동 생성
   - 문서도 자동 생성
   - 시간 절약 30-40%

2. **작은 단위로 커밋**
   - 각 기능 완성 시마다 커밋
   - 진행 상황 추적 용이

3. **테스트 우선**
   - 구현 전에 테스트 작성 (TDD)
   - 안정성 보장

4. **문서화 병행**
   - 구현과 동시에 문서 작성
   - 나중에 까먹지 않음

---

## 📝 다음 세션 시작 시

1. 이 파일 확인
2. 현재 상태 확인 (`git status`)
3. ROADMAP.md 업데이트
4. 작업 시작

---

*Last Updated: 2024-11-22*  
*Next Session: Workflow Graph Completion*

