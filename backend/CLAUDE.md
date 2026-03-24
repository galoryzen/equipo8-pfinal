# Backend CLAUDE.md

## Architecture

Each service under `services/{auth,catalog,booking,payment,notification}/` follows **hexagonal architecture** (ports & adapters):

```
app/
├── domain/                          # SQLAlchemy models, enums, pure business logic
├── application/
│   ├── ports/
│   │   ├── inbound/                 # Interfaces the service exposes
│   │   └── outbound/               # Interfaces the service requires (repos, cache, clients)
│   ├── use_cases/                   # One class per use case, single execute() method
│   └── exceptions.py               # Domain-specific exceptions
├── adapters/
│   ├── inbound/api/                 # FastAPI routers, dependencies (DI), error handlers
│   └── outbound/                    # Repository implementations, cache, external clients
├── schemas/                         # Pydantic DTOs (request/response contracts)
├── config.py                        # pydantic-settings with env prefix
└── main.py                          # FastAPI app, lifespan, CORS, router registration
```

### Key rules

- **Routers never call repositories directly.** Every endpoint must go through a use case. The router's only job is: validate input → create use case via factory → call `execute()` → return response.
- **Use cases depend on ports (abstract interfaces), not on concrete implementations.** Constructor injection: `def __init__(self, repo: PropertyRepository, cache: CachePort)`.
- **All public repository methods must be declared in the port.** If a method exists in the adapter but not in the abstract port, it breaks the pattern.
- **Each service accesses only its own DB schema.** No cross-schema JOINs. Cross-references by ID only.
- **Errors propagate from use cases, not caught silently.** Domain exceptions (e.g., `PropertyNotFoundError`) bubble up and are mapped to HTTP responses by error handlers.

### Dependency injection

Wiring happens in `adapters/inbound/api/dependencies.py` (the composition root):

```python
# Factory functions — the only place that knows about concrete implementations
def get_search_use_case(session: AsyncSession, cache: CachePort) -> SearchPropertiesUseCase:
    repo = get_property_repository(session)
    return SearchPropertiesUseCase(repo, cache)
```

Endpoints use `Depends()`:
```python
async def search_properties(
    session: AsyncSession = Depends(get_db_session),
    cache: CachePort = Depends(get_cache),
):
    use_case = get_search_use_case(session, cache)
    return await use_case.execute(...)
```

## Conventions

### Naming

- Modules/files: `snake_case`
- Classes: `PascalCase`
- Enums: `PascalCase` class, `UPPERCASE` values (`PropertyStatus.ACTIVE`)
- Methods: `verb_noun` (`search_featured`, `get_by_id`, `create_hold`)
- Port classes: `{Entity}Repository`, `CachePort`
- Adapter classes: `SqlAlchemy{Entity}Repository`, `RedisCache`
- Use case classes: `{Verb}{Noun}UseCase` (`GetFeaturedPropertiesUseCase`)
- Test methods: `test_{behavior}` or `test_{behavior}_when_{condition}`

### Imports

- Always absolute: `from app.application.ports.outbound.property_repository import PropertyRepository`
- Type hints: Python 3.10+ union syntax (`str | None`, not `Optional[str]`)
- Decimal for currency, UUID for identifiers

### Config

Each service has its own env prefix:
- `AUTH_DATABASE_URL`, `CATALOG_DATABASE_URL`, `BOOKING_DATABASE_URL`, etc.
- Common settings: `SERVICE_NAME`, `DATABASE_URL`, `DB_SCHEMA`, `REDIS_URL`, `DEBUG`

### API conventions

- All endpoints under `/api/v1/{service}/`
- Traceability header: `X-Request-Id`
- Standard error format: `{"code": "ERROR_CODE", "message": "...", "trace_id": "..."}`
- Health check: `GET /api/v1/{service}/health`
- Pagination: `PaginatedResponse[T]` with `items`, `total`, `page`, `page_size`, `total_pages`

## Testing

### Strategy (from docs/DocumentoEstrategiaPruebas.pdf)

- **Coverage gate: ≥70%** per service — CI blocks merge if below
- **Pyramid**: 35% unit + 30% integration/API + 15% E2E + 10% exploratory + 10% non-functional
- **OBJ-004**: 10–12 integration tests across services (2–3 search, 2–3 booking, 2 payment, 1–2 notification, 2 auth)

