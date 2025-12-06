.PHONY: install test lint run deploy clean backup

install:
	pip install -r requirements.txt

test:
	pytest tests/ -v --tb=short

lint:
	ruff check . --ignore E501
	black --check .

run:
	uvicorn main:app --reload --port 8003

deploy:
	git add -A
	git commit -m "deploy: $(shell date +%Y%m%d_%H%M%S)"
	git push origin main

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache .coverage

backup:
	python -c "from api.backup_service import backup_service; print(backup_service.create_backup())"

stats:
	@echo "📊 AUTUS Stats"
	@echo "Python files: $$(find . -name '*.py' -not -path './.venv/*' | wc -l)"
	@echo "Tests: $$(pytest tests/ --collect-only -q 2>/dev/null | tail -1)"
	@echo "API endpoints: $$(grep -r '@app\|@router' main.py api/ | wc -l)"
