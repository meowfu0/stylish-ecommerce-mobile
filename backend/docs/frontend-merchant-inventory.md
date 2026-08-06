# Frontend contract: Merchant Inventory Phase 1

Base path:

```text
/api/merchants/:merchantId/inventory
```

Every request requires an access token and an active membership in the route
merchant:

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

The server validates merchant ownership for every location, product, variant,
balance, and movement ID. Do not treat a locally stored merchant ID as proof of
access. Cross-merchant IDs are returned as unavailable.

## Permissions

- `merchant.inventory.read`: locations, levels, variant inventory, movements,
  and low-stock reads.
- `merchant.inventory.adjust`: manual `STOCK_IN`, `STOCK_OUT`, and `ADJUSTMENT`.
- `merchant.inventory.locations.manage`: create, edit, and change the default
  location.

OWNER, merchant ADMIN, and MANAGER receive all three permissions. INVENTORY_STAFF
receives read and adjust, but cannot manage locations. Run the explicit,
idempotent `npm run auth:bootstrap` command after deployment.

## Response envelope and errors

Success:

```json
{
  "success": true,
  "message": "Inventory levels retrieved",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "expectedVersion", "message": "Safe explanation" }]
}
```

Handle `400` validation/cursor/idempotency input, `401` invalid or missing
Bearer token, `403` inactive membership or permission denial, `404` resource not
found in this merchant, `409` stock/version/uniqueness/idempotency conflict,
`429` rate limit, and `503` required infrastructure unavailable. Never retry a
`409` stock operation blindly; refresh the current location-level version first.

## Locations

| Method  | Path                                 | Permission                            | Success                   |
| ------- | ------------------------------------ | ------------------------------------- | ------------------------- |
| `GET`   | `/locations?activeOnly=true          | false`                                | `merchant.inventory.read` | `200 { items }` |
| `POST`  | `/locations`                         | `merchant.inventory.locations.manage` | `201 Location`            |
| `PATCH` | `/locations/:locationId`             | `merchant.inventory.locations.manage` | `200 Location`            |
| `POST`  | `/locations/:locationId/set-default` | `merchant.inventory.locations.manage` | `200 Location`            |

Create body:

```json
{
  "code": "WAREHOUSE-2",
  "name": "Quezon City Warehouse",
  "addressSnapshot": "Optional display address",
  "isActive": true,
  "isDefault": false
}
```

`code` is normalized to uppercase and accepts letters, numbers, `-`, and `_`.
PATCH accepts any of these fields, but changing `isDefault` must use the
dedicated endpoint. A default location must be active. A location with stock or
active reservations cannot be deactivated. There is no delete endpoint in Phase

1. The database allows at most one active default location per merchant.

Location response fields are `id`, `merchantId`, `code`, `name`, `isDefault`,
`isActive`, nullable `addressSnapshot`, `createdAt`, and `updatedAt`.

## Levels and variant detail

```http
GET /levels?limit=25&cursor=OPAQUE&locationId=UUID&productId=UUID&variantId=UUID&sku=SKU&barcode=CODE&search=shirt&stockStatus=IN_STOCK&activeOnly=true
GET /variants/:variantId
GET /low-stock?limit=25&cursor=OPAQUE&locationId=UUID&productId=UUID&variantId=UUID&sku=SKU&barcode=CODE&search=shirt&activeOnly=true
```

`limit` is 1-100 and defaults to 25. `stockStatus` is `IN_STOCK`,
`LOW_STOCK`, or `OUT_OF_STOCK`. Cursors are opaque: return `nextCursor`
unchanged on the next call. `/low-stock` includes both low and out-of-stock
variants and ignores a supplied stock-status filter.

Level page:

```json
{
  "items": [
    {
      "merchantId": "UUID",
      "locationId": "UUID_OR_NULL",
      "productId": "UUID",
      "productName": "Linen Dress",
      "variantId": "UUID",
      "variantName": "Black / Medium",
      "sku": "DRESS-BLK-M",
      "barcode": null,
      "isActive": true,
      "onHand": 10,
      "reserved": 2,
      "available": 8,
      "reorderThreshold": 3,
      "version": 4,
      "stockStatus": "IN_STOCK",
      "updatedAt": "2026-07-31T00:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Without `locationId`, quantities are aggregated across locations and `version`
is `null`. With `locationId`, use the returned integer `version` as
`expectedVersion` for the next adjustment. Missing balances appear as zero with
version `0`. Available is always `onHand - reserved`.

`GET /variants/:variantId` returns product/variant identity, aggregate totals,
and one location entry per merchant location. Each location entry contains
`locationId`, code/name, active/default flags, on-hand, reserved, available,
threshold, version, and derived status.

## Manual stock adjustment

```http
POST /adjustments
Idempotency-Key: 8_TO_128_SAFE_CHARACTERS
```

Body:

```json
{
  "locationId": "UUID",
  "variantId": "UUID",
  "operation": "STOCK_IN",
  "quantity": 10,
  "expectedVersion": 0,
  "reason": "Initial stock received",
  "reorderThreshold": 3
}
```

- `STOCK_IN`: quantity must be positive and increases on-hand.
- `STOCK_OUT`: quantity must be positive and decreases on-hand.
- `ADJUSTMENT`: quantity is a signed, non-zero delta.
- `reason` is required (3-500 characters).
- `reorderThreshold` is optional and nonnegative.

Success is `201` and returns `{ movement, balance }`. `movement` includes the
immutable before/after on-hand and reserved snapshots, signed `deltaOnHand`,
reason, actor, and timestamp. `balance` uses the level format above with its new
version.

The same idempotency key plus identical body returns the original committed
movement without changing stock again. The same key with a different body
returns `409`. Simultaneous operations lock the PostgreSQL balance row and use a
version compare-and-swap. A stale version, negative resulting on-hand, or
on-hand below reserved returns `409` and creates no movement.

## Movement history

```http
GET /movements?limit=25&cursor=OPAQUE&locationId=UUID&productId=UUID&variantId=UUID&movementType=STOCK_IN&createdFrom=ISO_DATE&createdTo=ISO_DATE
```

`movementType` accepts `STOCK_IN`, `STOCK_OUT`, or `ADJUSTMENT`. Results are
newest first and return `{ items, nextCursor }`. Movement rows are append-only;
the client must never expect an update or delete operation.

## Client refresh rules

After a successful location write, refetch locations. After an adjustment,
refetch the affected variant, level lists, low-stock lists, movement history,
and any merchant catalog/product detail displaying stock. Authoritative balances
and history are never Redis-cached. The backend invalidates reserved future
storefront stock keys and affected public catalog product/list keys after a
committed adjustment.

Checkout reservations, order deduction/restocking, transfers, and location
deletion are deliberately outside Phase 1.
