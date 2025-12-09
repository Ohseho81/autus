FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code (organized by module)
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
COPY matching_engine/ ./matching_engine/
COPY main.py .

# Create necessary directories
RUN mkdir -p logs specs/auto

# Create dummy services module as fallback for import issues
RUN mkdir -p services/tiles && \
    echo "" > services/__init__.py && \
    echo "" > services/tiles/__init__.py && \
    echo "# Dummy module - use api.services instead" > services/tiles.py

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --reload"]

# Force rebuild #오후
