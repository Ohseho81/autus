#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# AUTUS 백업 스크립트
# ═══════════════════════════════════════════════════════════════════════════

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🗄️  AUTUS 백업 시작..."

mkdir -p "$BACKUP_DIR"

# PostgreSQL 백업
echo "📦 PostgreSQL 백업..."
docker exec autus-postgres pg_dump -U autus autus > "$BACKUP_DIR/postgres_$TIMESTAMP.sql"

# Neo4j 백업
echo "📦 Neo4j 백업..."
docker exec autus-neo4j neo4j-admin database dump --to-path=/var/lib/neo4j/backups neo4j 2>/dev/null || \
    docker cp autus-neo4j:/data "$BACKUP_DIR/neo4j_$TIMESTAMP"

# n8n 워크플로우 백업 (API)
if [ ! -z "$N8N_API_KEY" ]; then
    echo "📦 n8n 워크플로우 백업..."
    curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
        http://localhost:5678/api/v1/workflows > "$BACKUP_DIR/n8n_workflows_$TIMESTAMP.json"
fi

# 압축
echo "📦 압축 중..."
tar -czf "$BACKUP_DIR/autus_backup_$TIMESTAMP.tar.gz" \
    "$BACKUP_DIR/postgres_$TIMESTAMP.sql" \
    "$BACKUP_DIR/neo4j_$TIMESTAMP" 2>/dev/null || true

# 오래된 백업 삭제 (7일)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "✅ 백업 완료: $BACKUP_DIR/autus_backup_$TIMESTAMP.tar.gz"


#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# AUTUS 백업 스크립트
# ═══════════════════════════════════════════════════════════════════════════

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🗄️  AUTUS 백업 시작..."

mkdir -p "$BACKUP_DIR"

# PostgreSQL 백업
echo "📦 PostgreSQL 백업..."
docker exec autus-postgres pg_dump -U autus autus > "$BACKUP_DIR/postgres_$TIMESTAMP.sql"

# Neo4j 백업
echo "📦 Neo4j 백업..."
docker exec autus-neo4j neo4j-admin database dump --to-path=/var/lib/neo4j/backups neo4j 2>/dev/null || \
    docker cp autus-neo4j:/data "$BACKUP_DIR/neo4j_$TIMESTAMP"

# n8n 워크플로우 백업 (API)
if [ ! -z "$N8N_API_KEY" ]; then
    echo "📦 n8n 워크플로우 백업..."
    curl -s -H "X-N8N-API-KEY: $N8N_API_KEY" \
        http://localhost:5678/api/v1/workflows > "$BACKUP_DIR/n8n_workflows_$TIMESTAMP.json"
fi

# 압축
echo "📦 압축 중..."
tar -czf "$BACKUP_DIR/autus_backup_$TIMESTAMP.tar.gz" \
    "$BACKUP_DIR/postgres_$TIMESTAMP.sql" \
    "$BACKUP_DIR/neo4j_$TIMESTAMP" 2>/dev/null || true

# 오래된 백업 삭제 (7일)
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete

echo "✅ 백업 완료: $BACKUP_DIR/autus_backup_$TIMESTAMP.tar.gz"







