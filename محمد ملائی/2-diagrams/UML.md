# UML — Muhmol Accounts

> UML documentation for the `1-login-page` application. Diagrams are maintained as Mermaid source so they render directly in GitHub and remain easy to review in pull requests.

## Scope and implementation notes

The diagrams below describe the repository's documented architecture and database schema: a Next.js application with server-side route handlers, shared authentication/security/database helpers, Neon PostgreSQL, Resend email delivery, and Cloudflare Turnstile. The login sequence is based on the current `src/app/api/auth/login/route.ts` implementation.

These are design/documentation diagrams, not generated source code. Update them when routes, schema, or authentication behavior changes.

## 1. System context

```mermaid
flowchart TB
    Visitor([Visitor / User])
    Admin([Administrator])
    Browser[Web Browser]

    subgraph Vercel["Vercel — Next.js application"]
        UI["Next.js UI<br/>React"]
        API["Route handlers<br/>Authentication and account APIs"]
        Lib["Shared server-side modules<br/>Auth · DB · Security · Email"]
    end

    DB[(Neon PostgreSQL)]
    Mail[Resend Email API]
    Turnstile[Cloudflare Turnstile]

    Visitor --> Browser
    Admin --> Browser
    Browser <--> UI
    UI <--> API
    API --> Lib
    Lib <--> DB
    Lib --> Mail
    UI <--> Turnstile
    API -. "Verify challenge server-side" .-> Turnstile

    classDef external fill:#f8fafc,stroke:#64748b,color:#0f172a
    classDef app fill:#eff6ff,stroke:#2563eb,color:#1e3a8a
    class DB,Mail,Turnstile external
    class UI,API,Lib app
```

## 2. Component diagram

```mermaid
flowchart LR
    subgraph Client["Client"]
        Browser["Browser"]
        LoginUI["Login / account UI"]
        Challenge["Turnstile widget"]
    end

    subgraph App["Next.js application — Vercel"]
        Pages["src/app — pages"]
        Routes["src/app/api — route handlers"]
        Auth["src/lib/auth"]
        Security["src/lib/security"]
        DBHelper["src/lib/db"]
        Email["Email helper"]
        AdminScript["scripts/create-admin.mjs"]
    end

    subgraph Services["External services"]
        Neon[("Neon PostgreSQL")]
        Resend["Resend"]
        CF["Cloudflare Turnstile"]
    end

    Browser --> LoginUI
    LoginUI --> Pages
    LoginUI <--> Routes
    LoginUI <--> Challenge
    Challenge <--> CF
    Routes --> Auth
    Routes --> Security
    Routes --> DBHelper
    Auth --> DBHelper
    Routes --> Email
    Email --> Resend
    DBHelper <--> Neon
    Routes -. "Server-side challenge verification" .-> CF
    AdminScript --> DBHelper
```

## 3. Authentication — login sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Browser / Login UI
    participant Route as POST /api/auth/login
    participant Sec as Security helpers
    participant DB as Neon PostgreSQL
    participant Auth as Auth helpers

    User->>UI: Enter email/username and password
    UI->>Route: POST credentials (JSON)
    Route->>Sec: Validate same-origin request
    alt Invalid origin
        Sec-->>Route: Reject
        Route-->>UI: 403 Invalid request origin
    else Valid origin
        Route->>Route: Validate input with Zod
        alt Invalid input
            Route-->>UI: 400 Validation error
        else Valid input
            Route->>Sec: Check IP and account rate limits
            alt Rate limit exceeded
                Sec-->>Route: Deny request
                Route-->>UI: 429 Too many attempts
            else Allowed
                Route->>DB: Find user by normalized email or username
                DB-->>Route: User record (or no match)
                Route->>Auth: Verify password hash
                Auth-->>Route: Match / no match
                alt Unknown user, wrong password, or email unverified
                    Route-->>UI: 401 Generic authentication error
                else Credentials valid and email verified
                    Route->>Auth: Create database-backed session
                    Auth->>DB: Store session token hash and expiry
                    DB-->>Auth: Session persisted
                    Auth-->>Route: Session created
                    Route-->>UI: 200 { role }
                    UI-->>User: Continue to authenticated experience
                end
            end
        end
    end
