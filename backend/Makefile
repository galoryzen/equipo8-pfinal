.PHONY: up down reset-db logs test coverage test-integration test-integration-up lint lint-fix format format-check install venv venv-clean

SERVICES := auth catalog booking payment notification
PYTHON_VERSION := 3.11

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

# ── Per-service venv (self-healing) ──────────────────────
# Pattern target: `make _venv-booking` creates .venv-booking with Python
# $(PYTHON_VERSION) if missing, then `uv pip install` so every package in
# services/$*/requirements.txt is present (with its transitive deps).
# Idempotent and fast on cache hit, so it's safe (and intended) to call
# before every test/coverage run.

_venv-%:
	@if ! command -v uv >/dev/null 2>&1; then \
		echo "ERROR: uv is required (https://docs.astral.sh/uv/). Install it and retry." >&2; \
		exit 127; \
	fi
	@if [ ! -x ".venv-$*/bin/python" ]; then \
		echo "── creating .venv-$* (Python $(PYTHON_VERSION))"; \
		uv venv --python $(PYTHON_VERSION) ".venv-$*" >/dev/null; \
	fi
	@VIRTUAL_ENV="$(CURDIR)/.venv-$*" uv pip install -r "services/$*/requirements.txt" --quiet

venv:
	@if [ -z "$(s)" ]; then \
		for svc in $(SERVICES); do $(MAKE) --no-print-directory _venv-$$svc; done; \
	else \
		$(MAKE) --no-print-directory _venv-$(s); \
	fi

venv-clean:
	rm -rf .venv .venv-*

# ── Tests ────────────────────────────────────────────────

test:
	@if [ -z "$(s)" ]; then \
		for svc in $(SERVICES); do \
			echo "\n══ $$svc ══"; \
			$(MAKE) --no-print-directory _venv-$$svc && \
			cd services/$$svc && "$(CURDIR)/.venv-$$svc/bin/python" -m pytest tests/ -v --tb=short && cd ../..; \
		done; \
	else \
		$(MAKE) --no-print-directory _venv-$(s) && \
		cd services/$(s) && "$(CURDIR)/.venv-$(s)/bin/python" -m pytest tests/ -v --tb=short; \
	fi

coverage:
	@if [ -z "$(s)" ]; then \
		for svc in $(SERVICES); do \
			echo "\n══ $$svc ══"; \
			$(MAKE) --no-print-directory _venv-$$svc && \
			cd services/$$svc && "$(CURDIR)/.venv-$$svc/bin/python" -m pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=json:coverage.json --tb=short && cd ../..; \
		done; \
	else \
		$(MAKE) --no-print-directory _venv-$(s) && \
		cd services/$(s) && "$(CURDIR)/.venv-$(s)/bin/python" -m pytest tests/ -v --cov=app --cov-report=term-missing --cov-report=json:coverage.json --tb=short; \
	fi

# ── Integration tests (live docker-compose stack) ───────
# Lives at backend/tests/integration/. Drives the gateway, postgres and
# rabbitmq end-to-end. Reuses the `_venv-%` pattern with its own venv.

test-integration: _venv-integration
	"$(CURDIR)/.venv-integration/bin/python" -m pytest tests/integration -v -m integration --tb=short

test-integration-up:
	docker compose up -d --wait
	$(MAKE) --no-print-directory test-integration

_venv-integration:
	@if ! command -v uv >/dev/null 2>&1; then \
		echo "ERROR: uv is required (https://docs.astral.sh/uv/). Install it and retry." >&2; \
		exit 127; \
	fi
	@if [ ! -x ".venv-integration/bin/python" ]; then \
		echo "── creating .venv-integration (Python $(PYTHON_VERSION))"; \
		uv venv --python $(PYTHON_VERSION) ".venv-integration" >/dev/null; \
	fi
	@VIRTUAL_ENV="$(CURDIR)/.venv-integration" uv pip install -r tests/integration/requirements.txt --quiet

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
	@$(MAKE) --no-print-directory venv $(if $(s),s=$(s))

.PHONY: up down reset-db logs test coverage test-integration test-integration-up lint lint-fix format format-check install
