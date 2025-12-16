#!/bin/bash
# AUTUS Development Server
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
