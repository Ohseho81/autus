# AUTUS Backend Dockerfile v15.0 - Multi-stage Build
# Stage 1: Builder - Install dependencies
FROM python:3.11-slim AS builder

# 환경 변수
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 작업 디렉토리
WORKDIR /app

# 시스템 패키지 (빌드 의존성 포함)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime - Minimal production image
FROM python:3.11-slim

# 환경 변수
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV PATH=/root/.local/bin:$PATH

# 작업 디렉토리
WORKDIR /app

# 런타임 의존성만 설치 (gcc 제외)
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 빌더 스테이지에서 설치된 Python 패키지 복사
COPY --from=builder /root/.local /root/.local

# 소스 코드 복사
COPY . .

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/health || exit 1

# 포트 노출
EXPOSE $PORT

# 실행
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port $PORT"]
