# ═══════════════════════════════════════════════════════════════════════════════
#                    🏛️ AUTUS EMPIRE - Production Dockerfile
# ═══════════════════════════════════════════════════════════════════════════════

FROM python:3.11-slim

LABEL maintainer="AUTUS Empire"
LABEL version="4.0.0"

WORKDIR /app

# 시스템 의존성
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성
COPY requirements.empire.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# 애플리케이션 코드
COPY backend/main_final.py ./main_final.py
COPY backend/ ./backend/

# 데이터 디렉토리
RUN mkdir -p /app/data

# 환경 변수
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# 헬스체크
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

EXPOSE ${PORT}

CMD ["sh", "-c", "uvicorn main_final:app --host 0.0.0.0 --port ${PORT}"]








