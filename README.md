# Publio

Publio is a PDF-to-web catalog application powered by badje.ir.

## Authentication

Publio uses one email + OTP sign-in flow at `/account` for both normal users and the administrator. The administrator identity is configured at runtime with `ADMIN_EMAIL`; it is not hardcoded in the application.

Required runtime mail settings:

```env
ADMIN_EMAIL=you@example.com
RESEND_API_KEY=re_...
RESEND_FROM_NAME=Publio
RESEND_FROM_EMAIL=no-reply@your-domain.example
RESEND_REPLY_TO=info@your-domain.example
```

Resend configuration is runtime-only. There is no Resend configuration stored in the database or exposed in the admin UI.

## User workspace

Registered users can create and manage their own catalogs, including PDF upload, render quality, static-PDF navigation, regeneration, QR code access, publication state and deletion. The catalog editor and catalog list use the same dashboard/modal/table UI pattern as the original main-branch catalog manager.

The default free plan includes 50 MB of storage. Free-plan catalog URLs are generated automatically. Plans with `custom_slug` enabled can use custom catalog URLs.

## Administrator workspace

The administrator signs in through the same `/account` OTP form. After authentication, `/account` exposes user and subscription-plan management. Legacy `/admin`, `/admin/login`, `/admin/users` and `/admin/plans` routes redirect into the unified account workspace.

## Runtime and deployment

The production container is built without secrets. Runtime secrets and configuration are injected by Docker Compose on the server.

```bash
docker build -t badje-catalog:latest .
docker compose up -d --force-recreate
```

The production Compose file intentionally uses `image: badje-catalog:latest` rather than `build:`.

Catalog source PDFs and generated web assets are persisted under the mounted uploads directory. PostgreSQL stores metadata and account/subscription state.
