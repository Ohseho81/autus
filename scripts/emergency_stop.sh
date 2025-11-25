#!/bin/bash

echo "🛑 Emergency Stop"
echo "================="

# 실행 중인 Python 프로세스 찾기
PIDS=$(ps aux | grep "openai_runner.py\|pytest" | grep -v grep | awk '{print $2}')

if [ -z "$PIDS" ]; then
    echo "✅ No processes running"
else
    echo "🛑 Killing processes: $PIDS"
    echo "$PIDS" | xargs kill -9
    echo "✅ Stopped"
fi

# Git 상태 확인
echo ""
echo "📊 Git Status:"
git status --short

echo ""
echo "💡 To rollback: git reset --hard HEAD~1"
