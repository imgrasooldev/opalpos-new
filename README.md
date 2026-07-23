# OpalPos

UltimatePOS (Laravel 5.8) ka Python/TypeScript rewrite. Monorepo.

```
OpalPosBoilerPlate/
├── backend/      FastAPI — pure JSON API (Python 3.14 + PostgreSQL)
├── frontend/     Next.js 16 — web admin/POS (TypeScript + Tailwind)
├── docs/         architecture + migration notes
├── docker-compose.yml
└── Makefile      dono ke commands
```

Mobile app (Flutter) alag repo mein hai — wo bhi yehi API consume karta hai.

---

## Architecture

Backend server-rendered HTML nahi deta. **Teen clients, ek API:**

```
        ┌──────────────┐
        │  Next.js web │──┐
        └──────────────┘  │
        ┌──────────────┐  ├──►  FastAPI  /api/v1  ──►  PostgreSQL
        │ Flutter app  │──┤        │
        └──────────────┘  │        ├──► Redis    (cache, rate limit, pub/sub)
        ┌──────────────┐  │        └──► Celery   (backup, notifications, reports)
        │  POS terminal│──┘
        └──────────────┘
```

Auth: `Authorization: Bearer <jwt>` — teeno clients ke liye same. Mobile token
lamba hota hai (POS terminal offline reh sakta hai).

---

## Quick start

```bash
# 1. env files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 2. Postgres + Redis
docker compose up -d db redis

# 3. dependencies
make install

# 4. migrations
make migrate

# 5. dev servers (do terminals)
make dev-api      # http://localhost:8000  (docs: /docs)
make dev-web      # http://localhost:3000
```

Ya sab kuch Docker mein: `make up`

`make help` — saare commands.

---

## Requirements

| | Version | Note |
|---|---|---|
| Python | **3.14.2** | `backend/requirements.txt` isi par verify ki gayi hai |
| PostgreSQL | 17 | MySQL se aa rahe ho to `docs/POS_STRUCTURE_GAP.md` parho |
| Redis | 7 | celery ki wajah se `redis` package `<6.5` par capped hai |
| Node | 22 | Next.js 16 |

WeasyPrint (invoice PDF) ko system libraries chahiye — `backend/Dockerfile`
mein install hoti hain. Local par:

```bash
sudo apt install libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libmagic1
```

---

## Docs

- [`backend/README.md`](backend/README.md) — backend ki tafseel (layers, request flow, conventions)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — layered architecture + DI chain
- [`docs/POS_STRUCTURE_GAP.md`](docs/POS_STRUCTURE_GAP.md) — Laravel se kya-kya port hona baaki hai
