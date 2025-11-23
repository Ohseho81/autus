#!/bin/bash
echo "🤖 AUTUS 자동 개발 시작!"
echo "========================================"

export $(cat .env | grep OPENAI_API_KEY)

# Critical 기능 (6개)
declare -a files=(
    "protocols/identity/viewer.py"
    "protocols/auth/qr_generator.py"
    "protocols/auth/sync.py"
    "protocols/memory/query.py"
    "protocols/workflow/executor.py"
    "server/api/identity.py"
)

declare -a purposes=(
    "3D identity visualization using Three.js. Create HTML template that renders identity coordinates as animated 3D sphere with rotation controls."
    "QR code generator for device sync. Encode identity seed + timestamp. Use qrcode library. Functions: generate_qr, decode_qr."
    "Device synchronization via QR codes. Functions: create_sync_package, restore_from_qr. Local-only transfer."
    "Advanced memory search with filters, sorting, pagination. Full-text search using SQLite FTS5."
    "Workflow execution engine. Load workflow JSON, validate, execute nodes, handle conditionals. Use standard.WorkflowGraph."
    "FastAPI endpoints for identity. GET /identity/generate, POST /identity/evolve. Use protocols.identity modules."
)

total=${#files[@]}
success=0

for i in "${!files[@]}"; do
    file="${files[$i]}"
    purpose="${purposes[$i]}"
    count=$((i + 1))
    
    echo ""
    echo "[$count/$total] 🤖 생성: $file"
    
    python core/pack/runner.py codegen_pack "{
      \"file_path\": \"$file\",
      \"purpose\": \"$purpose\"
    }" --provider openai 2>&1 | tail -10
    
    if [ -f "$file" ]; then
        lines=$(wc -l < "$file")
        echo "✅ 완료: $lines lines"
        success=$((success + 1))
    else
        echo "❌ 실패"
    fi
    
    [ $count -lt $total ] && sleep 5
done

echo ""
echo "🎉 완료: $success/$total"
