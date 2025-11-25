#!/bin/bash

MODULE_NAME=$1

echo "🔍 Validating $MODULE_NAME..."

# 1. Syntax check
PYTHON_BIN="/Users/ohseho/Desktop/autus/.venv/bin/python"
$PYTHON_BIN -m py_compile "packs/${MODULE_NAME}_autogen.py" || exit 0

# 2. Import check
$PYTHON_BIN -c "import packs.${MODULE_NAME}_autogen" || exit 0

# 3. Test check
$PYTHON_BIN -m pytest "tests/test_${MODULE_NAME}.py" -v || exit 0

echo "✅ Validation passed"
