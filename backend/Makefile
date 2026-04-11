.PHONY: up down reset-db logs test coverage lint lint-fix format format-check install

SERVICES := auth catalog booking payment notification

# ── Docker ───────────────────────────────────────────────

up:
	docker compose up --build -d

down:
	docker compose down

reset-db:
	docker compose down -v
	docker compose up thub-postgres -d

logs:
	docker compose logs -f $(s)

# ── Tests ────────────────────────────────────────────────

test:
	@if [ -z "$(s)" ]; then \
		for svc in $(SERVICES); do \
			echo "\n══ $$svc ══"; \
			cd services/$$svc && python3 -m pytest tests/ -v --tb=short && cd ../..; \
		done; \
	else \
		cd services/$(s) && python3 -m pytest tests/ -v --tb=short; \
	fi

coverage:
	@if [ -z "$(s)" ]; then \
		for svc in $(SERVICES); do \
			echo "\n══ $$svc ══"; \
			cd services/$$svc && python3 -m pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=json:coverage.json --tb=short && cd ../..; \
		done; \
	else \
		cd services/$(s) && python3 -m pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=json:coverage.json --tb=short; \
	fi

# ── Lint & Format ────────────────────────────────────────

lint:
	@if [ -z "$(s)" ]; then \
		ruff check services/; \
	else \
		ruff check services/$(s)/; \
	fi

lint-fix:
	@if [ -z "$(s)" ]; then \
		ruff check --fix services/; \
	else \
		ruff check --fix services/$(s)/; \
	fi

format:
	@if [ -z "$(s)" ]; then \
		ruff format services/; \
	else \
		ruff format services/$(s)/; \
	fi

format-check:
	@if [ -z "$(s)" ]; then \
		ruff format --check services/; \
	else \
		ruff format --check services/$(s)/; \
	fi

# ── Dependencies ─────────────────────────────────────────

install:
	@if [ -z "$(s)" ]; then \
		for svc in $(SERVICES); do \
			echo "\n══ Installing $$svc ══"; \
			cd services/$$svc && uv pip install -r requirements.txt --system -q && cd ../..; \
		done; \
	else \
		cd services/$(s) && uv pip install -r requirements.txt --system; \
	fi

.PHONY: up down reset-db logs test coverage lint lint-fix format format-check install
