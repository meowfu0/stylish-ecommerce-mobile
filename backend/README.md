# Stylish Marketplace API

NestJS 11 API for the Stylish multi-vendor marketplace. PostgreSQL is hosted by
Supabase and accessed only through NestJS, Drizzle ORM, and `pg.Pool`.

The current backend includes the marketplace schema, health checks, NestJS-owned
authentication, rotating refresh sessions, platform and merchant authorization,
merchant onboarding and approval, Merchant Catalog Phase 1, Redis infrastructure,
Merchant Inventory Phase 1, private product-image storage, Customer Storefront
Phase 1, Swagger, and Postman assets. WebSockets, image processing, dashboards,
and frontend implementation remain separate milestones.

## Setup

Requirements:

- Node.js 20.19 or newer
- npm
- The development Supabase PostgreSQL connection string
- Network access to that database

```bash
cd backend
npm install
```

Create the ignored local environment:

```powershell
Copy-Item .env.example .env
```

Keep all real credentials in `backend/.env`. Never place a database URL, JWT
secret, service-role key, password, or token in Expo `EXPO_PUBLIC_*` variables.

## Environment variables

| Variable                        | Required    | Description                                                |
| ------------------------------- | ----------- | ---------------------------------------------------------- |
| `NODE_ENV`                      | Yes         | `development`, `test`, or `production`                     |
| `PORT`                          | Yes         | API port, normally `3000`                                  |
| `API_PREFIX`                    | Yes         | Fixed to `api`                                             |
| `CORS_ORIGINS`                  | Yes         | Comma-separated browser HTTP(S) origins                    |
| `DATABASE_URL`                  | Yes         | Supabase PostgreSQL URI                                    |
| `DATABASE_SSL`                  | Yes         | Use `true` for Supabase                                    |
| `DATABASE_SSL_CA_PATH`          | No          | Supabase CA certificate path                               |
| `DATABASE_*_TIMEOUT_MS`         | Yes         | Pool connection, idle, and query timeouts                  |
| `DATABASE_MAX_CONNECTIONS`      | Yes         | `pg.Pool` maximum                                          |
| `SWAGGER_ENABLED`               | Yes         | Enables `/api/docs` and `/api/docs-json`                   |
| `JWT_ACCESS_SECRET`             | Yes         | Unique high-entropy HS256 secret, minimum 32 characters    |
| `JWT_REFRESH_SECRET`            | Yes         | Different high-entropy HS256 secret, minimum 32 characters |
| `JWT_ACCESS_EXPIRES_IN`         | Yes         | Fixed approved value: `15m`                                |
| `JWT_REFRESH_EXPIRES_IN`        | Yes         | Fixed approved value: `30d`                                |
| `JWT_ISSUER`                    | Yes         | Expected JWT issuer                                        |
| `JWT_AUDIENCE`                  | Yes         | Expected JWT audience                                      |
| `EMAIL_VERIFICATION_EXPIRES_IN` | Yes         | Fixed approved value: `24h`                                |
| `PASSWORD_RESET_EXPIRES_IN`     | Yes         | Fixed approved value: `30m`                                |
| `AUTH_MAX_ACTIVE_SESSIONS`      | Yes         | Fixed approved value: `5`                                  |
| `AUTH_RATE_LIMIT_WINDOW_MS`     | Yes         | Development in-memory limit window                         |
| `AUTH_FRONTEND_URL`             | Yes         | Base deep link used in authentication emails               |
| `EMAIL_PROVIDER`                | Yes         | `preview` locally or `smtp` for real delivery              |
| `EMAIL_PREVIEW_ENABLED`         | Yes         | Must be `false` with SMTP and in production                |
| `EMAIL_PREVIEW_DIRECTORY`       | Yes         | Git-ignored local preview directory                        |
| `SMTP_HOST`                     | Conditional | SMTP server, such as `smtp.gmail.com`                      |
| `SMTP_PORT`                     | Yes         | SMTP port, normally `465` with implicit TLS                |
| `SMTP_SECURE`                   | Yes         | Use `true` for Gmail port `465`                            |
| `SMTP_USER`                     | Conditional | Server-only SMTP login email                               |
| `SMTP_PASSWORD`                 | Conditional | Server-only App Password or SMTP credential                |
| `SMTP_CONNECTION_TIMEOUT_MS`    | Yes         | SMTP connection timeout                                    |
| `EMAIL_FROM_ADDRESS`            | Conditional | Sender address; equal to `SMTP_USER` for Gmail             |
| `EMAIL_FROM_NAME`               | Yes         | Safe display name, normally `Velori`                       |
| `EMAIL_REPLY_TO`                | No          | Optional monitored reply-to address                        |
| `REDIS_ENABLED`                 | Yes         | Enables the official Node.js Redis client                  |
| `REDIS_REQUIRED`                | Yes         | Fails startup when enabled Redis is unavailable            |
| `REDIS_URL`                     | Conditional | `redis://` or TLS `rediss://` connection URI               |
| `REDIS_KEY_PREFIX`              | Yes         | Non-secret namespace applied to every Redis key            |
| `REDIS_CONNECTION_TIMEOUT_MS`   | Yes         | Redis startup connection timeout                           |
| `REDIS_DEFAULT_TTL_SECONDS`     | Yes         | Approved merchant profile cache TTL, normally `60`         |
| `REDIS_IDEMPOTENCY_TTL_SECONDS` | Yes         | Temporary safe approval-response replay TTL                |
| `REDIS_LOCK_TTL_MS`             | Yes         | Short distributed onboarding request-lock TTL              |
| `SUPABASE_URL`                  | Yes         | Server-side Supabase project HTTPS URL or REST endpoint    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Yes         | Server-only Storage credential; never expose to Expo       |
| `SUPABASE_STORAGE_BUCKET`       | Yes         | Fixed private bucket name: `product-images`                |
| `INITIAL_ADMIN_PASSWORD`        | Conditional | CLI-only password when creating a missing initial admin    |

