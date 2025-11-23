#!/bin/bash
echo "🚀 빠른 테스트 실행..."
echo ""
echo "기존 테스트:"
pytest tests/ -q --tb=line
echo ""
echo "새 통합 테스트:"
pytest tests/protocols/*/test_*_integration_comprehensive.py -q --tb=line
pytest tests/armp/test_all_risks_comprehensive.py -q --tb=line

