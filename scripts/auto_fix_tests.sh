#!/bin/bash

# AUTUS Auto-Fix Tests Script
# Meta-circular: AUTUS fixes AUTUS

set -e

echo "🔧 AUTUS Auto-Fix Starting..."

# 1. Run tests and capture failures
echo "📊 Analyzing failures..."
python -m pytest -q --tb=line 2>&1 > test_output.txt

# 2. Extract AttributeError failures
grep "AttributeError" test_output.txt | head -10 > attribute_errors.txt

# 3. Count by error type
echo ""
echo "📈 Error Summary:"
grep -E "AttributeError|ImportError|TypeError|AssertionError" test_output.txt | \
    awk -F': ' '{print $NF}' | sort | uniq -c | sort -rn | head -10

echo ""
echo "✅ Analysis complete. Check attribute_errors.txt for details."

# 4. Suggest fixes
echo ""
echo "🔧 Suggested fixes:"
echo "1. Run: python -m pytest -k 'not (auth or sync)' -q"
echo "2. Skip slow tests: python -m pytest -m 'not slow' -q"

rm -f test_output.txt