Access and refresh secrets must be distinct. Environment validation stops startup
when required values are missing, when SMTP lacks its server credentials, or
when the development email adapter is enabled in production.

Redis credentials are accepted only through `REDIS_URL` and are never logged. In
development and tests, disabled or optional unavailable Redis uses a documented
in-memory fallback. Production has no in-memory fallback: cache reads are skipped,
while protected onboarding requests fail safely if distributed rate limiting is
unavailable. Set both `REDIS_ENABLED=true` and `REDIS_REQUIRED=true` for a
production deployment.

The public Supabase CA is stored at `certs/supabase-ca.crt`. It is not a client
credential. Use:

```env
DATABASE_SSL=true
DATABASE_SSL_CA_PATH=./certs/supabase-ca.crt
```

The Storage service-role key is used only inside NestJS. A mobile or web client
must use a Supabase publishable key with the short-lived upload token returned by
the API; it must never receive the service-role key.

## Database and access-control commands

Generate and apply reviewed Drizzle migrations:

```bash
npm run db:generate
npm run db:check
npm run db:migrate
```

Do not use `push --force`.

Bootstrap the approved system roles, permissions, and role-permission mappings:

```bash
npm run auth:bootstrap
```

This command is explicit and idempotent. It is never run during application
startup.

Promote an existing account:

```bash
npm run auth:create-admin -- --email=admin@example.com
```

To create the user when it does not exist, set `INITIAL_ADMIN_PASSWORD` in the
process environment before running the same command. The password is never
accepted as a command-line argument or logged. Re-running the command does not
duplicate the role assignment.

The bootstrap also installs the customer-owned merchant-application permissions.
Run it explicitly after applying the onboarding migration; it is not run at API
startup.

## Start and inspect

```bash
npm run start:dev
```

- Health: `GET http://localhost:3000/api/health`
- Swagger: `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs-json`

