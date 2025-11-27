#!/bin/bash
# pytest + 커버리지 리포트 자동화 스크립트
export PYTHONPATH=.
pytest --cov=core --cov=plugins --cov=ai --cov=server --cov-report=term-missing --maxfail=5 --disable-warnings
