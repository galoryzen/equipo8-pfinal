# Evidencias de Estrategias de DevOps - Sprint 3

# [Video Evidencias Sprint 1](https://youtu.be/IqKD_vs-DSI)

> Dejamos este video pues no ha cambiado mucho el flujo


## 1. Parametrización de Integración Continua / Despliegue Continuo

El proyecto cuenta con **4 workflows de GitHub Actions** configurados en [.github/workflows](https://github.com/galoryzen/equipo8-pfinal/tree/main/.github/workflows)

### 1.1 Backend CI/CD ([backend.yml](https://github.com/galoryzen/equipo8-pfinal/blob/main/.github/workflows/backend.yml))

- **Trigger:** push y pull request a `main`, workflow dispatch manual.
- **Detección inteligente de cambios:** usa `dorny/paths-filter` para identificar cuáles de los 5 microservicios fueron modificados (auth, catalog, booking, payment, notification). También detecta cambios en `backend/libs/` (librerías compartidas).
- **Ejecución selectiva:** solo ejecuta `pytest` sobre los servicios que realmente cambiaron, optimizando el tiempo de CI.
- **Coverage gate:** cada servicio debe tener minimo 70% de cobertura de lineas (`--cov=app --cov-fail-under=70`), alineado con el objetivo OBJ-002.
- **Integration tests en CI:** job `integration-test` (separado del `test` unitario) levanta el stack completo via `docker compose up -d --wait` (overlay `docker-compose.ci.yml`) y corre `make test-integration` contra gateway nginx + 5 servicios + Postgres + RabbitMQ reales. Se dispara cuando hay cambios en `backend/**` y bloquea el deploy si falla.
- **Pipeline CD (solo en push a main):** depende de que pasen tanto unitarias como integration; despliega automaticamente solo los servicios modificados:
  1. Configura credenciales AWS via OIDC (`role-to-assume`)
  2. Pull de imagen `latest` desde ECR como cache de capas Docker (inline cache con BuildKit)
  3. Build de imagen Docker con context en `backend/` y Dockerfile del servicio
  4. Push a Amazon ECR (`travelhub/{servicio}`) con tags `latest` y commit SHA
  5. Actualiza task definition de ECS con la nueva imagen
  6. Despliega en cluster ECS Fargate (`travelhub`) con `--force-new-deployment`
  7. Para servicios con worker (booking, payment, notification) tambien actualiza la task definition del worker (`thub-{svc}-worker`) con la misma imagen
- **Job de resultado:** `backend-result` corre siempre (`if: always()`) y reporta el estado consolidado (unit + integration) para los status checks de la rama.

### 1.2 Frontend CI/CD ([frontend.yml](https://github.com/galoryzen/equipo8-pfinal/blob/main/.github/workflows/frontend.yml))

- **Trigger:** push y pull request a `main`, workflow dispatch manual.
- **Detección de cambios:** filtra por modificaciones en `frontend/**`.
- **Pipeline CI:**
  1. Instala dependencias con `pnpm install --frozen-lockfile`
  2. **Formato:** `pnpm format:check` (Prettier) — falla si hay archivos sin formatear
  3. **Lint estricto:** `pnpm lint:precommit` (ESLint, `--max-warnings 5`)
  4. **i18n parity gate:** `__tests__/i18n-keys-parity.test.ts` — bloquea literales UI en codigo y verifica que las claves de `es/` e `en/` esten alineadas (SCRUM-272)
  5. **Accesibilidad (axe) + cobertura:** `pnpm test:coverage` corre los tests de componentes + auditoria axe en jsdom (SCRUM-273)
  6. **E2E con Playwright:** `pnpm exec playwright install --with-deps chromium` + `pnpm e2e:ci` corre los flujos end-to-end en Chromium headless (booking de manager, my-trips de viajero, pago) sobre el build estatico levantado por el propio `playwright.config.ts` (`webServer`)
  7. Build estatico (`pnpm build`) que genera `out/`
  8. Sube artefacto del build
- **Pipeline CD (solo en push a main):**
  1. Descarga artefacto del build
  2. Configura credenciales AWS via OIDC (`role-to-assume`)
  3. Sincroniza `out/` a S3 (`aws s3 sync --delete`)
  4. Invalida caché de CloudFront
  5. **Smoke test:** verifica HTTP 200 en la URL de producción
- **Job de resultado:** `frontend-result` reporta estado consolidado.

### 1.3 Mobile CI ([mobile.yml](https://github.com/galoryzen/equipo8-pfinal/blob/main/.github/workflows/mobile.yml))

- **Trigger:** push y pull request a `main`, workflow dispatch manual.
- **Detección de cambios:** filtra por `mobile/**`.
- **Pipeline:**
  1. Instala dependencias con `npm ci`
  2. Verificación de tipos TypeScript (`npx tsc --noEmit`)
  3. Tests con cobertura (`npm run test:coverage`)
- **Job de resultado:** `mobile-result` reporta estado consolidado.

### 1.4 Deploy Backend Manual ([deploy-backend.yml](https://github.com/galoryzen/equipo8-pfinal/blob/main/.github/workflows/deploy-backend.yml))

- **Trigger:** `workflow_dispatch` manual con input de servicios a desplegar (separados por coma).
- **Uso:** si se presenta un despliegue fallido o se requiere desplegar un servicio específico fuera del flujo normal, se puede ejecutar este workflow manualmente desde la pestaña de Actions. Solo requiere ingresar los nombres de los servicios a desplegar (ej: `auth,catalog`).
- **Pipeline por cada servicio seleccionado:**
  1. Pull de imagen `latest` desde ECR como cache de capas Docker
  2. Build de imagen Docker con inline cache (BuildKit)
  3. Push a Amazon ECR (`travelhub/{servicio}`)
  4. Actualiza task definition de ECS
  5. Despliega en cluster ECS Fargate (`travelhub`)

### 1.5 Enforcement pre-commit (Husky)

Desde Sprint 2 (PR #113) el frontend ejecuta un hook `pre-commit` gestionado por **Husky** (`frontend/travel-hub/.husky/pre-commit`) que corre localmente los mismos gates del CI:

```sh
pnpm format:check
pnpm lint:precommit
```

Objetivo: atajar errores de formato, lint, i18n y a11y **antes** de que el commit llegue a CI. Cubre las historias SCRUM-272 (i18n) y SCRUM-273 (a11y).

### 1.6 Reglas de rama (Branch Rulesets)

La rama `main` tiene configuradas las siguientes reglas mediante GitHub Rulesets:

| Regla                         | Configuración                                        |
| ----------------------------- | ---------------------------------------------------- |
| Protección contra eliminación | Activada                                             |
| Non-fast-forward              | Bloqueado                                            |
| Pull request requerido        | Solo merge por **squash**                            |
| Dismiss stale reviews on push | Activado                                             |
| Status checks requeridos      | `backend-result`, `frontend-result`, `mobile-result` |
| Strict status checks          | Activado (rama debe estar al día con `main`)         |

Esto significa que **ningún código llega a `main` sin pasar los 3 pipelines de CI**.

---

## 2. Sprint Backlog y Asignación por Integrante

### Sprint 3 — Resumen (semana 1)

| Metrica          | Valor                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Historias        | 32                                                                                                 |
| Story Points     | 48 pts                                                                                             |
| Velocity parcial | S3-W1: **16 pts** completados (~33% del sprint)                                                    |
| Work in Progress | SCRUM-91 (In Progress, 3 pts), SCRUM-156 (In Progress, 2 pts), SCRUM-106 (In Review, 1 pt)         |
| Foco             | RBAC + login portal hoteles, configuracion completa del hotel, check-in QR, push, ranking, refunds |

**Objetivo del Sprint:** completar las funcionalidades avanzadas del producto — autorizacion por roles end-to-end (portal hoteles), configuracion completa del hotel (info, galeria, amenidades, politicas, tarifas), check-in con QR en movil, notificaciones push, ranking inteligente de busqueda y cancelaciones con validacion de politica + reembolso automatico.

### Asignacion por Integrante — Sprint 3

| Integrante         | Historias                                                        | Pts | Foco                                                                                               |
| ------------------ | ---------------------------------------------------------------- | --- | -------------------------------------------------------------------------------------------------- |
| Isaac Blanco       | SCRUM-183, 184, 193, 194, 195, 196, 198                          | 11  | Configuracion hotelera completa (info, galeria, amenidades, politicas, tarifa base + temporada)    |
| Raul Lopez         | SCRUM-111, 112, 120, 126, 131, 132, 134, 137, 138, 164, 165, 166 | 14  | Auth movil (registro/login), galeria + resenas, check-in QR, push notifications                    |
| Jose Manuel Garcia | SCRUM-93, 94, 156, 161, 174, 178, 180                            | 12  | Login portal hoteles + RBAC + logout, orquestacion cancel-refund, emails de pago/notificaciones    |
| Nicolas Calero     | SCRUM-91, 106, 189, 191, 201, 202                                | 11  | Ranking de busqueda, cancelacion con politica, dashboard ocupacion + historial, check-in/out hotel |

---

## 3. Commits y Pull Requests

### Convenciones de commits

El equipo utiliza commits convencionales con prefijos semanticos:
- `feat:` / `feature:` para nuevas funcionalidades
- `fix:` para correcciones
- `refactor:` para reestructuracion de codigo
- `ci:` para cambios en pipelines de CI/CD
- `docs:` para documentacion
- `tests:` para pruebas

### Ramas

Cada historia de usuario o tarea se desarrolla en una rama dedicada que sigue una convencion de nombres:
- `feature/{id-o-descripcion}` — funcionalidades nuevas
- `fix/descripcion` — correcciones de bugs
- `refactor/descripcion` — cambios de refactorizacion
- PRs se mergean a `main` via **squash merge**, manteniendo un historial limpio

---

## 4. Flujo de Trabajo y Estrategia de Versionamiento

### Estrategia de branching: GitHub Flow

El equipo sigue **GitHub Flow**, una estrategia simple y efectiva:

### Flujo de trabajo

1. **Crear rama** desde `main` con nombre descriptivo basado en la historia de usuario
2. **Desarrollar** la funcionalidad con commits frecuentes y descriptivos
3. **Abrir Pull Request** hacia `main`
4. **CI automatico** ejecuta los 3 pipelines (backend, frontend, mobile) segun los archivos modificados
5. **Los 3 status checks deben pasar** (`backend-result`, `frontend-result`, `mobile-result`) — es un requisito obligatorio configurado en las reglas de rama
6. **Squash merge** a `main` — consolida todos los commits de la rama en uno solo, manteniendo un historial limpio
7. **CD automatico** — si hay cambios en frontend, se despliega automaticamente a S3 + CloudFront; si hay cambios en backend, se despliegan solo los microservicios modificados a ECS Fargate

### Protecciones

- **No se puede hacer push directo a `main`** — siempre via PR
- **Status checks estrictos** — la rama debe estar actualizada con `main` antes de mergear
- **Squash-only** — unica estrategia de merge permitida
- **Dismiss stale reviews** — si se pushean cambios nuevos, las revisiones anteriores se invalidan

---

## 5. Ejecucion de Pruebas

### Estrategia de pruebas

Basada en el documento formal de estrategia (`docs/DocumentoEstrategiaPruebas.pdf`), con objetivo de **minimo 70% de cobertura automatizada** (OBJ-002).

### Backend — Pytest (unitarias)

- **Framework:** pytest con soporte asyncio (`asyncio_mode = "auto"`)
- **Arquitectura hexagonal:** las pruebas usan mocks de puertos (CachePort, database session) permitiendo testing aislado de la logica de negocio
- **Ejecucion en CI:** `pytest tests/ -v --cov=app --cov-fail-under=70` por cada servicio modificado
- **Ejecucion local:** `make test s=catalog` o `make coverage s=catalog`

### Backend — Integration suite (end-to-end local)

Suite end-to-end ([PR #150](https://github.com/galoryzen/equipo8-pfinal/pull/150)) en `backend/tests/integration/`. Cubre el objetivo **OBJ-004** del documento de estrategia (10–12 tests de integracion repartidos por servicio).

- **Cobertura (12 tests):** 3 auth, 3 catalog, 3 booking, 2 payment, 1 notification — alineado con el reparto de OBJ-004.
- **Naturaleza:** corren contra el stack `docker-compose` real (gateway nginx + 5 servicios + Postgres + RabbitMQ). Cada test ejerce un flujo completo HTTP → servicio → DB / mensajeria, sin mocks.
- **Dependencias:** `httpx`, `asyncpg`, `pytest-asyncio` aislados en `backend/.venv-integration` (gestionado por `uv`, `pytest.ini` y `requirements.txt` propios).
- **Tests de async-flow:** helpers de polling (`tests/integration/helpers/polling.py`) esperan a que el saga (Booking ↔ Payment ↔ Notification via RabbitMQ) converja en el estado esperado antes de aseverar.
- **Ejecucion local:**
  ```bash
  cd backend
  make reset-db && make up         # stack limpio + seeds frescos
  make test-integration            # asume el stack arriba
  # o todo en uno:
  make test-integration-up
  ```
- **Estado en CI:** **integrada al pipeline** desde Sprint 3. El job `integration-test` en `backend.yml` levanta el stack completo (`docker compose up -d --wait` con overlay `docker-compose.ci.yml`) y corre `make test-integration` en cada PR/push que toque `backend/**`. El job es bloqueante para el deploy (`deploy` requiere que `integration-test` sea `success` o `skipped`).

### Frontend — Vitest

- **Framework:** Vitest v4.1 + React Testing Library v16 + jsdom
- **Cobertura:** proveedor v8, reportes en texto y lcov
- **Alcance:** archivos en `app/**/*.{ts,tsx,js,jsx}`
- **Accesibilidad:** suite de auditoria con `jest-axe` sobre componentes clave (SCRUM-273)
- **i18n parity:** test dedicado (`__tests__/i18n-keys-parity.test.ts`) que falla si hay literales UI en codigo o si las claves de locales divergen (SCRUM-272)
- **Ejecucion en CI:** `pnpm test:coverage`
- **Ejecucion local:** `pnpm test` o `pnpm test:coverage`

### Frontend — E2E (Playwright)

- **Framework:** Playwright Test corriendo en Chromium headless (configurado en `playwright.config.ts`).
- **Estructura:** `frontend/travel-hub/e2e/` con specs `*.e2e.ts`, page objects en `e2e/pages/`, fixtures en `e2e/fixtures/` y helpers en `e2e/utils/`.
- **Cobertura de flujos (3 specs end-to-end):**
  - `manager-booking-flow.e2e.ts` — flujo de reservas desde el portal de hoteles.
  - `my-trips-flow.e2e.ts` — historial y gestion de viajes del traveler.
  - `payment-flow.e2e.ts` — checkout de reserva con pago.
- **WebServer:** Playwright levanta `npm run start` automaticamente en `http://localhost:3000` (`reuseExistingServer: true`, timeout 120s).
- **Ejecucion en CI:** despues de `test:coverage`, el job instala Chromium (`pnpm exec playwright install --with-deps chromium`) y corre `pnpm e2e:ci` (que setea `CI=true` para activar `headless`, `forbidOnly` y `retries: 2`).
- **Ejecucion local:** `pnpm e2e` (UI visible).

### Mobile — Jest

- **Framework:** Jest v29 + jest-expo v55 + Testing Library React Native v13
- **Soporte ESM:** `node --experimental-vm-modules`
- **Ejecucion en CI:** `npm run test:coverage`
- Ademas incluye verificacion de tipos con `npx tsc --noEmit`

### Ejecucion en CI

Las pruebas se ejecutan automaticamente en cada PR y push a main. Evidencia de ejecuciones recientes:

[Últimos actions](https://github.com/galoryzen/equipo8-pfinal/actions/workflows/backend.yml?query=event%3Apush)

Las pruebas son un **requisito bloqueante** para mergear: si alguno de los 3 pipelines falla, el PR no puede ser mergeado.

### Coverage gate en los 3 layers

A partir de semana 2, **los 3 layers tienen coverage gate >= 70%** enforceado en CI:

| Layer    | Mecanismo                                   | Cobertura actual |
| -------- | ------------------------------------------- | ---------------- |
| Backend  | `pytest --cov-fail-under=70` (por servicio) | 82.0%            |
| Frontend | Vitest `thresholds: { lines: 70 }`          | 72.3%            |
| Mobile   | Jest `coverageThreshold: 70%`               | 82.9%            |

---

## 6. Peer Review (Opcional)

El flujo de trabajo del equipo incluye pull requests como mecanismo de peer review:

- Todos los cambios pasan por PR antes de llegar a `main`
- Las reglas de rama tienen configurado **dismiss stale reviews on push**, lo que invalida revisiones previas cuando se agregan nuevos commits
- Se han hecho algunas reviews entre compañeros, aunque no es un requisito formal ni obligatorio. El enfoque principal ha sido asegurar que los pipelines de CI pasen correctamente.

---

## 7. Revision Automatica de Codigo (Opcional)

### Linting y formateo

El proyecto utiliza herramientas de revision automatica de codigo:

**Backend — Ruff**
- Linting: `make lint s={servicio}` (ruff check)
- Formateo: `make format s={servicio}` (ruff format)

**Frontend — Prettier + ESLint**
- Formato: `pnpm format:check` / `pnpm format` (Prettier) — bloqueante en CI y pre-commit
- Linting: `pnpm lint:precommit` (ESLint con `--max-warnings 5`) — bloqueante en CI y pre-commit
- Configurado con reglas de Next.js + plugin jsx-a11y
- **Husky pre-commit** corre format + lint antes de permitir el commit local

**Frontend — Accesibilidad (a11y)**
- `axe-linter` activo en el IDE (VS Code)
- Tests automatizados con `jest-axe` corren en CI como parte de `pnpm test:coverage`
- GitHub Action bloquea merge de PRs con errores de a11y (SCRUM-273)

**Frontend — i18n**
- Test `__tests__/i18n-keys-parity.test.ts` bloquea merges con literales UI o con claves desbalanceadas entre `locales/es/` y `locales/en/` (SCRUM-272)

**Mobile — TypeScript**
- Verificacion de tipos: `npx tsc --noEmit` (ejecutado en CI)

### Status checks como puerta de calidad

Los 3 status checks requeridos (`backend-result`, `frontend-result`, `mobile-result`) actuan como revision automatica: si las pruebas o el build fallan, el codigo no puede entrar a `main`. Esto garantiza que todo codigo mergeado:
1. Compila correctamente
2. Pasa las pruebas automatizadas unitarias **+ integracion (backend, stack docker compose real)** **+ E2E (frontend, Playwright sobre Chromium)** + auditoria axe de a11y
3. Cumple con las verificaciones de tipos (mobile)
4. Respeta el formato Prettier y el lint estricto (frontend)
5. No introduce literales UI ni rompe la paridad de locales i18n (frontend)