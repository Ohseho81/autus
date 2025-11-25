#!/bin/bash

FEATURE_DESC=$1
MODULE_NAME=$2

echo "🚀 AUTUS Full Pipeline Starting..."

# 1. Plan
echo "📋 Step 1: Planning..."
PLAN=$(python core/pack/openai_runner.py architect_pack "{\"feature_description\": \"$FEATURE_DESC\"}")

# 2. Generate
echo "💻 Step 2: Generating code..."
python core/pack/openai_runner.py codegen_pack "$PLAN"

# 3. Test
echo "🧪 Step 3: Generating tests..."
python core/pack/openai_runner.py testgen_pack "$PLAN"

# 4. Validate
echo "🔍 Step 4: Validating..."
./scripts/auto_validate.sh "$MODULE_NAME"

# 5. Fix if needed
if [ $? -ne 0 ]; then
    echo "🔧 Step 5: Auto-fixing..."
    ./scripts/auto_fix.sh "tests/test_${MODULE_NAME}.py"
fi

# 6. Deploy
echo "🚀 Step 6: Deploying..."
git add -A
git commit -m "Auto-generated: $FEATURE_DESC"

echo "✅ Pipeline complete!"
