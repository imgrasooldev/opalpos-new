# FastAPI Boilerplate — Service / Repository Pattern

A production-ready **async** FastAPI starter built on a clean, layered
architecture (API → Service → Repository → Model). Ships with a working
`User` CRUD example, Alembic migrations, database seeders, request validation,
and tests — copy the pattern for every new resource.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Command reference](#command-reference)
- [Running the app](#running-the-app)
- [Database & migrations](#database--migrations)
- [Seeders](#seeders)
- [Request validation](#request-validation)
- [API endpoints](#api-endpoints)
- [Adding a new resource](#adding-a-new-resource)
- [Testing](#testing)
- [Configuration](#configuration)
- [Notes & gotchas](#notes--gotchas)

---

## Features

-  **Async everything** — SQLAlchemy 2.0 async engine + async endpoints
-  **Layered architecture** — thin API, testable services, isolated data access
-  **Generic repository** — reusable async CRUD for every model
-  **Request validation** at three levels (field, cross-field, business)
-  **Password hashing** with bcrypt
-  **Alembic migrations** (async, auto-configured from settings)
-  **Seeders** — idempotent sample data from the CLI
-  **Tests** — httpx + pytest-asyncio smoke tests
-  **Zero-config SQLite** by default, one env var to switch to Postgres

## Tech stack

| Purpose        | Library            |
|----------------|--------------------|
| Web framework  | FastAPI            |
| ASGI server    | Uvicorn            |
| ORM            | SQLAlchemy 2.0 (async) |
| Validation     | Pydantic v2        |
| Settings       | pydantic-settings  |
| Migrations     | Alembic            |
| Passwords      | passlib[bcrypt]    |
| DB drivers     | aiosqlite / asyncpg |

---

## Architecture

A request flows top → bottom; each layer only knows about the one below it.

```
HTTP request
    │
    ▼
app/api/           ← Endpoints. Only HTTP concerns (routing, status codes).
    │                Depends on services via app/api/deps.py.
    ▼
app/services/      ← Business logic & rules. Raises domain exceptions.
    │                Knows nothing about HTTP. Talks only to repositories.
    ▼
app/repositories/  ← Data access. The ONLY layer that touches the DB session.
    │                Generic BaseRepository + per-model repositories.
    ▼
app/models/        ← SQLAlchemy ORM models (the database tables).
```

**Why:** endpoints stay readable, services are unit-testable without HTTP,
and repositories let you swap SQLite ↔ Postgres or mock the DB in tests.

---

## Project structure

```
.
├── app/
│   ├── main.py                     # FastAPI app, lifespan, exception handlers
│   ├── core/
│   │   ├── config.py               # Settings (env / .env)
│   │   ├── database.py             # Async engine, session, Base, get_session
│   │   ├── security.py             # Password hashing
│   │   └── exceptions.py           # Domain exceptions -> HTTP
│   ├── models/
│   │   └── user.py                 # ORM model
│   ├── schemas/
│   │   ├── user.py                 # Pydantic request/response schemas
│   │   └── validators.py           # Reusable field validators
│   ├── repositories/
│   │   ├── base.py                 # Generic async CRUD repository
│   │   └── user.py                 # UserRepository
│   ├── services/
│   │   └── user.py                 # UserService (business logic)
│   ├── utils/                      # Reusable helper functions
│   │   ├── files.py                # File/image upload helpers
│   │   ├── forms.py                # as_form: validate multipart form data
│   │   ├── pagination.py           # PageParams + Page[T]
│   │   └── response.py             # Standard API response envelope + helpers
│   ├── api/
│   │   ├── deps.py                 # DI: wires repo -> service per request
│   │   └── v1/
│   │       ├── router.py           # Aggregates v1 routers
│   │       └── endpoints/
│   │           └── users.py        # User endpoints
│   └── db/
│       ├── seed.py                 # Seeder runner (python -m app.db.seed)
│       └── seeders/
│           ├── base.py             # BaseSeeder
│           └── user_seeder.py      # UserSeeder
├── alembic/
│   ├── env.py                      # Async migration environment
│   ├── script.py.mako             # Migration template
│   └── versions/
│       └── 0001_create_users_table.py
├── tests/
│   └── test_users.py
├── alembic.ini
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## Prerequisites

- **Python 3.11 or 3.12**
- `pip` and `venv`

---

## Getting started

```bash
# 1. Create & activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create your local config
cp .env.example .env

# 4. Apply database migrations
alembic upgrade head

# 5. (Optional) seed sample data
python -m app.db.seed

# 6. Start the server
uvicorn app.main:app --reload
```

Open:
- **Swagger UI** → http://127.0.0.1:8000/docs
- **ReDoc** → http://127.0.0.1:8000/redoc
- **Health check** → http://127.0.0.1:8000/health

---

## Command reference

Every command you'll need, in one place.

### Environment

```bash
python3 -m venv .venv              # create virtualenv
source .venv/bin/activate          # activate (Linux/macOS)
.venv\Scripts\activate             # activate (Windows)
deactivate                         # leave the virtualenv
pip install -r requirements.txt    # install dependencies
pip freeze > requirements.txt      # snapshot current deps
```

### Run the server

```bash
uvicorn app.main:app --reload                          # dev (auto-reload)
uvicorn app.main:app --host 0.0.0.0 --port 8000        # bind all interfaces
uvicorn app.main:app --workers 4                       # production (multi-worker)
```

### Migrations (Alembic)

```bash
alembic upgrade head                                   # apply all migrations
alembic revision --autogenerate -m "message"           # create migration from model changes
alembic revision -m "message"                          # create empty migration
alembic downgrade -1                                   # roll back one step
alembic downgrade base                                 # roll back everything
alembic current                                        # show current revision
alembic history --verbose                              # list all migrations
alembic upgrade head --sql                             # print SQL without running it
```

### Seeders

```bash
python -m app.db.seed                                  # run all seeders (idempotent)
```

### Tests

```bash
pip install pytest pytest-asyncio httpx                # test deps (first time)
pytest                                                 # run all tests
pytest -q                                              # quiet output
pytest -v                                              # verbose
pytest tests/test_users.py                             # a single file
pytest tests/test_users.py::test_health                # a single test
```

---

## Running the app

The default database is a zero-config SQLite file (`app.db`) created in the
project root. Just run:

```bash
uvicorn app.main:app --reload
```

Interactive API docs are auto-generated at `/docs` (Swagger) and `/redoc`.

---

## Database & migrations

Async Alembic is preconfigured. The database URL is injected automatically from
your settings/`.env` in `alembic/env.py`, so you **don't** set it in
`alembic.ini`.

Typical workflow when you change a model:

```bash
# 1. Edit/add an ORM model in app/models/
# 2. Make sure it's imported in alembic/env.py
# 3. Generate a migration
alembic revision --autogenerate -m "add products table"

# 4. Review the generated file in alembic/versions/, then apply it
alembic upgrade head
```

An initial migration for the `users` table ships in
`alembic/versions/0001_create_users_table.py`.

---

## Seeders

Idempotent sample data, runnable from the CLI:

```bash
python -m app.db.seed
```

Seeds two demo users:

| Email               | Password     |
|---------------------|--------------|
| admin@example.com   | admin12345   |
| john@example.com    | password123  |

Add your own seeder in `app/db/seeders/`, then register it in `app/db/seed.py`:

```python
# app/db/seeders/product_seeder.py
class ProductSeeder(BaseSeeder):
    name = "products"
    async def run(self, session):
        ...  # insert data (check existence first — stay idempotent)

# app/db/seed.py
SEEDERS = [UserSeeder(), ProductSeeder()]
```

Seeders go through the **service layer**, so hashing and business rules apply
exactly like real requests, and they skip records that already exist.

---

## Request validation

Validation happens at three levels, each in its own place:

| What | Where | Example |
|------|-------|---------|
| Field format / type / length | Pydantic schema + `app/schemas/validators.py` | valid email, password ≥ 8 chars with a digit |
| Cross-field rules | `@model_validator` inside the schema | "password == confirm_password" |
| Business / DB-dependent rules | **Service layer** (`app/services/`) | "email already registered" (needs a DB lookup) |

**Rule of thumb:** if you can validate a value *on its own*, it's a schema
validator (reused via `app/schemas/validators.py`). If it needs the database or
other records, it's a **service** check that raises a domain exception from
`app/core/exceptions.py`.

### Form (multipart) validation

For endpoints that accept files, fields arrive as `multipart/form-data` instead
of JSON. Decorate a Pydantic model with `@as_form` (`app/utils/forms.py`) to
reuse the **same validation** for form fields:

```python
from app.utils.forms import as_form

@as_form
class UserCreateForm(UserCreate):   # inherits UserCreate's validators
    ...

@router.post("/signup")
async def signup(form: Annotated[UserCreateForm, Depends(UserCreateForm.as_form)],
                 avatar: UploadFile | None = File(None)):
    ...
```

---

## Helpers (`app/utils/`)

Reusable functions so you don't repeat yourself across endpoints/services.

| File            | Provides | Use it for |
|-----------------|----------|------------|
| `files.py`      | `save_image` / `save_upload` / `delete_file` | Validating & storing uploads (see avatar endpoint) |
| `forms.py`      | `as_form` | Validating multipart form data with a Pydantic model |
| `pagination.py` | `PageParams`, `Page[T]` | Consistent `?page=&size=` pagination on list endpoints |
| `response.py`   | `ok`, `created`, `no_content`, `error_response`, `ApiResponse[T]` | The standard response envelope + status-code helpers |

### API response envelope

Every endpoint returns a consistent shape via `app/utils/response.py`:

```jsonc
// success
{ "success": true, "message": "User created", "data": { ... }, "meta": null }

// list (data = items, meta = pagination)
{ "success": true, "data": [ ... ], "meta": { "total": 42, "page": 1, "size": 20, "pages": 3 } }

// error
{ "success": false, "message": "Email already registered", "errors": null }
```

Status-code helpers mean you never hand-write numbers:

```python
from app.utils.response import ok, created, no_content, error_response

return ok(user)                              # 200
return created(user, message="User created") # 201
return no_content()                          # 204
return error_response("Nope", status_code=403)
```

Errors are uniform too: domain exceptions (`app/core/exceptions.py`) and
request/form validation failures are both rendered into the same error envelope
by the handlers in `app/main.py`.

---

## API endpoints

Base prefix: `/api/v1`

| Method | Path                       | Description                    | Success |
|--------|----------------------------|--------------------------------|---------|
| GET    | `/health`                  | Health check                   | 200     |
| GET    | `/api/v1/users`            | List users (paginated)         | 200     |
| POST   | `/api/v1/users`            | Create user (JSON)             | 201     |
| POST   | `/api/v1/users/signup`     | Create user (form + avatar)    | 201     |
| GET    | `/api/v1/users/{id}`       | Get one user                   | 200     |
| PATCH  | `/api/v1/users/{id}`       | Update user                    | 200     |
| POST   | `/api/v1/users/{id}/avatar`| Upload/replace avatar image    | 200     |
| DELETE | `/api/v1/users/{id}`       | Delete user                    | 204     |

Examples with `curl`:

```bash
# Create (JSON)
curl -X POST http://127.0.0.1:8000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email": "jane@example.com", "full_name": "Jane", "password": "secret123"}'

# Signup with avatar (multipart form)
curl -X POST http://127.0.0.1:8000/api/v1/users/signup \
  -F "email=jane@example.com" -F "full_name=Jane" -F "password=secret123" \
  -F "avatar=@/path/to/photo.png"

# Upload/replace an avatar
curl -X POST http://127.0.0.1:8000/api/v1/users/1/avatar \
  -F "file=@/path/to/photo.png"

# List, paginated
curl "http://127.0.0.1:8000/api/v1/users?page=1&size=20"
```

---

## Adding a new resource

To add e.g. a `Product`, create five files that mirror the `User` example:

1. `app/models/product.py` — ORM model (and import it in `alembic/env.py`).
2. `app/schemas/product.py` — `ProductCreate` / `ProductUpdate` / `ProductRead`.
3. `app/repositories/product.py` — `class ProductRepository(BaseRepository[Product])`.
4. `app/services/product.py` — `ProductService` with business rules.
5. `app/api/v1/endpoints/products.py` — the router.

Then wire it up:

- add a `get_product_service` dependency in `app/api/deps.py`
- include the router in `app/api/v1/router.py`
- generate a migration: `alembic revision --autogenerate -m "add products"`

---

## Testing

```bash
pip install pytest pytest-asyncio httpx      # first time only
pytest -q
```

Tests use `httpx.ASGITransport` to call the app in-process (no running server
needed) and exercise the full stack end-to-end.

---

## Configuration

Settings are read from environment variables / `.env` (see `app/core/config.py`).

| Variable                      | Default                              | Description                         |
|-------------------------------|--------------------------------------|-------------------------------------|
| `PROJECT_NAME`                | `FastAPI Boilerplate`                | App title shown in docs             |
| `DEBUG`                       | `true`                               | Debug mode / SQL echo               |
| `API_V1_PREFIX`               | `/api/v1`                            | Base path for v1 routes             |
| `DATABASE_URL`                | `sqlite+aiosqlite:///./app.db`       | Async DB connection string          |
| `SECRET_KEY`                  | `change-me-in-production`            | Secret for signing (change it!)     |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60`                                 | Token lifetime (for future auth)    |
| `UPLOAD_DIR`                  | `uploads`                            | Folder on disk for uploaded files   |
| `STATIC_URL_PREFIX`           | `/static`                            | Public URL prefix for uploads       |
| `MAX_UPLOAD_SIZE`             | `5242880` (5 MB)                     | Max upload size in bytes            |

Switch to **Postgres** by setting:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/appdb
```

---

## Notes & gotchas

- **One schema source per database.** `init_db()` (called on startup and by the
  seeder) uses `create_all` for zero-config dev. If you adopt Alembic, run
  `alembic upgrade head` on a fresh DB and treat migrations as the source of
  truth — don't let `create_all` create the tables first, or Alembic will fail
  trying to create tables that already exist.
- **`SECRET_KEY`** must be changed for any real deployment.
- **`EmailStr`** requires the `email-validator` package (already in
  `requirements.txt`).
- For production, run behind multiple Uvicorn/Gunicorn workers and put a real
  migration step (`alembic upgrade head`) in your deploy pipeline.
