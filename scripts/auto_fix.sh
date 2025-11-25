#!/bin/bash

echo "❌ Max attempts reached"
TEST_FILE=$1
MAX_ATTEMPTS=3
PYTHON_BIN="/Users/ohseho/Desktop/autus/.venv/bin/python"

for i in $(seq 1 $MAX_ATTEMPTS); do
    echo "🔧 Attempt $i/$MAX_ATTEMPTS..."
    
    # Run test
    ERROR=$($PYTHON_BIN -m pytest "$TEST_FILE" --tb=short 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ Tests passed!"
        exit 0
    fi
    
    # Extract error
    ERROR_TYPE=$(echo "$ERROR" | grep -oE "AttributeError|ImportError|TypeError" | head -1)
    ERROR_MSG=$(echo "$ERROR" | grep "$ERROR_TYPE" | head -1)
    
    echo "📊 Error: $ERROR_TYPE - $ERROR_MSG"
    
    # Call fixer pack
    # 모듈명 추출 (예: tests/test_validator.py -> validator)
    MODULE_NAME=$(basename "$TEST_FILE" | sed -E 's/^test_(.*)\.py$/\1/')
    CODE_FILE="packs/${MODULE_NAME}_autogen.py"
    CODE_CONTENT=""
    if [ -f "$CODE_FILE" ]; then
        CODE_CONTENT=$(cat "$CODE_FILE")
    fi
    JSON_INPUT=$(jq -nc --arg msg "$ERROR_MSG" --arg test "$TEST_FILE" --arg code "$CODE_CONTENT" '{error_message: $msg, test: $test, code: $code}')
    PYTHONPATH="$(pwd)" $PYTHON_BIN core/pack/openai_runner.py fixer_pack "$JSON_INPUT"
done

echo "❌ Max attempts reached"
exit 0