```

## 4. Data model — entity relationship diagram

```mermaid
erDiagram
    USERS ||--o{ SESSIONS : owns
    USERS ||--o{ EMAIL_TOKENS : receives

    USERS {
        uuid id PK
        text full_name
        text username UK
        text email UK
        text password_hash
        text role
        boolean email_verified
        timestamptz created_at
    }

    SESSIONS {
        uuid id PK
        uuid user_id FK
        text token_hash UK
        timestamptz expires_at
        timestamptz created_at
    }

    EMAIL_TOKENS {
        text token_hash PK
        uuid user_id FK
        text purpose
        timestamptz expires_at
        timestamptz created_at
    }

    AUTH_RATE_LIMITS {
        text key PK
        timestamptz window_started_at
        integer attempts
    }
```

**Model notes**

- `users` has case-insensitive unique indexes for `email` and `username`.
- `sessions.user_id` and `email_tokens.user_id` reference `users.id` with `ON DELETE CASCADE`.
- `email_tokens.purpose` is constrained to `verify_email` or `reset_password`; each user can have at most one token per purpose.
- `auth_rate_limits` stores rate-limit counters and is keyed by a hashed/derived key; it is not directly related to a user by a foreign key.
- Passwords are represented by `password_hash`. Session and email-action tokens are stored as hashes, not as raw tokens.

## 5. Registration and email verification — logical flow

```mermaid
flowchart TD
    Start([User submits registration form])
    Validate["Validate fields and request origin"]
    Challenge["Verify Turnstile challenge"]
    Existing{"Email or username already exists?"}
    Hash["Hash password"]
    Create["Create unverified user"]
    Token["Generate single-use email verification token"]
    Store["Store token hash and expiry in PostgreSQL"]
    Send["Send verification email through Resend"]
    Click["User opens verification link"]
    Check{"Token valid, unused, and not expired?"}
    Verify["Mark email as verified"]
    Done([Account can sign in])
    Reject([Return safe error response])

    Start --> Validate --> Challenge
    Challenge -->|Failed| Reject
    Challenge -->|Passed| Existing
    Existing -->|Yes| Reject
    Existing -->|No| Hash --> Create --> Token --> Store --> Send --> Click --> Check
    Check -->|No| Reject
    Check -->|Yes| Verify --> Done
```

> This is a logical workflow based on the documented registration and email-verification behavior. Keep it synchronized with the registration and verification route handlers if implementation details change.

## 6. Password reset — logical flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant UI as Browser
    participant API as Next.js route handler
    participant DB as Neon PostgreSQL
    participant Mail as Resend

    User->>UI: Request password reset
    UI->>API: Submit account identifier
    API->>DB: Apply rate limits and look up account
    API->>DB: Store hashed, expiring reset token when applicable
    API->>Mail: Send reset link
    API-->>UI: Generic response that does not disclose account existence
    User->>UI: Open reset link and submit new password
    UI->>API: Submit token and new password
    API->>DB: Validate token hash, purpose, and expiry
    alt Token invalid or expired
        API-->>UI: Reject reset request
    else Token valid
        API->>API: Hash new password
        API->>DB: Update password and consume/invalidate reset token
        API->>DB: Invalidate existing sessions as implemented
        API-->>UI: Password reset result
    end
```

> Review this sequence against the current reset route before changing implementation. It captures the intended security flow; exact token-consumption and session-invalidation behavior should follow the route code.

## 7. Deployment view

```mermaid
flowchart TB
    Dev["Developer"] --> GitHub["GitHub repository"]
    GitHub -->|Push / deployment trigger| Vercel["Vercel build and runtime"]

    subgraph Runtime["Production runtime"]
        Next["Next.js pages and route handlers"]
    end

    Vercel --> Next
    Next <--> Neon[("Neon PostgreSQL")]
    Next --> Resend["Resend"]
    Next <--> Turnstile["Cloudflare Turnstile"]

    Env["Environment variables<br/>DATABASE_URL · APP_URL<br/>RESEND_API_KEY · EMAIL_FROM<br/>Turnstile public/secret keys"] -. "Configure securely" .-> Vercel
```

## Source of truth

- Application routes and UI: `src/app/`
- Shared server-side behavior: `src/lib/`
- Database schema: `database/schema.sql`
- Administrator provisioning: `scripts/create-admin.mjs`
- Setup and deployment instructions: `README.md`

Do not commit `.env.local`, API keys, database credentials, raw passwords or session/reset/verification tokens.
