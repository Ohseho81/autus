# AUTUS Makefile
# ===============

.PHONY: help dev prod test lint clean docker-up docker-down

# Default
help:
	@echo "AUTUS - Autonomous Twin Universal System"
	@echo ""
	@echo "Commands:"
	@echo "  make dev          - Start development server"
	@echo "  make prod         - Start production server"
	@echo "  make test         - Run tests"
	@echo "  make lint         - Run linter"
	@echo "  make clean        - Clean cache files"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make docker-build - Build Docker images"
	@echo "  make docker-logs  - View container logs"
	@echo "  make db-migrate   - Run database migrations"
	@echo "  make install      - Install dependencies"

# Development
dev:
	uvicorn backend.main:app --reload --port 8000

# Production
prod:
	uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4

# Testing
test:
	pytest tests/ -v --cov=backend --cov-report=term-missing

test-fast:
	pytest tests/ -v -x --tb=short

# Linting
lint:
	ruff check backend/
	ruff format backend/ --check

format:
	ruff format backend/

# Clean
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf htmlcov/ .coverage 2>/dev/null || true

# Docker
docker-up:
	docker-compose up -d

docker-up-dev:
	docker-compose --profile development up -d

docker-up-prod:
	docker-compose --profile production up -d

docker-down:
	docker-compose down

docker-build:
	docker-compose build --no-cache

docker-logs:
	docker-compose logs -f

docker-ps:
	docker-compose ps

# Database
db-migrate:
	alembic upgrade head

db-rollback:
	alembic downgrade -1

db-create-migration:
	@read -p "Migration name: " name; \
	alembic revision --autogenerate -m "$$name"

# Install
install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements.txt
	pip install ruff pytest-watch

# Environment
env-setup:
	cp .env.example .env
	@echo "Please edit .env file with your settings"

# Quick Start
quickstart: install env-setup docker-up
	@echo "AUTUS is starting..."
	@sleep 5
	@echo "API: http://localhost:8000"
	@echo "Docs: http://localhost:8000/docs"
