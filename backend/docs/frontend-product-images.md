# Frontend Product Images Contract

All routes require an active merchant membership and:

```http
Authorization: Bearer ACCESS_TOKEN
```

The route prefix is:

```text
/api/merchants/:merchantId/catalog/products/:productId/images
```

Use `products.read` for lists and signed reads. All mutations require
`products.write`. Resource IDs are always checked against the route merchant and
product; a client-provided ID never establishes ownership.

## Upload sequence

1. Read the exact local byte size and MIME type. Only `image/jpeg`, `image/png`,
   and `image/webp` from 1 byte through 5,242,880 bytes are accepted.
2. Initialize the upload:

   ```http
   POST /upload-requests
   Idempotency-Key: UNIQUE_8_TO_128_CHARACTER_VALUE
   Content-Type: application/json
   ```

   ```json
   {
     "contentType": "image/jpeg",
     "fileSizeBytes": 2048,
     "altText": "Black linen dress"
   }
   ```

   Success is `201`:

   ```json
   {
     "success": true,
     "message": "Signed product image upload request created",
     "data": {
       "imageId": "UUID",
       "productId": "UUID",
       "contentType": "image/jpeg",
       "fileSizeBytes": 2048,
       "storagePath": "SERVER_GENERATED_PATH",
       "uploadUrl": "SHORT_LIVED_URL",
       "uploadToken": "SHORT_LIVED_TOKEN",
       "expiresAt": "ISO_DATE"
     }
   }
   ```

   Reuse an idempotency key only with the identical body. The backend accepts no
   filename or storage path. Treat `uploadUrl`, `uploadToken`, and `storagePath`
   as transient values and do not persist them in application logs or analytics.

3. Upload the exact bytes with the Supabase Storage client (configured with the
   project origin, not its `/rest/v1` endpoint) and a client-safe publishable key:

   ```ts
   await supabase.storage
     .from('product-images')
     .uploadToSignedUrl(storagePath, uploadToken, fileBody, { contentType });
   ```

   Never put `SUPABASE_SERVICE_ROLE_KEY` in Expo or browser code. Signed upload
   requests expire after approximately two hours.

4. Confirm only after the Storage upload succeeds:

   ```http
   POST /:imageId/confirm
   ```

   The body is empty. Success is `200` with the confirmed image. The backend
   verifies that the stored MIME type and byte size exactly match initialization.
   A mismatch returns `400` and deletes the invalid object; initialize again with
   a new idempotency key. A missing object returns `404`. An expired pending
   upload returns `409` and is cleaned up.

The first confirmed image becomes primary. Later writes maintain no more than one
primary image, and deleting the primary promotes the next confirmed image.

## Image response

Confirmed-image responses use:

```json
{
  "id": "UUID",
  "merchantId": "UUID",
  "productId": "UUID",
  "altText": "Black linen dress",
  "contentType": "image/jpeg",
  "sizeBytes": 2048,
  "displayOrder": 0,
  "isPrimary": true,
  "signedUrl": "SHORT_LIVED_PRIVATE_URL_OR_NULL",
  "readUrlExpiresAt": "ISO_DATE_OR_NULL",
  "confirmedAt": "ISO_DATE",
  "createdAt": "ISO_DATE",
  "updatedAt": "ISO_DATE"
}
```

List responses contain `{ "items": [...] }`. Read URLs expire after five minutes.
If a list item has a null URL because its object is missing, do not display a
broken image; ask the merchant to replace it.

## Endpoints

| Method   | Path                    | Body / header                           | Success                         |
| -------- | ----------------------- | --------------------------------------- | ------------------------------- |
| `GET`    | `/`                     | none                                    | `200`                           |
| `POST`   | `/upload-requests`      | initialization body + `Idempotency-Key` | `201`                           |
| `POST`   | `/:imageId/confirm`     | empty                                   | `200`                           |
| `PATCH`  | `/:imageId`             | `altText?: string                       | null`, `displayOrder?: integer` | `200` |
| `POST`   | `/:imageId/set-primary` | empty                                   | `200`                           |
| `PATCH`  | `/reorder`              | `{ "imageIds": ["UUID", "..."] }`       | `200`                           |
| `DELETE` | `/:imageId`             | empty + `Idempotency-Key`               | `200`                           |
| `GET`    | `/:imageId/signed-url`  | none                                    | `200`                           |

Reorder must contain every confirmed image ID exactly once in the desired order
(1–50 unique IDs). Delete returns `{ "deleted": true, "imageId": "UUID" }` and
is safely replayable with the same idempotency key.

## Error handling

- `400`: invalid MIME type, size, DTO, object metadata, or reorder set
- `401`: missing, invalid, or expired access token
- `403`: inactive membership, missing permission, or another merchant's resource
- `404`: product, image, or Storage object not found
- `409`: archived product, expired upload, or idempotency key reused differently
- `429`: per-route distributed/in-memory rate limit exceeded
- `503`: PostgreSQL, Redis policy, or Supabase Storage temporarily unavailable

Errors use the API's standard safe `success: false`, `message`, and `errors`
envelope. The frontend should retry `503` with backoff, create a new idempotency
key only for a genuinely new operation, and refresh image URLs before expiry.
