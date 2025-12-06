FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 의존성 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 모든 코드 복사
COPY api/ ./api/
COPY core/ ./core/
COPY engines/ ./engines/
COPY evolved/ ./evolved/
COPY packs/ ./packs/
COPY policies/ ./policies/
COPY protocols/ ./protocols/
COPY rules/ ./rules/
COPY sovereign/ ./sovereign/
COPY specs/ ./specs/
COPY scripts/ ./scripts/
COPY tests/ ./tests/
COPY main.py .
COPY standard.py .
COPY evolution_orchestrator.py .
COPY continuous_loop.py .
COPY constitution.yaml .

# 디렉토리 생성
RUN mkdir -p logs specs/auto

# 포트
EXPOSE 8003

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8003/health || exit 1

# 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003"]
