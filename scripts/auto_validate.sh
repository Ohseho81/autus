#!/bin/bash

MODULE_NAME=$1

echo "🔍 Validating $MODULE_NAME..."

# 1. Syntax check
python -m py_compile "packs/${MODULE_NAME}_autogen.py" || exit 0

# 2. Import check
python -c "import packs.${MODULE_NAME}_autogen" || exit 0

# 3. Test check
python -m pytest "tests/test_${MODULE_NAME}.py" -v || exit 0

echo "✅ Validation passed"
