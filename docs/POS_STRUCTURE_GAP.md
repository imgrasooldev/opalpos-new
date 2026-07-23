# POS Structure — Gap Analysis

Ye repo generic FastAPI starter se shuru hua tha (sirf `users` CRUD). Layering
(`endpoints → services → repositories → models`) theek thi, usi par OpalPos
ban raha hai.

Ab **monorepo** hai:

```
backend/    FastAPI — pure JSON API   (Python 3.14 + PostgreSQL)
frontend/   Next.js 16                (web admin/POS)
```
Flutter mobile app alag repo mein — wo bhi yehi API consume karta hai.

Reference: purani Laravel app `OpalPos/opalpos_live/` (UltimatePOS fork) aur
uska CodeIgniter API `opalpos_live/public/api/`.

---

## Ban chuka hai

### Infra / plumbing

| Path | Kaam |
|---|---|
| `app/core/config.py` | pydantic-settings — DB, redis, JWT, gateways, storage, logging |
| `app/core/security.py` | argon2 + legacy Laravel `$2y$` bcrypt verify + JWT (web/mobile alag TTL) |
| `app/core/tenancy.py` | multi-tenant context — `current_business_id()` |
| `app/core/rbac.py` | casbin enforcer + `require("sell.create")` dependency |
| `app/core/cache.py` | cashews + redis, tenant-scoped keys |
| `app/core/logging.py` | structlog — JSON in prod, console in dev |
| `app/db/mixins.py` | `TimestampMixin`, `SoftDeleteMixin`, `BusinessScopedMixin`, `AuditMixin`, `Money`, `Qty` |
| `app/middleware/` | request-id, access log, security headers, body-size limit, tenant, rate limit |
| `app/tasks/celery_app.py` | queue + beat schedule (daily backup) |
| `app/realtime/ws.py` | websockets + redis pub/sub (pusher ka replacement) |
| `app/utils/response.py` | `ok()/created()/error_response()` envelope *(pehle se tha)* |
| `app/utils/pagination.py` | list endpoints *(pehle se tha)* |
| `app/repositories/base.py` | generic async CRUD *(pehle se tha)* |

### Project-level

`pyproject.toml` · `Dockerfile` (weasyprint system libs sameet) · `docker-compose.yml`
(postgres, redis, backend, worker, beat, flower, frontend) · `Makefile` · `.dockerignore`
· `.env.example` · `requirements.txt` + `requirements-dev.txt` (Python 3.14 par verified)

### Frontend

Next.js 16 + React 19 + Tailwind 4 + TypeScript scaffold, aur
`frontend/src/lib/api.ts` — typed client jo backend ka `{success, data, meta}`
envelope unwrap karta hai aur error par `ApiError` throw karta hai.

---

## Ab bhi baaki hai — asli kaam

### 1. `app/models/` — sirf `user.py` hai

```
business.py            business, business_locations, currencies, tax_rates
user.py       (extend) business_id, role, cashier flags
role.py                roles, permissions (casbin adapter)
contact.py             customers + suppliers (ek hi table, type column)
product.py             products, variations, categories, brands, units
stock.py               variation_location_details  ← stock yahan rehta hai
transaction.py         transactions  ← CENTRAL table (sell/purchase/return/transfer)
transaction_line.py    transaction_sell_lines, purchase_lines, + COGS pivot
payment.py             transaction_payments
cash_register.py       cash_registers, cash_register_transactions
commission.py          cashier commission + payout lines
activity_log.py        spatie/laravel-activitylog ka replacement
```

> **PG-specific** (mixins mein already handle kiya hai, use karna na bhoolo):
> MySQL ka `unsigned` PG mein nahi hota → `CheckConstraint(col >= 0)`.
> MySQL `enum` ki jagah `VARCHAR + CheckConstraint`.
> Paisa/quantity hamesha `Numeric(22, 4)` — `Float` kabhi nahi.
> MySQL case-insensitive tha, PG case-**sensitive** — product search mein `ILIKE`.

### 2. `app/services/` — business logic (sabse bada kaam)

Laravel ke `app/Utils/*` ka direct mapping:

| Naya service | Laravel source | Size |
|---|---|---|
| `transaction.py` | `TransactionUtil.php` | sabse bada — sell/purchase/return/payment |
| `product.py` | `ProductUtil.php` | single/variable/combo, SKU, pricing |
| `report.py` | `ReportController.php` | saare reports |
| `contact.py` | `ContactUtil.php` | balances, ledger |
| `cash_register.py` | `CashRegisterUtil.php` | register open/close |
| `commission.py` | `CommissionUtil.php` | cashier commission |
| `business.py` | `BusinessUtil.php` | settings, onboarding |

### 3. `app/api/v1/endpoints/` — sab stubs hain

```
auth.py  business.py  products.py  stock.py  sells.py  purchases.py
contacts.py  register.py  commission.py  reports.py  sync.py
```

Ek hi JSON surface — Next.js web, Flutter mobile, POS terminal teeno ke liye.
`sync.py` sirf mobile ke offline delta ke liye.

> **Sabse bada architectural fayda**: abhi Laravel (`app/Utils`) aur CodeIgniter
> (`public/api/application/models/Api_model.php`) mein **duplicate business
> logic** hai. Naye design mein saare clients `app/services/` call karenge —
> duplication khatam.

### 4. `app/integrations/` — sab stubs

```
payments/  stripe  razorpay  authorizenet(httpx)  pesapal(httpx)
sms/       twilio  vonage
push/      fcm                 ← NAYA, Laravel mein tha hi nahi
storage/   s3  dropbox
```

NOTE: `authorizenet` ka official Python SDK Python 3.14 par install nahi hota
(`PyXB-X` + `lxml==4.*` pinned). Uska JSON REST API `httpx` se call karna hoga.

### 5. `app/documents/` — sab stubs

`invoice_pdf.py` (weasyprint) · `barcode.py` (python-barcode + qrcode) ·
`excel_io.py` (openpyxl). Templates `app/templates/documents/` mein jayenge —
ye **web UI ke liye nahi**, sirf PDF/email render ke liye Jinja2 use hota hai.

### 6. Baaki

`.pre-commit-config.yaml` · alembic migrations (abhi sirf users wali 2 hain) ·
seeders (roles/permissions, demo business)

---

## Summary

| | Ab | Chahiye |
|---|---|---|
| Models | 1 (`User`) | ~15 |
| Services | 1 (`UserService`) | ~8 (3 bade) |
| Endpoints | 1 (`users`) | ~11 |
| Infra / middleware | done | — |

**Plumbing ho chuki — ab domain bharna hai.**

---

## Agla step (recommended order)

1. `models/business.py` + `models/user.py` extend (`business_id`, role, cashier flags)
2. `models/product.py` + `models/stock.py`
3. `models/transaction.py` + `transaction_line.py` — **yahi poore system ka dil hai**
4. Alembic migration + seeders (roles/permissions)
5. `services/product.py` → `api/v1/endpoints/products.py` (pehla end-to-end vertical slice)
6. `services/transaction.py` → `sells.py` (sabse bada)
