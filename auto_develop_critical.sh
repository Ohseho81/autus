#!/bin/bash
echo "🔴 Critical 기능 자동 생성"
export $(cat .env | grep OPENAI_API_KEY)

features=(
    "protocols/identity/viewer.py:3D identity visualization with Three.js"
    "protocols/identity/surface.py:Identity evolution based on behavior patterns"
    "protocols/auth/qr_generator.py:QR code for device sync"
    "protocols/auth/sync.py:Device synchronization via QR"
    "protocols/memory/query.py:Advanced memory search with FTS5"
    "protocols/workflow/executor.py:Workflow execution engine"
)

for feature in "${features[@]}"; do
    file="${feature%%:*}"
    desc="${feature#*:}"
    echo "🤖 생성: $file"
    python core/pack/runner.py codegen_pack "{\"file_path\":\"$file\",\"purpose\":\"$desc\"}" --provider openai
    sleep 5
done
