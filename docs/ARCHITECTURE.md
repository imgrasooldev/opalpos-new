# Architecture & Request Flow

Visual guide to how a request travels through the layers.
(GitHub and VSCode's Markdown preview render the Mermaid diagrams below.)

## 1. Layered architecture

```mermaid
flowchart TD
    Client([Client / Browser])

    subgraph API["API layer — app/api/"]
        EP["Endpoint\n(users.py)\nHTTP only: routing, status codes"]
        DEP["deps.py\nDependency injection"]
    end

    subgraph SVC["Service layer — app/services/"]
        S["UserService\nBusiness rules, hashing,\nraises domain exceptions"]
    end

    subgraph REPO["Repository layer — app/repositories/"]
        R["UserRepository\n(extends BaseRepository)\nONLY layer touching the DB"]
    end

    subgraph DATA["Data layer"]
        M["Model — app/models/\nUser ORM class"]
        DB[(Database\nSQLite / Postgres)]
    end

    Client -->|HTTP request| EP
    EP -->|calls| S
    DEP -.injects.-> EP
    S -->|calls| R
    R -->|SQLAlchemy| M
    M --> DB

    DB -.rows.-> M
    M -.ORM object.-> R
    R -.-> S
    S -.-> EP
    EP -->|"JSON envelope"| Client

    classDef api fill:#dbeafe,stroke:#3b82f6,color:#1e3a8a;
    classDef svc fill:#dcfce7,stroke:#22c55e,color:#14532d;
    classDef repo fill:#fef9c3,stroke:#eab308,color:#713f12;
    classDef data fill:#fae8ff,stroke:#a855f7,color:#581c87;
    class EP,DEP api;
    class S svc;
    class R repo;
    class M,DB data;
```

## 2. Request flow — `POST /api/v1/users` (create user)

```mermaid
sequenceDiagram
    autonumber
    participant C as Client
    participant E as Endpoint (users.py)
    participant Sc as Schema (UserCreate)
    participant Sv as UserService
    participant Rp as UserRepository
    participant DB as Database

    C->>E: POST /users  { email, password }
    E->>Sc: validate request body
    alt invalid data
        Sc-->>C: 422 error envelope
    end
    Sc-->>E: valid UserCreate
    E->>Sv: create_user(data)
    Sv->>Rp: get_by_email(email)
    Rp->>DB: SELECT ... WHERE email
    DB-->>Rp: existing? 
    alt email already exists
        Sv-->>C: 409 ConflictError envelope
    end
    Sv->>Sv: hash_password()
    Sv->>Rp: create(User)
    Rp->>DB: INSERT INTO users
    DB-->>Rp: new row (id, timestamps)
    Rp-->>Sv: User object
    Sv-->>E: User object
    E->>E: UserRead.model_validate() + wrap
    E-->>C: 201 { success, message, data }
```

## 3. Dependency injection chain

Every request builds this chain automatically (see `app/api/deps.py`):

```mermaid
flowchart LR
    G["get_session()\napp/core/database.py"] -->|AsyncSession| R["UserRepository(session)"]
    R -->|repository| S["UserService(repository)"]
    S -->|service| E["Endpoint\nservice: UserServiceDep"]

    classDef box fill:#f1f5f9,stroke:#64748b,color:#0f172a;
    class G,R,S,E box;
```

## 4. Folder responsibilities

```mermaid
flowchart TD
    subgraph app["app/"]
        main["main.py — app factory, routers, exception handlers, static mount"]

        subgraph core["core/"]
            cfg["config.py — settings from .env"]
            db["database.py — engine, session, Base"]
            sec["security.py — password hashing"]
            exc["exceptions.py — domain exceptions"]
        end

        subgraph feature["Per-resource (User example)"]
            mdl["models/ — ORM tables"]
            sch["schemas/ — Pydantic validation"]
            rep["repositories/ — DB access"]
            srv["services/ — business logic"]
            api["api/ — endpoints + deps"]
        end

        subgraph helpers["utils/ — reusable helpers"]
            f1["files.py — uploads"]
            f2["forms.py — as_form"]
            f3["pagination.py — Page[T]"]
            f4["response.py — envelope + status helpers"]
        end

        seed["db/ — seeders (sample data)"]
    end

    alembicdir["alembic/ — migrations (schema source of truth)"]

    classDef c fill:#dbeafe,stroke:#3b82f6;
    classDef f fill:#dcfce7,stroke:#22c55e;
    classDef h fill:#fef9c3,stroke:#eab308;
    class cfg,db,sec,exc c;
    class mdl,sch,rep,srv,api f;
    class f1,f2,f3,f4 h;
```

## 5. Supporting flows

```mermaid
flowchart LR
    subgraph Migrations
        MdlChange["Edit a model"] --> Autogen["alembic revision --autogenerate"]
        Autogen --> Upgrade["alembic upgrade head"] --> Schema[(Tables)]
    end

    subgraph Seeders
        Seed["python -m app.db.seed"] --> UserSvc["UserService"] --> Rows[(Sample rows)]
    end

    subgraph Uploads
        File["UploadFile"] --> SaveImg["save_image() validate + store"]
        SaveImg --> Disk["uploads/ on disk"]
        SaveImg --> Url["/static/... URL saved on user"]
    end
```
