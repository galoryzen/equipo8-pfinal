.PHONY: help \
	back-up back-down back-logs back-reset-db back-test back-coverage back-lint back-format back-install \
	front-install front-dev front-build front-test front-lint \
	mobile-install mobile-dev

help:
	@echo "── Backend ──────────────────────────────────────"
	@echo "  make back-up              Start all services (docker)"
	@echo "  make back-up-build        Start all services with build (docker)"
	@echo "  make back-down            Stop all services"
	@echo "  make back-down-v          Stop all services and remove volumes"
	@echo "  make back-logs s=catalog  Follow logs for a service"
	@echo "  make back-test            Run all backend tests"
	@echo "  make back-test s=catalog  Run tests for one service"
	@echo "  make back-coverage s=catalog  Tests with coverage"
	@echo "  make back-lint s=catalog  Ruff lint"
	@echo "  make back-format s=catalog  Ruff format"
	@echo "  make back-install         Install all backend deps"
	@echo ""
	@echo "── Frontend ─────────────────────────────────────"
	@echo "  make front-install        pnpm install"
	@echo "  make front-dev            Dev server"
	@echo "  make front-build          Static export build"
	@echo "  make front-test           Vitest with coverage"
	@echo "  make front-lint           ESLint"
	@echo ""
	@echo "── Mobile ───────────────────────────────────────"
	@echo "  make mobile-install       npm install"
	@echo "  make mobile-dev           Expo dev server"

# ── Backend ─────────────────────────────────────────────────

back-up:
	cd backend && docker compose up -d

back-up-build:
	cd backend && docker compose up -d --build

back-down:
	cd backend && docker compose down

back-down-v:
	cd backend && docker compose down -v

back-logs:
	cd backend && docker compose logs -f $(s)

back-test:
	cd backend && $(MAKE) test s=$(s)

back-coverage:
	cd backend && $(MAKE) coverage s=$(s)

back-lint:
	cd backend && $(MAKE) lint s=$(s)

back-format:
	cd backend && $(MAKE) format s=$(s)

back-install:
	cd backend && $(MAKE) install

# ── Frontend ────────────────────────────────────────────────

front-install:
	cd frontend/travel-hub && pnpm install

front-dev:
	cd frontend/travel-hub && pnpm dev

front-build:
	cd frontend/travel-hub && pnpm build

front-test:
	cd frontend/travel-hub && pnpm test:coverage

front-lint:
	cd frontend/travel-hub && pnpm lint

# ── Mobile ──────────────────────────────────────────────────

mobile-install:
	cd mobile && npm install

mobile-dev:
	cd mobile && npx expo start