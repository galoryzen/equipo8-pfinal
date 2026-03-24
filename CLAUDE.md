# CLAUDE.md

## Project Overview

TravelHub — a travel booking platform with microservices backend, static web frontend, and mobile app. Four user roles: **TRAVELER**, **HOTEL**, **AGENCY**, **ADMIN**. Auth uses JWT + RBAC.

## Repository Structure

```
backend/          # 5 Python FastAPI microservices (see backend/CLAUDE.md for details)
frontend/         # Next.js 16 static web app (travel-hub/)
mobile/           # React Native Expo mobile app
infra/            # Terraform AWS infrastructure
scripts/          # AWS environment up/down scripts
docs/             # Architecture, DB schema, contracts, testing strategy
```

## Quick Commands

### Backend

```bash
cd backend
docker compose up --build -d          # Start all services + infra
docker compose down                   # Stop everything
make test s=catalog                   # Test one service
make coverage s=catalog               # Test with coverage
make lint s=catalog                   # Ruff lint
make format s=catalog                 # Ruff format
```

Gateway: `http://localhost:8080`. Services: auth(:8001), catalog(:8002), booking(:8003), payment(:8004), notification(:8005).

### Frontend

```bash
cd frontend/travel-hub
pnpm install && pnpm dev              # Dev server
pnpm build                            # Static export to out/
pnpm test:coverage                    # Vitest + coverage
pnpm lint                             # ESLint
```

### Mobile

```bash
cd mobile
npm install && npx expo start         # Dev server
```

## Frontend (Next.js 16)

**Important:** Next.js 16 has breaking changes from earlier versions. Always check `node_modules/next/dist/docs/` before writing code.

- Static export mode (`output: 'export'` with `trailingSlash: true`)
- UI: Material-UI 7 + TailwindCSS 4
- Route groups: `(auth)/` for login/register, `manager/` and `traveler/` for role-based pages
- Testing: Vitest + React Testing Library (jsdom)
- Deployed to S3 + CloudFront at travelhub.galoryzen.xyz

## Mobile (Expo SDK 55)

- Expo Router for file-based navigation
- Feature-based structure under `src/features/`
- Shared UI components in `src/shared/ui/`
- i18n with i18next (English + Spanish) in `src/i18n/`

## CI/CD

- **Backend CI** (`.github/workflows/backend.yml`): Detects changed services, runs pytest only on affected ones
- **Frontend CI/CD** (`.github/workflows/frontend.yml`): pnpm test:coverage → pnpm build → S3 deploy + CloudFront invalidation (main branch only)
- **Backend Deploy** (`.github/workflows/deploy-backend.yml`): Manual dispatch → ECR → ECS Fargate
- Coverage gate: **≥70%** across all layers — CI blocks merge if below

## Key Documentation

- `docs/arquitectura.md` — ADRs, tactics, sequence diagrams for all flows
- `docs/db-schema.dbml` — Complete database schema (DBML format)
- `docs/documentacion-tecnica.md` — Stack, testing strategy, SLAs
- `docs/DocumentoEstrategiaPruebas.pdf` — Formal testing strategy (TNT, objectives, schedule)
- `docs/historias_usuario.md` — User stories by sprint

## Infrastructure (AWS)

ECS Fargate cluster, RDS PostgreSQL Multi-AZ, ALB, S3 + CloudFront, ECR, CloudMap service discovery, EventBridge + SQS. Managed via Terraform in `infra/`.