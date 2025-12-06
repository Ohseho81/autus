# ⚡ 빠른 참조 카드 (Quick Reference)

> **목적**: 터미널에서 지금 바로 실행할 명령어 모음  
> **대상**: 로컬 macOS zsh  
> **시간**: 각 섹션 3-5분

---

## 🎯 지금 바로 실행 (15분)

### 1️⃣ 프로젝트 이동 & 의존성 설치
```bash
cd /Users/oseho/Desktop/autus
pip install -r requirements.txt --no-cache-dir
```

### 2️⃣ 현재 상태 확인
```bash
# 테스트 실행
pytest tests/ -x -q --ignore=tests/load_test.py

# 간단하게 한 줄로
python -c "from main import app; print('✅ AUTUS 정상')"
```

### 3️⃣ 서버 시작
```bash
uvicorn main:app --reload --port 8000
```

---

## 🔧 자주 사용하는 명령어
```bash
# 서버 시작
uvicorn main:app --reload --port 8000

# API 문서
open http://localhost:8000/docs

# 헬스 체크
curl http://localhost:8000/health

# 전체 테스트
pytest tests/ -v --ignore=tests/load_test.py

# Git 커밋
git add -A && git commit -m "message" && git push origin main
```

---

## ✅ 체크리스트

- [ ] 의존성 설치
- [ ] 테스트 통과
- [ ] 서버 작동
- [ ] API 문서 확인

