# Customer storefront API contract

All storefront routes are public `GET` requests under `/api/storefront`. Do not
send an access token, merchant ID header, storage path, or Supabase credential.
Responses use the standard `{ success, message, data }` envelope.

## Endpoints

| Endpoint                                 | Query                                                             | Result                                                         |
| ---------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| `GET /products`                          | Product-list query                                                | Published product page                                         |
| `GET /products/:productSlug`             | None                                                              | Product, categories, collections, options, and active variants |
| `GET /categories`                        | `limit`, `search`                                                 | Active global categories                                       |
| `GET /categories/:categorySlug/products` | Product-list query except `categorySlug` is taken from the path   | Published category product page                                |
| `GET /collections`                       | `limit`, `search`, `merchantSlug`                                 | Active, currently visible collections                          |
| `GET /collections/:collectionSlug`       | Product-list query except `collectionSlug` is taken from the path | Collection and published product page                          |
| `GET /brands`                            | `limit`, `search`, `merchantSlug`                                 | Active brands from approved merchants                          |
| `GET /merchants/:merchantSlug`           | None                                                              | Approved merchant's public profile                             |
| `GET /merchants/:merchantSlug/products`  | Product-list query except `merchantSlug` is taken from the path   | Merchant product page                                          |

Product-list query parameters:

- `cursor`: opaque `nextCursor` from the previous response; reuse it only with
  the same route, filters, and sort.
- `limit`: integer `1..50`, default `20`.
- `search`: trimmed text, maximum 100 characters.
- `categorySlug`, `collectionSlug`, `merchantSlug`: lowercase URL slugs.
- `brandId`: brand UUID. Brand slugs are merchant-scoped, so filtering uses the
  stable brand ID returned by `GET /brands`.
- `minPriceCentavos`, `maxPriceCentavos`: nonnegative integer PHP centavos;
  minimum cannot exceed maximum.
- `inStockOnly`: `true` or `false`.
- `featured`: `true` or `false`.
- `sort`: `recommended`, `latest`, `price_asc`, `price_desc`, or `name`.

`recommended` is deterministic Phase 1 ordering (featured products first, then
newest); it is not personalized recommendation logic.

## Product response

```json
{
  "success": true,
  "message": "Storefront products retrieved",
  "data": {
    "items": [
      {
        "productId": "UUID",
        "name": "Linen Dress",
        "slug": "lumiere-linen-dress",
        "shortDescription": "Summer linen",
        "isFeatured": true,
        "publishedAt": "ISO_DATE",
        "currency": "PHP",
        "minPriceCentavos": 25000,
        "maxPriceCentavos": 30000,
        "stockStatus": "IN_STOCK",
        "merchant": { "id": "UUID", "slug": "lumiere", "displayName": "Lumiere" },
        "brand": { "id": "UUID", "name": "Studio", "slug": "studio", "description": null },
        "primaryImage": {
          "id": "UUID",
          "altText": "Black linen dress",
          "signedUrl": "SHORT_LIVED_HTTPS_URL",
          "expiresAt": "ISO_DATE"
        }
      }
    ],
    "nextCursor": "OPAQUE_CURSOR_OR_NULL"
  }
}
```

Product details add `description`, `categories`, `collections`, `options`, and
active `variants`. A variant exposes `id`, `name`, integer-centavo prices,
`isDefault`, `optionValueIds`, and `stockStatus`; it does not expose merchant SKU,
barcode, storage path, or exact stock quantity.

`minPriceCentavos` and `maxPriceCentavos` aggregate active variants only. Stock is
computed from all balances as available stock (`onHand - reserved`):

- `OUT_OF_STOCK`: no available units.
- `LOW_STOCK`: units remain but every stocked balance is at or below its reorder
  threshold.
- `IN_STOCK`: at least one balance is above its reorder threshold.

Only active, published, non-deleted products belonging to active verified
merchants are returned. Images must be confirmed; if a primary object is missing,
`primaryImage` is `null`. Signed read URLs expire after five minutes. Treat them
as temporary display URLs and refresh them by reading the storefront endpoint
again; never persist them as product identity.

## Caching and errors

Product-list/common-query cache TTL is 30 seconds, product/merchant detail is 60
seconds, and category/collection/brand directories are 120 seconds. Cache keys
include filters, cursor, catalog revision, and inventory revision. Catalog,
image, merchant, and inventory writes advance the relevant revision so stale
entries are no longer read. PostgreSQL remains authoritative.

Handle:

- `400` invalid filter, slug, cursor, price range, sort, or unknown parameter.
- `404` product, collection, category, or merchant is absent or not publicly
  visible. Do not infer whether a draft/private resource exists.
- `429` public rate limit; respect `Retry-After` and `RateLimit-*` headers.
- `503` database, Redis request protection, or signed-image service is currently
  unavailable.

There is no storefront `401`/`403` flow because these endpoints are public.
