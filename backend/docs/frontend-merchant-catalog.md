# Frontend contract: Merchant Catalog Phase 1

Base path:

```text
/api/merchants/:merchantId/catalog
```

Every endpoint requires an access token and an active membership in the route
merchant:

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

Do not infer access from a merchant ID stored on the device. A `403` means the
current account is not an active member or does not have the required permission.

## Permissions

- `products.read`: brands, categories, collections, product list, and product details.
- `products.write`: brand, collection, product, option, value, and variant writes.
- `products.publish`: publish, deactivate, and archive lifecycle actions.

OWNER, merchant ADMIN, and MANAGER receive all three permissions. Catalog staff
receive read and write, but not publish. Re-run `npm run auth:bootstrap` after
deploying this milestone; the command adds only missing permission records and
mappings.

## Response envelope

Success:

```json
{
  "success": true,
  "message": "Product retrieved",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "slug", "message": "Safe explanation" }]
}
```

Common statuses are `400` invalid DTO/cursor/idempotency key/publication data,
`401` missing or invalid Bearer token, `403` permission or membership denial,
`404` resource not found within this merchant, `409` uniqueness, lifecycle, or
idempotency conflict, `429` rate limit, and `503` infrastructure unavailable.
Cross-merchant IDs intentionally behave as unavailable and are never resolved
outside the route merchant.

## Reference catalog

| Method  | Endpoint                     | Body/query                                         | Success          |
| ------- | ---------------------------- | -------------------------------------------------- | ---------------- |
| `GET`   | `/brands`                    | `search?`, `limit?` (1-100)                        | `200 { items }`  |
| `POST`  | `/brands`                    | `name`, `slug`, optional `description`, `isActive` | `201 Brand`      |
| `GET`   | `/brands/:brandId`           | none                                               | `200 Brand`      |
| `PATCH` | `/brands/:brandId`           | any writable brand field                           | `200 Brand`      |
| `GET`   | `/categories`                | `search?`, `limit?`, `activeOnly?`                 | `200 { items }`  |
| `GET`   | `/categories/:categoryId`    | none                                               | `200 Category`   |
| `GET`   | `/collections`               | `search?`, `limit?`                                | `200 { items }`  |
| `POST`  | `/collections`               | below                                              | `201 Collection` |
| `GET`   | `/collections/:collectionId` | none                                               | `200 Collection` |
| `PATCH` | `/collections/:collectionId` | any writable collection field                      | `200 Collection` |

Categories are platform-managed global taxonomy in the current schema and are
read-only to merchants. Brand and collection IDs are always merchant-owned.

Collection write body:

```json
{
  "name": "Summer Edit",
  "slug": "summer-edit",
  "description": "Optional",
  "isActive": true,
  "startsAt": "2026-08-01T00:00:00.000Z",
  "endsAt": "2026-09-01T00:00:00.000Z",
  "sortOrder": 0,
  "productIds": ["MERCHANT_PRODUCT_UUID"]
}
```

Dates and fields are optional on PATCH. When supplied, every `productId` must
belong to the route merchant and `endsAt` must be later than `startsAt`.

## Products

| Method  | Endpoint               | Permission       | Success                     |
| ------- | ---------------------- | ---------------- | --------------------------- |
| `POST`  | `/products`            | `products.write` | `201 ProductDetails`        |
| `GET`   | `/products`            | `products.read`  | `200 { items, nextCursor }` |
| `GET`   | `/products/:productId` | `products.read`  | `200 ProductDetails`        |
| `PATCH` | `/products/:productId` | `products.write` | `200 ProductDetails`        |

Creation requires `Idempotency-Key` with 8-128 characters from
`A-Z a-z 0-9 . _ : -`. Reusing a key with the identical body returns the original
product. Reusing it with a different body returns `409`.

Create-draft body:

```json
{
  "name": "Linen Wrap Dress",
  "slug": "linen-wrap-dress",
  "brandId": "OPTIONAL_MERCHANT_BRAND_UUID",
  "shortDescription": "Optional summary",
  "description": "Full product description",
  "isFeatured": false,
  "categoryIds": ["PLATFORM_CATEGORY_UUID"],
  "primaryCategoryId": "PLATFORM_CATEGORY_UUID"
}
```

