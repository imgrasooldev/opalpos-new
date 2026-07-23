# Naya Resource Kaise Add Karein

Ye guide **Product slice** ko template maan kar likhi gayi hai. Product ka poora
end-to-end code already maujood hai — naya resource banate waqt seedha usay
kholo aur copy karo.

Reference files (inhe padho, phir copy karo):

| Layer | File |
|---|---|
| Model | `backend/app/models/product.py` |
| Schema | `backend/app/schemas/product.py` |
| Repository | `backend/app/repositories/product.py` |
| Service | `backend/app/services/product.py` |
| Endpoint | `backend/app/api/v1/endpoints/products.py` |
| Wiring | `backend/app/api/deps.py` + `backend/app/api/v1/router.py` |
| Auth guard | `backend/app/api/deps.py` (`CurrentUserDep`, `require_permission`) |
| FE types | `frontend/src/types/product.ts` |
| FE service | `frontend/src/lib/services/products.ts` |
| FE hooks | `frontend/src/hooks/use-products.ts` |
| FE page | `frontend/src/app/products/page.tsx` |

---

## Backend — 7 steps

### 1. Model — `app/models/<resource>.py`

```python
class Contact(Base, TimestampMixin, SoftDeleteMixin, BusinessScopedMixin, AuditMixin):
    __tablename__ = "contacts"
    __table_args__ = (
        UniqueConstraint("business_id", "mobile", name="uq_contacts_business_mobile"),
        CheckConstraint("type IN ('customer', 'supplier')", name="ck_contacts_type"),
    )
```

Yaad rakho:
- Mixins hamesha isi tarteeb mein — tenant tables par `BusinessScopedMixin` lazmi
- Paisa/qty ke liye `Money` / `Qty`, kabhi `Float` nahi
- PG mein `unsigned` nahi -> `CheckConstraint(col >= 0)`
- PG enum ki jagah `VARCHAR + CheckConstraint`
- Uniqueness hamesha `(business_id, col)` par — sirf `col` par nahi

### 2. Model ko register karo — `app/models/__init__.py`

Import add karo, warna Alembic autogenerate is table ko dekh hi nahi paayega.

### 3. Schema — `app/schemas/<resource>.py`

`XxxBase` / `XxxCreate` / `XxxUpdate` / `XxxRead` (`from_attributes=True`).
Cross-field rule ho to `@model_validator`, warna `@field_validator`.

### 4. Repository — `app/repositories/<resource>.py`

**Sabse ahem cheez.** `BaseRepository` ke generic `get()` / `list()` / `count()`
tenant filter **nahi** lagate. Isliye apne repository mein `_conditions()` banao
jo har query mein ye do lines lagaye:

```python
Model.business_id == current_business_id(),
Model.deleted_at.is_(None),
```

aur `get_scoped()` / `search()` / `count_search()` expose karo. Text search
mein `ILIKE` (PG case-sensitive hai).

### 5. Service — `app/services/<resource>.py`

- Saare business rules yahan
- `business_id` / `created_by` **khud** set karo (`current_business_id()`,
  `current_user_id()`) — request body se kabhi nahi
- HTTP ka zikr nahi; sirf `NotFoundError` / `ConflictError` raise karo
- Scope se bahar ki row = `NotFoundError` (403 mat do, warna id ka wujood leak hota hai)
- Delete = soft delete

### 6. Endpoint — `app/api/v1/endpoints/<resource>.py`

```python
@router.get("", response_model=ApiResponse[list[XxxRead]],
            dependencies=[require_permission("xxx.view")])
```

- Har route par `require_permission("resource.action")`
- List mein `PageParamsDep` + `ok(items, meta=page.model_dump(exclude={"items"}))`
- Response hamesha `ok()` / `created()` / `no_content()` se

### 7. Wiring

`app/api/deps.py` mein:

```python
def get_xxx_service(session: SessionDep) -> XxxService:
    return XxxService(XxxRepository(session))

XxxServiceDep = Annotated[XxxService, Depends(get_xxx_service)]
```

aur `app/api/v1/router.py` mein `api_router.include_router(xxx.router)`.

### 8. Migration

```bash
alembic revision --autogenerate -m "add contacts table"
alembic upgrade head
```

---

## Frontend — 4 steps

Layering backend jaisi hi hai:

```
types/          shakal (backend schemas ka mirror)
lib/services/   API calls        <- fetch SIRF yahan
hooks/          react-query      (cache, loading, refetch)
app/            UI
```

### 1. Types — `src/types/<resource>.ts`

Backend schema ka mirror. **Decimal fields `string` hote hain** (backend JSON
mein string bhejta hai taake paise mein float error na aaye) — `number` mat karo.

### 2. Service — `src/lib/services/<resource>.ts`

`api.get/post/patch/delete/list` use karo. Ye client envelope khud unwrap karta
hai aur error par `ApiError` throw karta hai — component mein `if (res.success)`
likhne ki zaroorat nahi.

### 3. Hooks — `src/hooks/use-<resource>.ts`

- `xxxKeys` object mein cache keys ek jagah rakho
- `queryKey` mein filters bhi daalo
- Mutation ke baad `invalidateQueries`

### 4. Page — `src/app/<resource>/page.tsx`

Chaaron states dikhao: loading, error, empty, data. Page mein `fetch` bilkul
nahi.

---

## Checklist

- [ ] Model mixins + PG constraints
- [ ] `models/__init__.py` mein import
- [ ] Repository mein tenant + soft-delete filter
- [ ] Service mein `business_id` / `created_by` khud set
- [ ] Har endpoint par `require_permission(...)`
- [ ] Tenant isolation ka test (`tests/test_tenancy.py` ka pattern copy karo)
- [ ] `deps.py` + `router.py` wiring
- [ ] Alembic migration
- [ ] FE: types -> service -> hook -> page
