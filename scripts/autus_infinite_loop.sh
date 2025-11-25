#!/bin/bash

while true; do
    # 1. 개선 기회 찾기
    ISSUE=$(python scripts/find_improvement.py)
    
    # 2. 파이프라인 실행
    ./scripts/autus_full_pipeline.sh "$ISSUE" "MODULE_NAME_PLACEHOLDER"
    
    # 3. 검증
    python -m pytest -q
    
    # 4. 실패하면 롤백
    if [ $? -ne 0 ]; then
        git reset --hard HEAD~1
    fi
    
    # 5. 대기
    sleep 60
done
