"""
AUTUS API Routes

Modular route handlers for FastAPI endpoints.

Modules:
- analytics.py: Analytics and usage tracking
- devices.py: IoT device management

To add new routes:
1. Create new file in this directory
2. Import and register in main.py
"""

import sys
import os

# Ensure services module is discoverable
_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
if _root not in sys.path:
    sys.path.insert(0, _root)

