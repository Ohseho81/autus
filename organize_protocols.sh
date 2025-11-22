#!/bin/bash

# Memory Protocol 통합
mv protocols/memory/full_protocol.py protocols/memory/__init__.py
rm protocols/memory/protocol.py

# Auth Protocol 통합
mv protocols/auth/full_protocol.py protocols/auth/__init__.py
rm protocols/auth/protocol.py

# Identity Protocol 정리
mv protocols/identity/core.py protocols/identity/__init__.py

# Workflow Protocol 정리
mv protocols/workflow/standard.py protocols/workflow/__init__.py

echo "✅ Protocols organized"
