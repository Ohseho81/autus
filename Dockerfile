# AUTUS Production Dockerfile
# ==========================
#
# Multi-stage build for minimal image size

# ============================================================
# Stage 1: Builder
# ============================================================
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY kernel_service/pyproject.toml kernel_service/

# Install dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip wheel --no-cache-dir --wheel-dir /app/wheels -e kernel_service/


# ============================================================
# Stage 2: Production
# ============================================================
FROM python:3.11-slim as production

# Labels
LABEL maintainer="AUTUS Team"
LABEL version="1.0.0"
LABEL description="AUTUS Kernel Service"

# Security: Non-root user
RUN useradd --create-home --shell /bin/bash autus
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy wheels from builder
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache-dir /wheels/*

# Copy application code
COPY kernel_service/ ./kernel_service/
COPY spec/ ./spec/

# Create data directory
RUN mkdir -p /app/data && chown -R autus:autus /app

# Switch to non-root user
USER autus

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PORT=8001
ENV LOG_LEVEL=INFO
ENV LOG_FORMAT=json

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# Run application
CMD ["uvicorn", "kernel_service.app.main_production:app", "--host", "0.0.0.0", "--port", "8001"]





