#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# 🗄️ AUTUS - 백업 자동화 스크립트
# ═══════════════════════════════════════════════════════════════════════════════
#
# 사용법:
#   ./scripts/backup.sh [daily|weekly|full]
#
# 환경변수:
#   BACKUP_DIR      - 백업 저장 경로 (기본: ./backups)
#   S3_BUCKET       - S3 버킷명 (선택)
#   SUPABASE_URL    - Supabase URL (선택)
#   SUPABASE_KEY    - Supabase Service Key (선택)
#
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 설정
BACKUP_TYPE="${1:-daily}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="autus_${BACKUP_TYPE}_${TIMESTAMP}"

# ───────────────────────────────────────────────────────────────────────────────
# 함수 정의
# ───────────────────────────────────────────────────────────────────────────────

log_info() { echo -e "${CYAN}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 백업 디렉토리 생성
create_backup_dir() {
    mkdir -p "${BACKUP_DIR}/${BACKUP_TYPE}"
    log_info "백업 디렉토리: ${BACKUP_DIR}/${BACKUP_TYPE}"
}

# 소스 코드 백업
backup_source() {
    log_info "소스 코드 백업 중..."
    
    local source_backup="${BACKUP_DIR}/${BACKUP_TYPE}/${BACKUP_NAME}_source.tar.gz"
    
    tar -czf "$source_backup" \
        --exclude='node_modules' \
        --exclude='__pycache__' \
        --exclude='.git' \
        --exclude='*.pyc' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='venv' \
        --exclude='.env' \
        --exclude='backups' \
        . 2>/dev/null || true
    
    log_success "소스 백업 완료: $source_backup"
}

# 데이터베이스 백업 (Supabase)
backup_database() {
    if [[ -z "${SUPABASE_URL:-}" ]] || [[ -z "${SUPABASE_KEY:-}" ]]; then
        log_warn "Supabase 설정 없음, DB 백업 건너뜀"
        return 0
    fi
    
    log_info "데이터베이스 백업 중..."
    
    local db_backup="${BACKUP_DIR}/${BACKUP_TYPE}/${BACKUP_NAME}_db.json"
    
    # 각 테이블 백업
    for table in entities node_snapshots learning_history predictions; do
        curl -s "${SUPABASE_URL}/rest/v1/${table}?select=*" \
            -H "apikey: ${SUPABASE_KEY}" \
            -H "Authorization: Bearer ${SUPABASE_KEY}" \
            > "${BACKUP_DIR}/${BACKUP_TYPE}/${BACKUP_NAME}_${table}.json" || true
    done
    
    log_success "DB 백업 완료"
}

# 환경 설정 백업
backup_config() {
    log_info "설정 파일 백업 중..."
    
    local config_backup="${BACKUP_DIR}/${BACKUP_TYPE}/${BACKUP_NAME}_config.tar.gz"
    
    # .env 파일들은 별도 암호화 저장
    if [[ -f ".env" ]]; then
        cp .env "${BACKUP_DIR}/${BACKUP_TYPE}/${BACKUP_NAME}_env.bak"
        log_warn ".env 파일 백업됨 (보안 주의!)"
    fi
    
    # 기타 설정 파일
    tar -czf "$config_backup" \
        docker-compose*.yml \
        Makefile \
        .github \
        monitoring \
        2>/dev/null || true
    
    log_success "설정 백업 완료: $config_backup"
}

# S3 업로드
upload_to_s3() {
    if [[ -z "${S3_BUCKET:-}" ]]; then
        log_warn "S3 버킷 설정 없음, 업로드 건너뜀"
        return 0
    fi
    
    log_info "S3 업로드 중..."
    
    aws s3 sync "${BACKUP_DIR}/${BACKUP_TYPE}/" "s3://${S3_BUCKET}/backups/${BACKUP_TYPE}/" \
        --exclude "*" \
        --include "${BACKUP_NAME}*"
    
    log_success "S3 업로드 완료"
}

# 오래된 백업 정리
cleanup_old_backups() {
    log_info "오래된 백업 정리 중..."
    
    local retention_days
    case "$BACKUP_TYPE" in
        daily)   retention_days=7 ;;
        weekly)  retention_days=30 ;;
        full)    retention_days=90 ;;
        *)       retention_days=7 ;;
    esac
    
    find "${BACKUP_DIR}/${BACKUP_TYPE}" -type f -mtime +${retention_days} -delete 2>/dev/null || true
    
    log_success "정리 완료 (${retention_days}일 이상 삭제)"
}

# 백업 검증
verify_backup() {
    log_info "백업 검증 중..."
    
    local backup_count=$(find "${BACKUP_DIR}/${BACKUP_TYPE}" -name "${BACKUP_NAME}*" | wc -l)
    
    if [[ $backup_count -gt 0 ]]; then
        log_success "백업 검증 완료: ${backup_count}개 파일"
        
        # 백업 크기 출력
        du -sh "${BACKUP_DIR}/${BACKUP_TYPE}/${BACKUP_NAME}"* 2>/dev/null || true
    else
        log_error "백업 파일을 찾을 수 없음!"
        exit 1
    fi
}

# 백업 리포트 생성
generate_report() {
    local report_file="${BACKUP_DIR}/${BACKUP_TYPE}/${BACKUP_NAME}_report.txt"
    
    cat > "$report_file" << EOF
═══════════════════════════════════════════════════════════════════════════════
🗄️ AUTUS 백업 리포트
═══════════════════════════════════════════════════════════════════════════════

백업 유형: ${BACKUP_TYPE}
백업 시간: $(date)
백업 이름: ${BACKUP_NAME}

───────────────────────────────────────────────────────────────────────────────
백업 파일 목록:
───────────────────────────────────────────────────────────────────────────────
$(ls -lh "${BACKUP_DIR}/${BACKUP_TYPE}/${BACKUP_NAME}"* 2>/dev/null || echo "파일 없음")

───────────────────────────────────────────────────────────────────────────────
총 백업 크기:
───────────────────────────────────────────────────────────────────────────────
$(du -sh "${BACKUP_DIR}/${BACKUP_TYPE}" 2>/dev/null || echo "계산 불가")

═══════════════════════════════════════════════════════════════════════════════
EOF

    log_success "리포트 생성: $report_file"
}

# ───────────────────────────────────────────────────────────────────────────────
# 메인 실행
# ───────────────────────────────────────────────────────────────────────────────

main() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}  🗄️  AUTUS 백업 시작 [${BACKUP_TYPE}]${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    create_backup_dir
    
    case "$BACKUP_TYPE" in
        daily)
            backup_source
            backup_database
            ;;
        weekly)
            backup_source
            backup_database
            backup_config
            ;;
        full)
            backup_source
            backup_database
            backup_config
            upload_to_s3
            ;;
        *)
            log_error "알 수 없는 백업 유형: $BACKUP_TYPE"
            echo "사용법: $0 [daily|weekly|full]"
            exit 1
            ;;
    esac
    
    cleanup_old_backups
    verify_backup
    generate_report
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✅ 백업 완료!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

main "$@"
