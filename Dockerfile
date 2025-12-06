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
COPY evolved/ ./evolved/
COPY packs/ ./packs/
COPY policies/ ./policies/
COPY protocols/ ./protocols/
COPY rules/ ./rules/
COPY scripts/ ./scripts/
COPY specs/ ./specs/
COPY tests/ ./tests/
COPY main.py .

# 디렉토리 생성
RUN mkdir -p logs specs/auto

# 포트 (Railway uses PORT env)
ENV PORT=8003
EXPOSE ${PORT}

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# 실행 (Railway 호환 - PORT 환경변수 사용)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8003}"]