Successful responses use:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {}
}
```

Errors use:

```json
{
  "success": false,
  "message": "Readable safe message",
  "errors": [{ "field": "fieldName", "message": "Safe detail" }]
}
```

Every request receives `X-Request-Id`. Request bodies, query strings,
authorization headers, passwords, JWTs, raw action tokens, credentials, and token
hashes are not logged.

## Authentication contract

Public endpoints:

| Endpoint                             | Success | Body                                        |
| ------------------------------------ | ------- | ------------------------------------------- |
| `POST /api/auth/register`            | `201`   | `email`, `password`, optional `displayName` |
| `POST /api/auth/login`               | `200`   | `email`, `password`, optional `deviceName`  |
| `POST /api/auth/refresh`             | `200`   | `refreshToken`                              |
| `POST /api/auth/verify-email`        | `200`   | `token`                                     |
| `POST /api/auth/resend-verification` | `202`   | `email`                                     |
| `POST /api/auth/forgot-password`     | `202`   | `email`                                     |
| `POST /api/auth/reset-password`      | `200`   | `token`, `newPassword`                      |

Protected endpoints require:

```http
Authorization: Bearer ACCESS_TOKEN
```

| Endpoint                    | Success | Effect                                                           |
| --------------------------- | ------- | ---------------------------------------------------------------- |
| `POST /api/auth/logout`     | `200`   | Revokes the current session                                      |
| `POST /api/auth/logout-all` | `200`   | Revokes all user sessions                                        |
| `GET /api/auth/me`          | `200`   | Returns account, platform roles, and active merchant memberships |

Login and refresh return JSON tokens for Expo SecureStore:

```json
{
  "tokens": {
    "accessToken": "JWT",
    "refreshToken": "JWT",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "refreshTokenExpiresAt": "ISO_DATE"
  }
}
```

Frontend developers must handle:

- `400` validation failure or unknown request properties
- `401` generic invalid credentials, invalid access token, expired/invalid action
  token, or invalid/replayed refresh token
- `403` authenticated user lacks platform or merchant permission
- `409` generic duplicate registration or five-session limit
- `429` per-action rate limit
- `503` database or configured delivery service unavailable

Email verification is required before login. Forgot-password and resend requests
always return a generic accepted response so account existence is not disclosed.
Password reset increments `auth_version` and revokes every session.

Refresh tokens rotate on every use. Only SHA-256 token hashes are persisted. Reuse
of an already rotated token revokes the affected session. Access validation
checks HS256, issuer, audience, token type, session state, account status, and
`auth_version`.

## Authentication email delivery

With `EMAIL_PROVIDER=preview` and `EMAIL_PREVIEW_ENABLED=true`, verification and
password-reset emails are written with owner-only permissions under
`.email-previews/`. Logs contain only a preview identifier and purpose; they never
contain a token. Open the newest local preview file and copy its token into
Postman. The directory is ignored by Git.

Set `EMAIL_PROVIDER=smtp`, disable previews, and configure server-only SMTP
credentials to deliver real messages with Nodemailer. Gmail App Password setup is
supported for development and small demonstrations. Both providers use the same
branded verification and password-reset templates. See
[`docs/EMAIL_DELIVERY.md`](docs/EMAIL_DELIVERY.md) for the complete setup and
verification procedure.

## Postman

Import:

1. `postman/Stylish-API.postman_collection.json`
2. `postman/Stylish-Local.postman_environment.json`

Select `Stylish Local`, set the secret `customerPassword`, and run Authentication
requests in order. Login and refresh scripts automatically replace
`accessToken`, `refreshToken`, and `customerAccessToken`. Those environment values
are typed as Postman secrets.

## Authorization boundary

Routes are protected by default unless marked public. Platform permission checks
resolve only platform-role assignments. Merchant permission checks require an
active membership in the route merchant, a merchant-scoped role, and an active
merchant. A client merchant ID is never sufficient: future resource services must
also query by both resource ID and merchant ID.

## Merchant onboarding

Customer application endpoints require an access token and ownership of the
application. Workflow-changing POST requests also require:

```http
Idempotency-Key: UNIQUE_8_TO_128_CHARACTER_VALUE
```

| Endpoint                                                               | Permission                            | Success |
| ---------------------------------------------------------------------- | ------------------------------------- | ------- |
| `POST /api/merchants/applications`                                     | `account.merchant_application.create` | `201`   |
| `GET /api/merchants/applications/me`                                   | `account.merchant_application.read`   | `200`   |
| `PATCH /api/merchants/applications/:applicationId`                     | `account.merchant_application.update` | `200`   |
| `POST /api/merchants/applications/:applicationId/submit`               | `account.merchant_application.submit` | `202`   |
| `GET /api/admin/merchant-applications`                                 | `platform.merchants.read`             | `200`   |
| `GET /api/admin/merchant-applications/:applicationId`                  | `platform.merchants.read`             | `200`   |
| `POST /api/admin/merchant-applications/:applicationId/request-changes` | `platform.merchants.manage`           | `200`   |
| `POST /api/admin/merchant-applications/:applicationId/reject`          | `platform.merchants.manage`           | `200`   |
| `POST /api/admin/merchant-applications/:applicationId/approve`         | `platform.merchants.manage`           | `200`   |
| `GET /api/merchants/:merchantId`                                       | `merchant.profile.read`               | `200`   |
| `PATCH /api/merchants/:merchantId`                                     | `merchant.profile.update`             | `200`   |

Application statuses are `DRAFT`, `SUBMITTED`, `CHANGES_REQUESTED`,
`APPROVED`, and `REJECTED`. Submission requires a support email and one active
default `BUSINESS` address. Approval atomically creates the active owner
membership, OWNER role mapping, and `MAIN` / `Main Location` default inventory
location.

PostgreSQL remains authoritative for lifecycle, permissions, idempotency events,
audit, ownership, and inventory. Redis provides rate limiting, short request
locks, safe short-lived approval response replay, and a 60-second cache for
approved profile reads only. Approval and profile updates invalidate that cache.
Drafts, admin queues, audit data, request bodies, credentials, and tokens are
never cached.

See [Frontend merchant-onboarding contract](docs/frontend-merchant-onboarding.md)
for request bodies, headers, response handling, and integration sequencing.

## Merchant Catalog Phase 1

Catalog routes use `/api/merchants/:merchantId/catalog` and require an active
membership plus one of `products.read`, `products.write`, or `products.publish`.
The explicit idempotent `npm run auth:bootstrap` command installs only missing
permission records and mappings; catalog staff receive read/write while owner,
admin, and manager roles also receive publish.

Brands, collections, products, options, values, and variants are merchant-owned.
Categories remain platform-managed global taxonomy and are read-only through the
merchant catalog API. Every resource lookup and reference is constrained by the
route merchant where applicable. Product creation and publish/deactivate/archive
requests require `Idempotency-Key`.

Catalog writes are transactional and include sanitized audit logs, domain events,
and outbox messages. Merchant-private reads and drafts are not cached. Writes
invalidate reserved public published-product and collection cache keys while
PostgreSQL remains authoritative.

See [Frontend merchant-catalog contract](docs/frontend-merchant-catalog.md) for
all endpoints, request bodies, filters, publication rules, responses, and errors.

## Merchant Inventory Phase 1

Inventory routes use `/api/merchants/:merchantId/inventory` and require an active
merchant membership. Reads use `merchant.inventory.read`, manual stock changes
use `merchant.inventory.adjust`, and location changes use
`merchant.inventory.locations.manage`. OWNER, merchant ADMIN, and MANAGER receive
all three; INVENTORY_STAFF receives read and adjust only. Run the explicit,
idempotent `npm run auth:bootstrap` after deployment to install the missing
location-management permission and mappings.

The module supports tenant-safe inventory locations, aggregate and per-location
levels, variant detail, manual `STOCK_IN` / `STOCK_OUT` / `ADJUSTMENT`, immutable
movement history, and low/out-of-stock queues. Adjustments require an
`Idempotency-Key`, reason, and current balance version. They run inside a
PostgreSQL transaction with row locking and compare-and-swap protection; stock
cannot become negative or fall below reserved quantity.

PostgreSQL is the source of truth. Balances and movements are never cached.
Committed adjustments write audit, domain-event, and outbox records and
invalidate affected catalog and reserved future storefront stock cache keys.

See [Frontend merchant-inventory contract](docs/frontend-merchant-inventory.md)
for endpoint bodies, filters, pagination, responses, conflict handling, and
frontend refresh rules.

## Product Images and Supabase Storage Phase 1

Product-image routes extend the merchant catalog under
`/api/merchants/:merchantId/catalog/products/:productId/images`. Confirmed images
are stored in the private `product-images` bucket. PostgreSQL stores only the
server-generated object path, validated metadata, ordering, and primary-image
state. Upload URLs are short-lived, read URLs expire after five minutes, and
neither URLs nor tokens are cached.

Verify or idempotently create/configure the bucket explicitly:

```bash
npm run storage:check
npm run storage:bootstrap
```

The bootstrap command creates the bucket only when missing and otherwise repairs
only its privacy, 5 MB size limit, and JPEG/PNG/WebP allowlist. It is never run at
application startup and never prints credentials.

See [Frontend product-image contract](docs/frontend-product-images.md) for the
upload sequence, endpoint bodies, signed URL handling, responses, and errors.

## Customer Storefront API Phase 1

Public read-only routes use `/api/storefront` and require no Bearer token. They
expose only active published products from active verified merchants, active
variants, confirmed primary images through five-minute signed read URLs, integer
PHP-centavo price ranges, and computed `IN_STOCK` / `LOW_STOCK` / `OUT_OF_STOCK`
states. Listings use opaque cursor pagination and validated search, taxonomy,
merchant, price, stock, featured, and sorting filters.

Redis uses cache-aside caching with 30-second listing, 60-second detail, and
120-second directory TTLs. Cache keys include filters, cursor, and catalog/stock
revision numbers. Catalog, image, merchant, and inventory writes advance those
revisions; PostgreSQL remains authoritative.

See [Frontend storefront contract](docs/frontend-storefront.md) for exact paths,
parameters, response fields, signed-image behavior, pagination, and errors.

## Redis connectivity

With Redis configured, verify it without printing the connection URI:

```bash
npm run redis:check
```

The command prints only enabled/connected/status fields. When Redis is disabled,
it reports `status: "disabled"`; this is expected for local in-memory fallback.

## Verification

```bash
npm run format
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

## Troubleshooting

If startup reports environment validation errors, compare `.env` with
`.env.example`. Use independent 32+ character JWT secrets and keep the approved
lifetimes unchanged.

If health returns `503`, verify the Supabase project, encoded database password,
TLS settings, CA path, pooler host, and network access. Raw database errors are
intentionally suppressed.

For a physical Expo device, use the development computer LAN address instead of
`localhost`, keep both devices on the same network, and allow the API port through
the firewall.

If npm cannot execute through WSL, run the backend commands from Windows
PowerShell. No global NestJS installation is required.