The server always creates status `DRAFT`; clients cannot set status directly.
`brandId` must belong to the merchant. Categories must be active. The primary
category must appear in `categoryIds`. PATCH accepts the same mutable fields;
include `categoryIds` whenever changing `primaryCategoryId`.

Product list query:

```text
?limit=25
&cursor=OPAQUE_VALUE
&search=linen
&status=DRAFT|ACTIVE|INACTIVE|ARCHIVED
&categoryId=UUID
&stockStatus=IN_STOCK|LOW_STOCK|OUT_OF_STOCK
```

Do not parse the cursor. Pass `nextCursor` back unchanged. Stock is derived from
inventory balances as `stock_on_hand - stock_reserved`. `OUT_OF_STOCK` is zero or
less, `LOW_STOCK` is positive but at/below the aggregated reorder threshold, and
`IN_STOCK` is above that threshold. Missing balances are out of stock; inventory
adjustment is outside this milestone.

Product details include `categoryIds`, `primaryCategoryId`, `collectionIds`,
`options[].values[]`, `variants[]`, integer-centavo prices, `availableStock`, and
derived `stockStatus`.

## Options, values, and variants

| Method  | Endpoint                                                 | Body                            | Success              |
| ------- | -------------------------------------------------------- | ------------------------------- | -------------------- |
| `POST`  | `/products/:productId/options`                           | `name`, optional `displayOrder` | `201 ProductDetails` |
| `PATCH` | `/products/:productId/options/:optionId`                 | same fields                     | `200 ProductDetails` |
| `POST`  | `/products/:productId/options/:optionId/values`          | below                           | `201 ProductDetails` |
| `PATCH` | `/products/:productId/options/:optionId/values/:valueId` | same fields                     | `200 ProductDetails` |
| `POST`  | `/products/:productId/variants`                          | below                           | `201 ProductDetails` |
| `PATCH` | `/products/:productId/variants/:variantId`               | same fields                     | `200 ProductDetails` |

Option-value body:

```json
{
  "value": "black",
  "displayLabel": "Black",
  "swatchHex": "#000000",
  "displayOrder": 0
}
```

Variant body:

```json
{
  "name": "Black / Medium",
  "sku": "DRESS-BLK-M",
  "barcode": "OPTIONAL",
  "priceCentavos": 129900,
  "compareAtPriceCentavos": 159900,
  "isDefault": true,
  "isActive": true,
  "optionValueIds": ["COLOR_VALUE_UUID", "SIZE_VALUE_UUID"]
}
```

Money is integer Philippine centavos. The compare-at price, when present, must
exceed the selling price. SKU, barcode, and option combination are unique within
the merchant/product constraints. Exactly one value per product option is
required; the server derives the option signature and never trusts one from the
client. The first variant becomes default unless explicitly superseded.

Option/value creation and structural variant changes require a `DRAFT` or
`INACTIVE` product. On an active product, non-structural variant fields such as
name, SKU, barcode, and price may be updated only while the product remains
publishable.

## Lifecycle

All lifecycle requests require `products.publish` and a new/replay-safe
`Idempotency-Key`:

| Method | Endpoint                          | Allowed transition           | Success              |
| ------ | --------------------------------- | ---------------------------- | -------------------- |
| `POST` | `/products/:productId/publish`    | `DRAFT/INACTIVE -> ACTIVE`   | `200 ProductDetails` |
| `POST` | `/products/:productId/deactivate` | `ACTIVE -> INACTIVE`         | `200 ProductDetails` |
| `POST` | `/products/:productId/archive`    | `DRAFT/INACTIVE -> ARCHIVED` | `200 ProductDetails` |

Publication requires:

- non-empty full description;
- at least one active category;
- at least one active variant;
- exactly one active default variant;
- every option has a value;
- every active variant has a price greater than zero;
- every active variant selects exactly one value for every option.

Images and initial stock are deliberately not publication requirements because
uploads and inventory adjustment are future milestones. Archived products cannot
be edited or reactivated.

## Client cache behavior

PostgreSQL is authoritative. Merchant-private reads and drafts are never stored
in Redis. Every write invalidates the reserved merchant published-list,
collection, and affected published-product cache keys so a future public catalog
cannot serve stale data. Frontend query caches should invalidate the merchant
product list, product detail, brand list, and collection list after successful
writes.
