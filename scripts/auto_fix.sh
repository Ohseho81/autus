#!/bin/bash

TEST_FILE=$1
MAX_ATTEMPTS=3

for i in $(seq 1 $MAX_ATTEMPTS); do
    echo "🔧 Attempt $i/$MAX_ATTEMPTS..."
    
    # Run test
    ERROR=$(python -m pytest "$TEST_FILE" --tb=short 2>&1)
    
    if [ $? -eq 0 ]; then
        echo "✅ Tests passed!"
        exit 0
    fi
    
    # Extract error
    ERROR_TYPE=$(echo "$ERROR" | grep -oE "AttributeError|ImportError|TypeError" | head -1)
    ERROR_MSG=$(echo "$ERROR" | grep "$ERROR_TYPE" | head -1)
    
    echo "📊 Error: $ERROR_TYPE - $ERROR_MSG"
    
    # Call fixer pack
    python core/pack/openai_runner.py fixer_pack "{\n        \"error_message\": \"$ERROR_MSG\",\n        \"test_file\": \"$TEST_FILE\"\n    }"
done

echo "❌ Max attempts reached"
exit 0
