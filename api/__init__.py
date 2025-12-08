"""AUTUS API Module"""
import sys
import os

# Ensure services module is discoverable from API imports
_root = os.path.dirname(os.path.dirname(__file__))
if _root not in sys.path:
    sys.path.insert(0, _root)
