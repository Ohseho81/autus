FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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
COPY sovereign/ ./sovereign/
COPY engines/ ./engines/
COPY evolution/ ./evolution/
COPY marketplace/ ./marketplace/
COPY oracle/ ./oracle/
COPY succession/ ./succession/
COPY kernel/ ./kernel/
COPY validators/ ./validators/
COPY config/ ./config/
COPY static/ ./static/
COPY config/ ./config/
COPY static/ ./static/
COPY main.py .

RUN mkdir -p logs specs/auto

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
