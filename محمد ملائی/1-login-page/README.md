# Muhmol accounts

Muhmol is a full-stack Next.js account portal. Vercel runs the frontend and server-side API routes; Neon provides hosted PostgreSQL; the app handles password authentication and database-backed sessions; Resend delivers email verification and password reset links. Cloudflare Turnstile protects public registration.

See the [UML diagrams](./UML.md) for the application architecture, authentication flows, and database model.

## Project structure

```text
src/
  app/          Pages and route handlers, organized by URL
  lib/          Shared server-side auth, database, email, and security helpers
database/       PostgreSQL schema
scripts/        Local administration and maintenance commands
```

Keep URL-specific UI and API handlers under `src/app`; put logic shared by multiple routes in `src/lib`. Database changes belong in `database/schema.sql`, and local-only operational scripts belong in `scripts/`.

## Live app

[https://software-engineering-lab-muhammad-m.vercel.app/](https://software-engineering-lab-muhammad-m.vercel.app/)

The deployment must be rebuilt from the latest repository commit and have the environment variables below before database-backed account features are available.

## Deploy and configure

1. Connect the repository to Vercel and set **Root Directory** to `1-login-page`. Vercel will build the Next.js frontend and backend together.
2. Add a Neon PostgreSQL database through the Vercel Marketplace integration. Set `DATABASE_URL` to the database connection string in both Production and Preview. Run [`database/schema.sql`](./database/schema.sql) against that database once before opening the app.
3. Add the app environment variables in Vercel:
   - `APP_URL`: the production origin, e.g. `https://software-engineering-lab-muhammad-m.vercel.app` (no trailing slash). For Preview deployments, the app uses Vercel’s generated `VERCEL_URL` if `APP_URL` is not set for that environment.
   - `DATABASE_URL`: Neon connection string; keep it server-only (never prefix with `NEXT_PUBLIC_`).
   - `RESEND_API_KEY`: Resend API key.
   - `EMAIL_FROM`: sender using a domain verified in Resend, e.g. `Muhmol <accounts@example.com>`.
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Cloudflare Turnstile public site key.
   - `TURNSTILE_SECRET_KEY`: Turnstile secret key; keep it server-only.
4. In Cloudflare Turnstile, allow the production domain and any preview domains you will test. For local development, allow `localhost`.
5. Provision the first administrator from a secure local environment after the Neon schema exists. Set `DATABASE_URL`, a valid `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` (up to 128 characters) in the ignored local `.env.local`, then run:
   ```bash
   npm run create-admin
   ```
   The script creates or promotes the configured admin user and invalidates that account’s existing sessions. Do not put the admin password in Vercel or commit it.
6. Push the configured code to the connected GitHub branch to trigger a Vercel deployment. Confirm Vercel has completed a production build before sharing the live URL.

Vercel hosts the app runtime, but its PostgreSQL Marketplace database and Resend remain managed services. No database, email, or Vercel credentials are stored in the repository.

## Authentication and data

- Passwords are hashed with bcrypt and never stored or returned in plain text.
- Sessions use random opaque tokens; only SHA-256 token hashes are stored in PostgreSQL. Browser cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` in production.
- Registration requires server-verified Turnstile and email verification. Verification and password reset links are random, single-use, hashed in the database, and expire.
- Auth endpoints validate same-origin requests, validate inputs, and rate-limit attempts in PostgreSQL.
- Admin access is assigned only by the local provisioning script and checked server-side for every admin API request.
- Existing Supabase accounts and passwords are not migrated. Users must create new accounts after the new backend is configured.

## Local development

1. Copy `.env.example` to `.env.local` and fill in Neon, Resend, and Turnstile development credentials. Configure `APP_URL=http://localhost:3000`.
2. Run [`database/schema.sql`](./database/schema.sql) against the development Neon database.
3. Start the app:
   ```bash
   npm install
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000).

Use `npm run lint` and `npm run build` before pushing. The GitHub Actions workflow validates the app; Vercel performs deployments.