### Running tests

```bash
cd backend
make test s=catalog          # Run tests for one service
make coverage s=catalog      # Run with coverage report
make test                    # Run all services
```

Or directly:
```bash
cd backend/services/catalog
python3 -m pytest tests/ -v --cov=app --cov-report=term-missing --tb=short
```

### Test levels (what to write)

**1. Use case unit tests** (`tests/test_use_cases.py`) — most important:
```python
async def test_raises_not_found_when_property_missing(self, mock_property_repo, mock_cache):
    mock_property_repo.get_by_id.return_value = None
    uc = GetPropertyDetailUseCase(mock_property_repo, mock_cache)

    with pytest.raises(PropertyNotFoundError):
        await uc.execute(property_id=uuid4())
```
- Mock the ports with `AsyncMock(spec=PortClass)`
- Inject mocks into the use case constructor
- Test: correct delegation to repo, DTO mapping, error handling, pagination logic
- No HTTP, no FastAPI — pure Python

**2. API validation tests** (`tests/test_validation.py`):
```python
def test_checkout_before_checkin_returns_422(self, mock_factory, client):
    resp = client.get("/api/v1/catalog/properties?checkin=2026-04-05&checkout=2026-04-01&guests=2")
    assert resp.status_code == 422
```
- Use `TestClient` with mocked use cases
- Test: required params, value ranges, invalid formats, error responses (404, 422)
- Test: error handler maps domain exceptions to correct HTTP status + body

**3. Endpoint wiring tests** (`tests/test_featured.py`) — smoke level:
```python
@patch("app.adapters.inbound.api.properties.get_featured_use_case")
def test_returns_list(self, mock_factory, client):
    mock_uc = AsyncMock()
    mock_uc.execute.return_value = [...]
    mock_factory.return_value = mock_uc
    resp = client.get("/api/v1/catalog/properties/featured")
    assert resp.status_code == 200
```
- Verify routes exist and are wired to use cases
- Verify response serialization

### Test fixtures (conftest.py)

```python
@pytest.fixture
def client(mock_cache):
    """TestClient with DB session and cache overridden."""
    async def override_session():
        yield AsyncMock()
    app.dependency_overrides[get_cache] = lambda: mock_cache
    app.dependency_overrides[get_db_session] = override_session
    yield TestClient(app)
    app.dependency_overrides.clear()
```

### What NOT to do in tests

- Don't mock the entire response and only assert `status == 200` — that tests nothing
- Don't skip use case tests because "the endpoint tests cover it" — they don't
- Don't test framework behavior (e.g., "does FastAPI return JSON?")

## Local development

```bash
docker compose up --build -d          # All services + postgres + redis + nginx
docker compose down                   # Stop
docker compose logs -f thub-catalog   # Logs for one service
```

- Gateway: `http://localhost:8080`
- Services: auth(:8001), catalog(:8002), booking(:8003), payment(:8004), notification(:8005)
- PostgreSQL: localhost:5432 (db: `travelhub`, schemas: users/catalog/booking/payments/notifications)
- Redis: localhost:6380

### Lint & format

```bash
make lint s=catalog           # ruff check
make lint-fix s=catalog       # ruff check --fix
make format s=catalog         # ruff format
make format-check s=catalog   # ruff format --check
```

## Inter-service communication

- **Synchronous (HTTP):** Booking → Catalog (`createHold`, `releaseHold`, `confirmHold`)
- **Asynchronous (EventBridge + SQS in prod, RabbitMQ locally):** All other cross-service flows
- Key events: `PaymentRequested`, `PaymentAuthorized`, `PaymentFailed`, `PaymentSucceeded`, `BookingConfirmed`, `BookingCancelled`, `RefundRequested`
- Event contracts in `libs/contracts/`

## Booking state machine

```
CART → PENDING_PAYMENT → PENDING_CONFIRMATION → CONFIRMED
                                               → REJECTED
                                               → CANCELLED
                                               → EXPIRED
```

Saga pattern (choreography): Booking publishes events, Payment and Notification react independently. Two-phase payments: authorize at checkout, capture on hotel confirm.