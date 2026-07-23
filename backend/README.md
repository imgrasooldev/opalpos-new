# OpalPos Backend — FastAPI

Async, multi-tenant JSON API. Ek hi API surface Next.js web, Flutter mobile aur
POS terminal — teeno ke liye.

Layering: **endpoint -> service -> repository -> model**

---

## Quick start

```bash
python3.14 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env

alembic upgrade head          # schema
python -m app.db.seed         # demo business + users + products
uvicorn app.main:app --reload
```

Docs: http://127.0.0.1:8000/docs (production mein band)

Demo logins (seeder se):

| Email | Password | Role |
|---|---|---|
| owner@demo.test | owner12345 | Owner (saari permissions) |
| cashier@demo.test | cashier12345 | Cashier (sirf `product.view`) |

---

## Architecture

```
Request
  |
  v
middleware/            request-id, access log, security headers,
  |                    body-size limit, CORS, tenant (JWT -> context)
  v
api/v1/endpoints/      HTTP only + require_permission() guard
  |
  v
services/              business rules; business_id/created_by khud set
  |
  v
repositories/          SIRF yahi DB touch karti hai; tenant + soft-delete filter
  |
  v
models/                SQLAlchemy ORM
```

Folders:

```
app/
├── main.py            app factory, exception handlers, health probes
├── core/              config, database, security (argon2+JWT), tenancy,
│                      exceptions, logging, cache
├── middleware/        request context, access log, security headers, rate limit
├── models/            business, role, user, product
├── schemas/           Pydantic request/response + validators
├── repositories/      tenant-scoped data access
├── services/          business logic (auth, business, user, product)
├── api/               deps.py (DI + auth guards) + v1 routers
├── db/                mixins, seeders
├── utils/             response envelope, pagination, files, forms
├── tasks/             celery
└── realtime/          websockets
```

### Multi-tenancy (sabse ahem)

`TenantMiddleware` JWT se `user_id` / `business_id` nikaal kar request-scoped
context (`app/core/tenancy.py`) mein daalti hai. Repositories har query par
`business_id == current_business_id()` lagati hain.

Do qawaid jo kabhi mat todna:

1. `business_id` **kabhi** request body se mat lo — hamesha `current_business_id()`.
2. Tenant table par `BaseRepository.get()` / `.list()` mat use karo — wo generic
   hain aur scope nahi lagate. Har repository ka `get_scoped()` / `search()` use karo.

Scope se bahar ki row par **404** dete hain, 403 nahi — warna id ka wujood leak hota hai.
Ye behaviour `tests/test_tenancy.py` mein locked hai.

### Auth aur roles

- `POST /auth/register` -> naya business + `Owner` role + owner user, ek call mein
- `TenantMiddleware` sirf context bharti hai, enforce nahi karti
- Enforce endpoint dependency par: `CurrentUserDep` (401) aur
  `require_permission("product.view")` (403)
- Roles business-scoped; `Role` <-> `Permission` many-to-many;
  `is_admin=True` role har check pass kar jata hai
- Passwords argon2 se; purane Laravel `$2y$` bcrypt hashes login par
  khud-ba-khud argon2 mein upgrade ho jate hain

---

## Endpoints

| Method | Path | Permission |
|---|---|---|
| POST | `/api/v1/auth/register` | public |
| POST | `/api/v1/auth/login` | public (10/min limit) |
| POST | `/api/v1/auth/refresh` | public |
| GET | `/api/v1/auth/me` | logged in |
| GET | `/api/v1/business` | `business.view` |
| PATCH | `/api/v1/business` | `business.update` |
| GET | `/api/v1/business/locations` | `business.view` |
| POST | `/api/v1/business/locations` | `business.update` |
| PATCH | `/api/v1/business/locations/{id}` | `business.update` |
| GET | `/api/v1/users` | `user.view` |
| POST | `/api/v1/users` | `user.create` |
| GET | `/api/v1/users/{id}` | `user.view` |
| PATCH | `/api/v1/users/{id}` | `user.update` |
| POST | `/api/v1/users/{id}/avatar` | `user.update` |
| DELETE | `/api/v1/users/{id}` | `user.delete` |
| GET | `/api/v1/products` | `product.view` |
| POST | `/api/v1/products` | `product.create` |
| GET | `/api/v1/products/{id}` | `product.view` |
| PATCH | `/api/v1/products/{id}` | `product.update` |
| DELETE | `/api/v1/products/{id}` | `product.delete` |
| GET | `/health` | liveness |
| GET | `/health/ready` | readiness (DB check) |

Har response ek hi envelope mein:

```jsonc
{ "success": true,  "message": "...", "data": {...}, "meta": {...} }
{ "success": false, "message": "...", "errors": [{"field": "...", "message": "..."}] }
```

List endpoints par `meta` = `{total, page, size, pages}`, query params `?page=&size=&q=`.

---

## Commands

```bash
# migrations
alembic upgrade head
alembic revision --autogenerate -m "add contacts table"
alembic downgrade -1
alembic current

# seed
python -m app.db.seed

# tests
pytest                        # sab
pytest tests/test_tenancy.py  # tenant isolation
pytest --cov=app              # coverage

# lint / types
ruff check . && ruff format .
mypy app

# run
uvicorn app.main:app --reload
uvicorn app.main:app --workers 4      # production
```

---

## Production notes

- **Schema ka wahid source Alembic hai.** `init_db()` (create_all) production
  mein chalne se inkar karta hai — deploy pipeline mein `alembic upgrade head` rakho.
- **Pool sizing:** har uvicorn worker apna pool banata hai, to Postgres ka
  `max_connections` >= `workers * (DB_POOL_SIZE + DB_MAX_OVERFLOW)` hona chahiye.
- **`SECRET_KEY`** badalna lazmi hai — JWT isi se sign hote hain.
- **`RATE_LIMIT_ENABLED=true`** production mein (Redis chahiye). Local dev mein
  `false`, warna har request Redis connect karne ki koshish karegi.
- **Docs/OpenAPI** `APP_ENV=production` par khud band ho jate hain.
- **Sentry** `SENTRY_DSN` set karte hi on (production mein 10% trace sampling).
- Delete hamesha **soft delete** — purane records rows ko refer karte hain.
- Paisa/quantity hamesha `Numeric(22,4)`, `Float` kabhi nahi.

## Naya resource add karna

`docs/ADD_NEW_RESOURCE.md` — Product slice ko template maan kar step-by-step.
