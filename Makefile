.PHONY: help install dev-api dev-web lint fmt type test migrate revision up down worker logs

help:  ## saare commands
	@grep -E '^[a-z-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-12s\033[0m %s\n",$$1,$$2}'

# ---------- setup ----------
install:   ## backend + frontend dependencies
	cd backend && pip install -r requirements-dev.txt
	cd frontend && npm install

# ---------- dev ----------
dev-api:   ## FastAPI dev server -> :8000
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-web:   ## Next.js dev server -> :3000
	cd frontend && npm run dev

worker:    ## celery worker
	cd backend && celery -A app.tasks.celery_app worker --loglevel=info

# ---------- quality ----------
lint:      ## ruff + eslint
	cd backend && ruff check app tests
	cd frontend && npm run lint

fmt:       ## ruff format + autofix
	cd backend && ruff format app tests && ruff check --fix app tests

type:      ## mypy + tsc
	cd backend && mypy app
	cd frontend && npx tsc --noEmit

test:      ## pytest
	cd backend && pytest

# ---------- database ----------
migrate:   ## alembic upgrade head
	cd backend && alembic upgrade head

revision:  ## naya migration: make revision m="add products"
	cd backend && alembic revision --autogenerate -m "$(m)"

# ---------- docker ----------
up:        ## poora stack chalao
	docker compose up -d --build

down:      ## stack band karo
	docker compose down

logs:      ## backend logs
	docker compose logs -f backend
