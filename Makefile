# ═══════════════════════════════════════════════════════════════════════════════
# 🏛️ AUTUS - Makefile
# ═══════════════════════════════════════════════════════════════════════════════
#
# 사용법: make [command]
# 전체 명령어: make help
#
# ═══════════════════════════════════════════════════════════════════════════════

.PHONY: help install dev test lint format clean clean-all docker-up docker-down frontend react react-build all streamlit simulator backup report release

# 기본 변수
PYTHON := python3
PIP := pip
PROJECT_DIR := autus-unified
BACKEND_DIR := backend
FRONTEND_DIR := frontend
VENV_DIR := venv
VENV_PYTHON := $(VENV_DIR)/bin/python
VENV_PIP := $(VENV_DIR)/bin/pip
VERSION := $(shell git describe --tags --always 2>/dev/null || echo "dev")

# 색상 정의
CYAN := \033[0;36m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m

# ───────────────────────────────────────────────────────────────────────────────
# 📚 도움말
# ───────────────────────────────────────────────────────────────────────────────

help:
	@echo ""
	@echo "$(CYAN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(CYAN)  🏛️  AUTUS - 개발 명령어 v$(VERSION)$(NC)"
	@echo "$(CYAN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(GREEN)🚀 시작$(NC)"
	@echo "   make install      - Backend 의존성 설치"
	@echo "   make install-all  - 전체 의존성 설치"
	@echo "   make dev          - Backend API 서버 실행"
	@echo "   make frontend     - React 개발 서버 실행"
	@echo "   make all          - Backend + Frontend 동시 실행"
	@echo ""
	@echo "$(GREEN)🧪 테스트$(NC)"
	@echo "   make test         - 전체 테스트 실행"
	@echo "   make test-cov     - 커버리지 포함 테스트"
	@echo "   make test-watch   - 테스트 감시 모드"
	@echo ""
	@echo "$(GREEN)🔍 코드 품질$(NC)"
	@echo "   make lint         - 린트 검사 (Ruff + ESLint)"
	@echo "   make format       - 코드 포맷팅"
	@echo "   make fix          - 린트 + 포맷 자동 수정"
	@echo "   make typecheck    - 타입 체크 (mypy + tsc)"
	@echo ""
	@echo "$(GREEN)🐳 Docker$(NC)"
	@echo "   make docker-up    - Docker Compose 실행"
	@echo "   make docker-down  - Docker Compose 종료"
	@echo "   make docker-build - Docker 이미지 빌드"
	@echo "   make docker-logs  - Docker 로그 확인"
	@echo ""
	@echo "$(GREEN)📦 빌드 & 배포$(NC)"
	@echo "   make build        - 프로덕션 빌드"
	@echo "   make release      - 릴리즈 태그 생성"
	@echo "   make deploy       - 배포 (GitHub Pages)"
	@echo ""
	@echo "$(GREEN)🤖 자동화$(NC)"
	@echo "   make backup       - 백업 실행 (daily/weekly/full)"
	@echo "   make report       - Trinity 주간 리포트 생성"
	@echo "   make healthcheck  - 서비스 헬스체크"
	@echo "   make monitor      - 모니터링 대시보드 실행"
	@echo ""
	@echo "$(GREEN)🧹 정리$(NC)"
	@echo "   make clean        - 캐시 파일 정리"
	@echo "   make clean-all    - 전체 정리"
	@echo ""
	@echo "$(GREEN)📊 유틸리티$(NC)"
	@echo "   make status       - 프로젝트 상태 확인"
	@echo "   make logs         - 로그 확인"
	@echo "   make open         - 브라우저에서 열기"
	@echo ""
	@echo "$(CYAN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo ""

# ───────────────────────────────────────────────────────────────────────────────
# 📦 설치
# ───────────────────────────────────────────────────────────────────────────────

install:
	@echo "$(CYAN)📦 Backend 의존성 설치...$(NC)"
	@if [ ! -d "$(VENV_DIR)" ]; then \
		$(PYTHON) -m venv $(VENV_DIR); \
		echo "$(GREEN)✅ 가상환경 생성 완료$(NC)"; \
	fi
	@$(VENV_PIP) install --upgrade pip
	@$(VENV_PIP) install -r $(BACKEND_DIR)/requirements.txt
	@$(VENV_PIP) install ruff pytest pytest-cov httpx pytest-asyncio mypy bandit
	@echo "$(GREEN)✅ Backend 설치 완료!$(NC)"

install-frontend:
	@echo "$(CYAN)📦 Frontend 의존성 설치...$(NC)"
	@cd $(FRONTEND_DIR) && npm ci
	@echo "$(GREEN)✅ Frontend 설치 완료!$(NC)"

install-all: install install-frontend
	@echo "$(GREEN)✅ 전체 설치 완료!$(NC)"

# ───────────────────────────────────────────────────────────────────────────────
# 🚀 개발 서버
# ───────────────────────────────────────────────────────────────────────────────

dev:
	@echo "$(CYAN)🚀 Backend API 서버 시작...$(NC)"
	@echo "$(GREEN)   📍 http://localhost:8000$(NC)"
	@echo "$(GREEN)   📚 http://localhost:8000/docs$(NC)"
	@echo ""
	@cd $(BACKEND_DIR) && $(VENV_PYTHON) -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

frontend:
	@echo "$(CYAN)⚛️  React 개발 서버 시작...$(NC)"
	@echo "$(GREEN)   📍 http://localhost:5173$(NC)"
	@echo ""
	@cd $(FRONTEND_DIR) && npm run dev

all:
	@echo "$(CYAN)🔥 Full Stack 시작...$(NC)"
	@echo "$(GREEN)   🚀 Backend: http://localhost:8000$(NC)"
	@echo "$(GREEN)   ⚛️  Frontend: http://localhost:5173$(NC)"
	@echo ""
	@(cd $(BACKEND_DIR) && $(VENV_PYTHON) -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &) && \
	 (cd $(FRONTEND_DIR) && npm run dev)

# ───────────────────────────────────────────────────────────────────────────────
# 🧪 테스트
# ───────────────────────────────────────────────────────────────────────────────

test:
	@echo "$(CYAN)🧪 테스트 실행...$(NC)"
	@$(VENV_PYTHON) -m pytest tests/ -v --tb=short

test-cov:
	@echo "$(CYAN)🧪 커버리지 테스트 실행...$(NC)"
	@$(VENV_PYTHON) -m pytest tests/ -v --cov=$(BACKEND_DIR) --cov-report=html --cov-report=term

test-watch:
	@echo "$(CYAN)🧪 테스트 감시 모드...$(NC)"
	@$(VENV_PYTHON) -m pytest-watch tests/

test-frontend:
	@echo "$(CYAN)🧪 Frontend 테스트...$(NC)"
	@cd $(FRONTEND_DIR) && npm test

# ───────────────────────────────────────────────────────────────────────────────
# 🔍 코드 품질
# ───────────────────────────────────────────────────────────────────────────────

lint:
	@echo "$(CYAN)🔍 린트 검사...$(NC)"
	@$(VENV_PYTHON) -m ruff check $(BACKEND_DIR)/ --ignore E501
	@cd $(FRONTEND_DIR) && npm run lint 2>/dev/null || true
	@echo "$(GREEN)✅ 린트 완료$(NC)"

format:
	@echo "$(CYAN)🎨 코드 포맷팅...$(NC)"
	@$(VENV_PYTHON) -m ruff format $(BACKEND_DIR)/
	@cd $(FRONTEND_DIR) && npm run format 2>/dev/null || true
	@echo "$(GREEN)✅ 포맷팅 완료$(NC)"

fix:
	@echo "$(CYAN)🔧 린트 + 포맷 자동 수정...$(NC)"
	@$(VENV_PYTHON) -m ruff check --fix $(BACKEND_DIR)/
	@$(VENV_PYTHON) -m ruff format $(BACKEND_DIR)/
	@echo "$(GREEN)✅ 수정 완료$(NC)"

typecheck:
	@echo "$(CYAN)🔎 타입 체크...$(NC)"
	@$(VENV_PYTHON) -m mypy $(BACKEND_DIR)/ --ignore-missing-imports || true
	@cd $(FRONTEND_DIR) && npx tsc --noEmit || true
	@echo "$(GREEN)✅ 타입 체크 완료$(NC)"

security:
	@echo "$(CYAN)🔒 보안 스캔...$(NC)"
	@$(VENV_PYTHON) -m bandit -r $(BACKEND_DIR)/ -ll -x "**/tests/**" || true
	@echo "$(GREEN)✅ 보안 스캔 완료$(NC)"

# ───────────────────────────────────────────────────────────────────────────────
# 🐳 Docker
# ───────────────────────────────────────────────────────────────────────────────

docker-up:
	@echo "$(CYAN)🐳 Docker Compose 시작...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✅ 컨테이너 실행 중$(NC)"
	@docker-compose ps

docker-down:
	@echo "$(CYAN)🐳 Docker Compose 종료...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ 컨테이너 종료$(NC)"

docker-build:
	@echo "$(CYAN)🐳 Docker 이미지 빌드...$(NC)"
	@docker-compose build
	@echo "$(GREEN)✅ 빌드 완료$(NC)"

docker-logs:
	@docker-compose logs -f

docker-clean:
	@echo "$(CYAN)🐳 Docker 정리...$(NC)"
	@docker-compose down -v --rmi local
	@docker system prune -f
	@echo "$(GREEN)✅ Docker 정리 완료$(NC)"

# ───────────────────────────────────────────────────────────────────────────────
# 📦 빌드 & 배포
# ───────────────────────────────────────────────────────────────────────────────

build:
	@echo "$(CYAN)📦 프로덕션 빌드...$(NC)"
	@cd $(FRONTEND_DIR) && npm run build
	@echo "$(GREEN)✅ 빌드 완료: $(FRONTEND_DIR)/dist$(NC)"

release:
	@echo "$(CYAN)🚀 릴리즈 준비...$(NC)"
	@read -p "버전 입력 (예: 1.0.0): " version; \
	git tag -a "v$$version" -m "Release v$$version"; \
	echo "$(GREEN)✅ 태그 생성: v$$version$(NC)"; \
	echo "$(YELLOW)💡 푸시: git push origin v$$version$(NC)"

deploy:
	@echo "$(CYAN)🚀 GitHub Pages 배포...$(NC)"
	@cd $(FRONTEND_DIR) && npm run build
	@gh workflow run deploy-pages.yml 2>/dev/null || \
		echo "$(YELLOW)💡 GitHub CLI 필요: brew install gh$(NC)"

# ───────────────────────────────────────────────────────────────────────────────
# 🤖 자동화
# ───────────────────────────────────────────────────────────────────────────────

backup:
	@echo "$(CYAN)🗄️ 백업 실행...$(NC)"
	@chmod +x scripts/backup.sh
	@./scripts/backup.sh $(filter-out $@,$(MAKECMDGOALS))

backup-daily:
	@./scripts/backup.sh daily

backup-weekly:
	@./scripts/backup.sh weekly

backup-full:
	@./scripts/backup.sh full

report:
	@echo "$(CYAN)📊 Trinity 리포트 생성...$(NC)"
	@mkdir -p reports
	@$(PYTHON) scripts/trinity_report.py --output reports/report_$(shell date +%Y%m%d).md --format md
	@echo "$(GREEN)✅ 리포트 생성: reports/report_$(shell date +%Y%m%d).md$(NC)"

report-html:
	@$(PYTHON) scripts/trinity_report.py --output reports/report_$(shell date +%Y%m%d).html --format html
	@open reports/report_$(shell date +%Y%m%d).html 2>/dev/null || true

report-slack:
	@$(PYTHON) scripts/trinity_report.py --slack

healthcheck:
	@echo "$(CYAN)🏥 헬스체크...$(NC)"
	@echo ""
	@echo "Backend (localhost:8000):"
	@curl -sf http://localhost:8000/health 2>/dev/null && echo "  ✅ 정상" || echo "  ❌ 응답 없음"
	@echo ""
	@echo "Frontend (localhost:5173):"
	@curl -sf http://localhost:5173 2>/dev/null && echo "  ✅ 정상" || echo "  ❌ 응답 없음"
	@echo ""

monitor:
	@echo "$(CYAN)📊 모니터링 대시보드 시작...$(NC)"
	@cd monitoring && docker-compose -f docker-compose.monitoring.yml up -d
	@echo "$(GREEN)   📊 Grafana: http://localhost:3001$(NC)"
	@echo "$(GREEN)   📈 Prometheus: http://localhost:9090$(NC)"

# ───────────────────────────────────────────────────────────────────────────────
# 🧹 정리
# ───────────────────────────────────────────────────────────────────────────────

clean:
	@echo "$(CYAN)🧹 캐시 정리...$(NC)"
	@find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name '*.pyc' -delete 2>/dev/null || true
	@find . -type d -name '.pytest_cache' -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name '.mypy_cache' -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name '.ruff_cache' -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name '*.egg-info' -exec rm -rf {} + 2>/dev/null || true
	@echo "$(GREEN)✅ 정리 완료$(NC)"

clean-all: clean
	@echo "$(CYAN)🧹 전체 정리 (venv, node_modules, dist 포함)...$(NC)"
	@rm -rf $(VENV_DIR) 2>/dev/null || true
	@rm -rf $(FRONTEND_DIR)/node_modules 2>/dev/null || true
	@rm -rf $(FRONTEND_DIR)/dist 2>/dev/null || true
	@rm -rf backups 2>/dev/null || true
	@echo "$(GREEN)✅ 전체 정리 완료$(NC)"
	@echo "$(YELLOW)💡 재설치: make install-all$(NC)"

# ───────────────────────────────────────────────────────────────────────────────
# 📊 유틸리티
# ───────────────────────────────────────────────────────────────────────────────

status:
	@echo ""
	@echo "$(CYAN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo "$(CYAN)  📊 AUTUS 프로젝트 상태$(NC)"
	@echo "$(CYAN)═══════════════════════════════════════════════════════════════$(NC)"
	@echo ""
	@echo "$(GREEN)버전:$(NC) $(VERSION)"
	@echo ""
	@echo "$(GREEN)Git 상태:$(NC)"
	@git status --short
	@echo ""
	@echo "$(GREEN)Python:$(NC) $(shell $(PYTHON) --version 2>&1)"
	@echo "$(GREEN)Node:$(NC) $(shell node --version 2>&1)"
	@echo ""
	@echo "$(GREEN)서버 상태:$(NC)"
	@lsof -i :8000 2>/dev/null | grep LISTEN | head -1 && echo "  Backend (8000): ✅ Running" || echo "  Backend (8000): ❌ Not running"
	@lsof -i :5173 2>/dev/null | grep LISTEN | head -1 && echo "  Frontend (5173): ✅ Running" || echo "  Frontend (5173): ❌ Not running"
	@echo ""
	@echo "$(GREEN)Docker:$(NC)"
	@docker-compose ps 2>/dev/null || echo "  Docker Compose not running"
	@echo ""

logs:
	@echo "$(CYAN)📜 최근 로그...$(NC)"
	@tail -100 logs/*.log 2>/dev/null || echo "로그 파일 없음"

open:
	@echo "$(CYAN)🌐 브라우저에서 열기...$(NC)"
	@open http://localhost:8000/docs 2>/dev/null || xdg-open http://localhost:8000/docs 2>/dev/null || true
	@open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || true

# ───────────────────────────────────────────────────────────────────────────────
# 🔧 개발 도구
# ───────────────────────────────────────────────────────────────────────────────

shell:
	@echo "$(CYAN)🐍 Python Shell...$(NC)"
	@$(VENV_PYTHON)

db-shell:
	@echo "$(CYAN)🗄️ Database Shell...$(NC)"
	@docker-compose exec db psql -U postgres 2>/dev/null || echo "DB 컨테이너 없음"

# 더미 타겟 (backup 인자용)
daily weekly full:
	@:
