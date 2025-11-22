#!/bin/bash
echo "🧪 AUTUS Protocols Test"
echo ""
echo "📝 Memory Protocol..."
python3 protocols/memory/__init__.py
echo ""
echo "🔐 Auth Protocol..."
python3 protocols/auth/__init__.py
echo ""
echo "📊 Workflow Protocol..."
python3 protocols/workflow/__init__.py
echo ""
echo "✅ Done!"
