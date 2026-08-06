# Frontend merchant-onboarding contract

The Expo application must call the NestJS API. It must not query or mutate
merchant, membership, verification, audit, event, or outbox tables through a
Supabase client.

## Authentication and headers

Every onboarding request requires the access JWT returned by login:

```http
Authorization: Bearer ACCESS_TOKEN
Accept: application/json
```

Every workflow-changing POST also requires a client-generated stable key:

```http
Idempotency-Key: UUID_OR_OTHER_UNIQUE_8_TO_128_CHARACTER_VALUE
```

Keep the same key while retrying the same request. Generate a new key for a new
operation. Reusing a key with changed input returns `409`.

## Customer flow

1. Create a draft with `POST /api/merchants/applications`.
2. Save `data.id` as the application ID.
3. Read the current application with `GET /api/merchants/applications/me`.
4. Edit a `DRAFT` or `CHANGES_REQUESTED` application with `PATCH`.
5. Submit with `POST /api/merchants/applications/:applicationId/submit`.
6. Disable editing while status is `SUBMITTED`.
7. If changes are requested, display `data.latestVerification.reviewNote`, allow
   edits, and resubmit using a new idempotency key.
8. After approval, save the same UUID as the merchant ID.

Create body:

```json
{
  "slug": "juan-fashion",
  "legalName": "Juan Fashion Trading",
  "displayName": "Juan Fashion",
  "profile": {
    "description": "Modern Philippine fashion",
    "supportEmail": "support@example.com",
    "supportPhone": "+639171234567",
    "websiteUrl": "https://example.com"
  },
  "businessAddress": {
    "contactName": "Juan Dela Cruz",
    "phone": "+639171234567",
    "addressLine1": "123 Rizal Street",
    "addressLine2": null,
    "barangay": "Poblacion",
    "city": "Makati",
    "province": "Metro Manila",
    "postalCode": "1200",
    "countryCode": "PH"
  }
}
```

Draft creation permits an omitted profile or address, but submission requires
`profile.supportEmail` and an active default business address. Verification
document uploads are not part of this milestone.

## Platform review flow

Platform administrators use a separate administrator access token:

- `GET /api/admin/merchant-applications?status=SUBMITTED&limit=25`
- `GET /api/admin/merchant-applications/:applicationId`
- `POST .../:applicationId/request-changes` with `{ "reason": "..." }`
- `POST .../:applicationId/reject` with `{ "reason": "..." }`
- `POST .../:applicationId/approve` with optional
  `{ "commissionRateBasisPoints": 500 }`

The list response contains an opaque `nextCursor`. Pass it back as `cursor`; do
not parse or manufacture cursors on the client.

Approval creates the owner membership and default inventory location. Retrying
the unchanged approval with the same idempotency key is safe.

## Approved profile flow

An active member with `merchant.profile.read` may call:

```http
GET /api/merchants/:merchantId
```

Members with `merchant.profile.update` may update only `displayName` and nested
profile contact/presentation fields. The backend rejects attempts to change legal
name, slug, verification status, commission, ownership, or audit fields.

## Responses and errors

Success:

```json
{
  "success": true,
  "message": "Merchant application submitted for review",
  "data": {
    "id": "UUID",
    "applicationStatus": "SUBMITTED"
  }
}
```

Validation or policy error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "businessAddress", "message": "Readable safe detail" }]
}
```

Handle these statuses:

- `400`: invalid body, unknown field, UUID, cursor, or missing idempotency key
- `401`: missing, expired, revoked, or invalid access token
- `403`: platform/merchant permission or tenant membership denied
- `404`: application/merchant is missing or not owned by the caller
- `409`: lifecycle, slug, or conflicting idempotency request
- `429`: rate limit; respect `Retry-After`
- `503`: database or required distributed protection is unavailable

Never show a generic permission error as an invitation to retry under a different
merchant ID. Merchant IDs from UI state are untrusted until the API authorizes
them.
