CREATE TYPE "public"."account_status" AS ENUM('PENDING_VERIFICATION', 'ACTIVE', 'DISABLED');--> statement-breakpoint
CREATE TYPE "public"."cart_status" AS ENUM('ACTIVE', 'MERGED', 'CONVERTED', 'ABANDONED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."discount_application_method" AS ENUM('CODE', 'AUTOMATIC');--> statement-breakpoint
CREATE TYPE "public"."discount_redemption_status" AS ENUM('APPLIED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('FIXED_AMOUNT', 'PERCENTAGE', 'FREE_SHIPPING');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_status" AS ENUM('PENDING', 'PACKING', 'SHIPPED', 'DELIVERED', 'RETURNED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."inventory_movement_type" AS ENUM('STOCK_IN', 'STOCK_OUT', 'ORDER', 'CANCELLATION', 'ADJUSTMENT', 'RETURN', 'RESERVATION_HOLD', 'RESERVATION_RELEASE', 'TRANSFER_IN', 'TRANSFER_OUT');--> statement-breakpoint
CREATE TYPE "public"."inventory_reference_type" AS ENUM('MANUAL', 'ORDER', 'RESERVATION', 'REFUND', 'TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."inventory_reservation_status" AS ENUM('ACTIVE', 'CONVERTED', 'RELEASED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."marketplace_order_status" AS ENUM('PENDING', 'CONFIRMED', 'PARTIALLY_FULFILLED', 'FULFILLED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."merchant_address_type" AS ENUM('REGISTERED', 'BUSINESS', 'RETURN');--> statement-breakpoint
CREATE TYPE "public"."merchant_invitation_status" AS ENUM('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."merchant_ledger_entry_type" AS ENUM('SALE', 'COMMISSION', 'REFUND', 'COMMISSION_REVERSAL', 'PAYOUT', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."merchant_membership_status" AS ENUM('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."merchant_order_status" AS ENUM('PENDING', 'CONFIRMED', 'PROCESSING', 'PARTIALLY_SHIPPED', 'SHIPPED', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."merchant_payout_status" AS ENUM('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."merchant_status" AS ENUM('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."merchant_verification_status" AS ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."order_address_type" AS ENUM('SHIPPING', 'BILLING');--> statement-breakpoint
CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PROCESSING', 'RETRY', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."payment_allocation_status" AS ENUM('PENDING', 'ALLOCATED', 'SETTLED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH_ON_DELIVERY', 'ONLINE_PAYMENT');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('PENDING', 'PUBLISHED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('PLATFORM', 'MERCHANT');--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(150) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"action" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_resource_action_unique" UNIQUE("resource","action"),
	CONSTRAINT "permissions_required_text_check" CHECK (
        length(btrim("permissions"."key")) > 0
        and length(btrim("permissions"."resource")) > 0
        and length(btrim("permissions"."action")) > 0
      )
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"scope" "role_scope" NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "roles_id_scope_unique" UNIQUE("id","scope"),
	CONSTRAINT "roles_key_name_not_empty_check" CHECK (length(btrim("roles"."key")) > 0 and length(btrim("roles"."name")) > 0)
);
--> statement-breakpoint
CREATE TABLE "user_platform_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"role_scope" "role_scope" DEFAULT 'PLATFORM' NOT NULL,
	"assigned_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_platform_roles_pk" PRIMARY KEY("user_id","role_id"),
	CONSTRAINT "user_platform_roles_scope_check" CHECK ("user_platform_roles"."role_scope" = 'PLATFORM')
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid,
	"actor_user_id" uuid,
	"action" varchar(150) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"before_data" jsonb,
	"after_data" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_id" varchar(150),
	"correlation_id" varchar(150),
	"ip_address" varchar(64),
	"user_agent" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_logs_required_text_check" CHECK (
        length(btrim("audit_logs"."action")) > 0
        and length(btrim("audit_logs"."entity_type")) > 0
      ),
	CONSTRAINT "audit_logs_json_shape_check" CHECK (
        ("audit_logs"."before_data" is null or jsonb_typeof("audit_logs"."before_data") = 'object')
        and ("audit_logs"."after_data" is null or jsonb_typeof("audit_logs"."after_data") = 'object')
        and jsonb_typeof("audit_logs"."metadata") = 'object'
      )
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cart_items_cart_variant_unique" UNIQUE("cart_id","variant_id"),
	CONSTRAINT "cart_items_quantity_check" CHECK ("cart_items"."quantity" between 1 and 999)
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"guest_token_hash" char(64),
	"status" "cart_status" DEFAULT 'ACTIVE' NOT NULL,
	"merged_into_cart_id" uuid,
	"expires_at" timestamp with time zone,
	"converted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "carts_exactly_one_owner_check" CHECK (
        ("carts"."user_id" is not null and "carts"."guest_token_hash" is null)
        or ("carts"."user_id" is null and "carts"."guest_token_hash" is not null)
      ),
	CONSTRAINT "carts_guest_requires_expiry_check" CHECK ("carts"."guest_token_hash" is null or "carts"."expires_at" is not null),
	CONSTRAINT "carts_guest_token_hash_format_check" CHECK ("carts"."guest_token_hash" is null or "carts"."guest_token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "carts_merged_target_check" CHECK (
        ("carts"."status" = 'MERGED' and "carts"."merged_into_cart_id" is not null)
        or ("carts"."status" <> 'MERGED' and "carts"."merged_into_cart_id" is null)
      ),
	CONSTRAINT "carts_converted_at_check" CHECK (
        ("carts"."status" = 'CONVERTED' and "carts"."converted_at" is not null)
        or ("carts"."status" <> 'CONVERTED' and "carts"."converted_at" is null)
      ),
	CONSTRAINT "carts_merge_not_self_check" CHECK ("carts"."merged_into_cart_id" is null or "carts"."merged_into_cart_id" <> "carts"."id")
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"user_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wishlist_items_pk" PRIMARY KEY("user_id","merchant_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"logo_storage_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"deleted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "brands_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "brands_merchant_slug_unique" UNIQUE("merchant_id","slug"),
	CONSTRAINT "brands_name_slug_not_empty_check" CHECK (length(btrim("brands"."name")) > 0 and length(btrim("brands"."slug")) > 0)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"name" varchar(150) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"image_storage_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"deleted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug"),
	CONSTRAINT "categories_name_slug_not_empty_check" CHECK (length(btrim("categories"."name")) > 0 and length(btrim("categories"."slug")) > 0),
	CONSTRAINT "categories_sort_order_check" CHECK ("categories"."sort_order" >= 0),
	CONSTRAINT "categories_parent_not_self_check" CHECK ("categories"."parent_id" is null or "categories"."parent_id" <> "categories"."id")
);
--> statement-breakpoint
CREATE TABLE "collection_products" (
	"merchant_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_products_pk" PRIMARY KEY("merchant_id","collection_id","product_id"),
	CONSTRAINT "collection_products_sort_order_check" CHECK ("collection_products"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(180) NOT NULL,
	"description" text,
	"image_storage_path" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"deleted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "collections_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "collections_merchant_slug_unique" UNIQUE("merchant_id","slug"),
	CONSTRAINT "collections_name_slug_not_empty_check" CHECK (length(btrim("collections"."name")) > 0 and length(btrim("collections"."slug")) > 0),
	CONSTRAINT "collections_sort_order_check" CHECK ("collections"."sort_order" >= 0),
	CONSTRAINT "collections_valid_window_check" CHECK ("collections"."starts_at" is null or "collections"."ends_at" is null or "collections"."ends_at" > "collections"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_pk" PRIMARY KEY("merchant_id","product_id","category_id"),
	CONSTRAINT "product_categories_sort_order_check" CHECK ("product_categories"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"public_url" text,
	"alt_text" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_images_storage_path_unique" UNIQUE("storage_path"),
	CONSTRAINT "product_images_storage_path_not_empty_check" CHECK (length(btrim("product_images"."storage_path")) > 0),
	CONSTRAINT "product_images_sort_order_check" CHECK ("product_images"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"value" varchar(100) NOT NULL,
	"display_label" varchar(100) NOT NULL,
	"swatch_hex" varchar(7),
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_option_values_id_product_option_merchant_unique" UNIQUE("id","product_id","option_id","merchant_id"),
	CONSTRAINT "product_option_values_text_not_empty_check" CHECK (
        length(btrim("product_option_values"."value")) > 0
        and length(btrim("product_option_values"."display_label")) > 0
      ),
	CONSTRAINT "product_option_values_swatch_hex_check" CHECK ("product_option_values"."swatch_hex" is null or "product_option_values"."swatch_hex" ~ '^#[0-9A-Fa-f]{6}$'),
	CONSTRAINT "product_option_values_display_order_check" CHECK ("product_option_values"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_options_id_product_merchant_unique" UNIQUE("id","product_id","merchant_id"),
	CONSTRAINT "product_options_name_not_empty_check" CHECK (length(btrim("product_options"."name")) > 0),
	CONSTRAINT "product_options_display_order_check" CHECK ("product_options"."display_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"barcode" varchar(100),
	"option_signature" text NOT NULL,
	"price_centavos" integer NOT NULL,
	"compare_at_price_centavos" integer,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"deleted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "product_variants_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "product_variants_id_product_merchant_unique" UNIQUE("id","product_id","merchant_id"),
	CONSTRAINT "product_variants_product_signature_unique" UNIQUE("merchant_id","product_id","option_signature"),
	CONSTRAINT "product_variants_required_text_check" CHECK (
        length(btrim("product_variants"."name")) > 0
        and length(btrim("product_variants"."sku")) > 0
        and length(btrim("product_variants"."option_signature")) > 0
      ),
	CONSTRAINT "product_variants_barcode_not_empty_check" CHECK ("product_variants"."barcode" is null or length(btrim("product_variants"."barcode")) > 0),
	CONSTRAINT "product_variants_price_check" CHECK ("product_variants"."price_centavos" >= 0),
	CONSTRAINT "product_variants_compare_at_price_check" CHECK (
        "product_variants"."compare_at_price_centavos" is null
        or "product_variants"."compare_at_price_centavos" > "product_variants"."price_centavos"
      )
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"brand_id" uuid,
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"short_description" varchar(500),
	"description" text,
	"status" "product_status" DEFAULT 'DRAFT' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"deleted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "products_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "products_merchant_slug_unique" UNIQUE("merchant_id","slug"),
	CONSTRAINT "products_name_slug_not_empty_check" CHECK (length(btrim("products"."name")) > 0 and length(btrim("products"."slug")) > 0),
	CONSTRAINT "products_active_requires_published_at_check" CHECK ("products"."status" <> 'ACTIVE' or "products"."published_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "variant_option_values" (
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variant_option_values_pk" PRIMARY KEY("merchant_id","variant_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"label" varchar(50) NOT NULL,
	"recipient_name" varchar(150) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"address_line_1" varchar(255) NOT NULL,
	"address_line_2" varchar(255),
	"barangay" varchar(150),
	"city" varchar(150) NOT NULL,
	"province" varchar(150) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country_code" char(2) DEFAULT 'PH' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "addresses_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "addresses_required_text_check" CHECK (
        length(btrim("addresses"."label")) > 0
        and length(btrim("addresses"."recipient_name")) > 0
        and length(btrim("addresses"."phone")) > 0
        and length(btrim("addresses"."address_line_1")) > 0
        and length(btrim("addresses"."city")) > 0
        and length(btrim("addresses"."province")) > 0
        and length(btrim("addresses"."postal_code")) > 0
      ),
	CONSTRAINT "addresses_country_code_check" CHECK ("addresses"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" varchar(120),
	"first_name" varchar(100),
	"last_name" varchar(100),
	"phone" varchar(32),
	"avatar_storage_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_display_name_not_empty_check" CHECK ("user_profiles"."display_name" is null or length(btrim("user_profiles"."display_name")) > 0),
	CONSTRAINT "user_profiles_first_name_not_empty_check" CHECK ("user_profiles"."first_name" is null or length(btrim("user_profiles"."first_name")) > 0),
	CONSTRAINT "user_profiles_last_name_not_empty_check" CHECK ("user_profiles"."last_name" is null or length(btrim("user_profiles"."last_name")) > 0),
	CONSTRAINT "user_profiles_phone_not_empty_check" CHECK ("user_profiles"."phone" is null or length(btrim("user_profiles"."phone")) > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"password_hash" text NOT NULL,
	"status" "account_status" DEFAULT 'PENDING_VERIFICATION' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"status_changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_normalized_check" CHECK ("users"."email" = lower(btrim("users"."email")) and length("users"."email") > 0),
	CONSTRAINT "users_password_hash_not_empty_check" CHECK (length(btrim("users"."password_hash")) > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_balances" (
	"merchant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"stock_on_hand" integer DEFAULT 0 NOT NULL,
	"stock_reserved" integer DEFAULT 0 NOT NULL,
	"reorder_threshold" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_balances_pk" PRIMARY KEY("merchant_id","location_id","variant_id"),
	CONSTRAINT "inventory_balances_nonnegative_check" CHECK (
        "inventory_balances"."stock_on_hand" >= 0
        and "inventory_balances"."stock_reserved" >= 0
        and "inventory_balances"."reorder_threshold" >= 0
        and "inventory_balances"."version" >= 0
      ),
	CONSTRAINT "inventory_balances_reserved_not_above_on_hand_check" CHECK ("inventory_balances"."stock_reserved" <= "inventory_balances"."stock_on_hand")
);
--> statement-breakpoint
CREATE TABLE "inventory_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"code" varchar(100) NOT NULL,
	"name" varchar(150) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"address_snapshot" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_locations_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "inventory_locations_code_name_not_empty_check" CHECK (length(btrim("inventory_locations"."code")) > 0 and length(btrim("inventory_locations"."name")) > 0),
	CONSTRAINT "inventory_locations_default_requires_active_check" CHECK (not "inventory_locations"."is_default" or "inventory_locations"."is_active")
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"movement_type" "inventory_movement_type" NOT NULL,
	"delta_on_hand" integer DEFAULT 0 NOT NULL,
	"delta_reserved" integer DEFAULT 0 NOT NULL,
	"before_on_hand" integer NOT NULL,
	"after_on_hand" integer NOT NULL,
	"before_reserved" integer NOT NULL,
	"after_reserved" integer NOT NULL,
	"reference_type" "inventory_reference_type",
	"reference_id" uuid,
	"idempotency_key" varchar(150) NOT NULL,
	"note" text,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_movements_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "inventory_movements_nonzero_delta_check" CHECK ("inventory_movements"."delta_on_hand" <> 0 or "inventory_movements"."delta_reserved" <> 0),
	CONSTRAINT "inventory_movements_on_hand_arithmetic_check" CHECK ("inventory_movements"."after_on_hand" = "inventory_movements"."before_on_hand" + "inventory_movements"."delta_on_hand"),
	CONSTRAINT "inventory_movements_reserved_arithmetic_check" CHECK ("inventory_movements"."after_reserved" = "inventory_movements"."before_reserved" + "inventory_movements"."delta_reserved"),
	CONSTRAINT "inventory_movements_nonnegative_balances_check" CHECK (
        "inventory_movements"."before_on_hand" >= 0
        and "inventory_movements"."after_on_hand" >= 0
        and "inventory_movements"."before_reserved" >= 0
        and "inventory_movements"."after_reserved" >= 0
      ),
	CONSTRAINT "inventory_movements_reserved_not_above_on_hand_check" CHECK (
        "inventory_movements"."before_reserved" <= "inventory_movements"."before_on_hand"
        and "inventory_movements"."after_reserved" <= "inventory_movements"."after_on_hand"
      ),
	CONSTRAINT "inventory_movements_reference_pair_check" CHECK (
        ("inventory_movements"."reference_type" is null and "inventory_movements"."reference_id" is null)
        or ("inventory_movements"."reference_type" is not null and "inventory_movements"."reference_id" is not null)
      ),
	CONSTRAINT "inventory_movements_idempotency_key_not_empty_check" CHECK (length(btrim("inventory_movements"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"merchant_order_id" uuid,
	"idempotency_key" varchar(150) NOT NULL,
	"quantity" integer NOT NULL,
	"status" "inventory_reservation_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"converted_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"release_reason" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_reservations_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "inventory_reservations_quantity_check" CHECK ("inventory_reservations"."quantity" > 0),
	CONSTRAINT "inventory_reservations_idempotency_key_not_empty_check" CHECK (length(btrim("inventory_reservations"."idempotency_key")) > 0),
	CONSTRAINT "inventory_reservations_expiry_after_creation_check" CHECK ("inventory_reservations"."expires_at" > "inventory_reservations"."created_at"),
	CONSTRAINT "inventory_reservations_status_fields_check" CHECK (
        (
          "inventory_reservations"."status" = 'ACTIVE'
          and "inventory_reservations"."merchant_order_id" is null
          and "inventory_reservations"."converted_at" is null
          and "inventory_reservations"."released_at" is null
        )
        or (
          "inventory_reservations"."status" = 'CONVERTED'
          and "inventory_reservations"."merchant_order_id" is not null
          and "inventory_reservations"."converted_at" is not null
          and "inventory_reservations"."released_at" is null
        )
        or (
          "inventory_reservations"."status" in ('RELEASED', 'EXPIRED')
          and "inventory_reservations"."converted_at" is null
          and "inventory_reservations"."released_at" is not null
        )
      )
);
--> statement-breakpoint
CREATE TABLE "merchant_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"address_type" "merchant_address_type" NOT NULL,
	"contact_name" varchar(150) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"address_line_1" varchar(255) NOT NULL,
	"address_line_2" varchar(255),
	"barangay" varchar(150),
	"city" varchar(150) NOT NULL,
	"province" varchar(150) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country_code" char(2) DEFAULT 'PH' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "merchant_addresses_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "merchant_addresses_required_text_check" CHECK (
        length(btrim("merchant_addresses"."contact_name")) > 0
        and length(btrim("merchant_addresses"."phone")) > 0
        and length(btrim("merchant_addresses"."address_line_1")) > 0
        and length(btrim("merchant_addresses"."city")) > 0
        and length(btrim("merchant_addresses"."province")) > 0
        and length(btrim("merchant_addresses"."postal_code")) > 0
      ),
	CONSTRAINT "merchant_addresses_country_code_check" CHECK ("merchant_addresses"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "merchant_invitation_roles" (
	"invitation_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"role_scope" "role_scope" DEFAULT 'MERCHANT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_invitation_roles_pk" PRIMARY KEY("invitation_id","role_id"),
	CONSTRAINT "merchant_invitation_roles_scope_check" CHECK ("merchant_invitation_roles"."role_scope" = 'MERCHANT')
);
--> statement-breakpoint
CREATE TABLE "merchant_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"email" varchar(320) NOT NULL,
	"token_hash" char(64) NOT NULL,
	"status" "merchant_invitation_status" DEFAULT 'PENDING' NOT NULL,
	"invited_by_user_id" uuid,
	"accepted_by_membership_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_invitations_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "merchant_invitations_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "merchant_invitations_email_normalized_check" CHECK ("merchant_invitations"."email" = lower(btrim("merchant_invitations"."email")) and length("merchant_invitations"."email") > 0),
	CONSTRAINT "merchant_invitations_token_hash_check" CHECK ("merchant_invitations"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "merchant_invitations_expiry_check" CHECK ("merchant_invitations"."expires_at" > "merchant_invitations"."created_at"),
	CONSTRAINT "merchant_invitations_acceptance_check" CHECK (
        (
          "merchant_invitations"."status" = 'ACCEPTED'
          and "merchant_invitations"."accepted_at" is not null
          and "merchant_invitations"."accepted_by_membership_id" is not null
        )
        or (
          "merchant_invitations"."status" <> 'ACCEPTED'
          and "merchant_invitations"."accepted_at" is null
          and "merchant_invitations"."accepted_by_membership_id" is null
        )
      ),
	CONSTRAINT "merchant_invitations_revocation_check" CHECK (
        ("merchant_invitations"."status" = 'REVOKED' and "merchant_invitations"."revoked_at" is not null)
        or ("merchant_invitations"."status" <> 'REVOKED' and "merchant_invitations"."revoked_at" is null)
      )
);
--> statement-breakpoint
CREATE TABLE "merchant_membership_roles" (
	"membership_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"role_scope" "role_scope" DEFAULT 'MERCHANT' NOT NULL,
	"assigned_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_membership_roles_pk" PRIMARY KEY("membership_id","role_id"),
	CONSTRAINT "merchant_membership_roles_scope_check" CHECK ("merchant_membership_roles"."role_scope" = 'MERCHANT')
);
--> statement-breakpoint
CREATE TABLE "merchant_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "merchant_membership_status" DEFAULT 'INVITED' NOT NULL,
	"invited_by_user_id" uuid,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "merchant_memberships_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "merchant_memberships_merchant_user_unique" UNIQUE("merchant_id","user_id"),
	CONSTRAINT "merchant_memberships_joined_at_check" CHECK ("merchant_memberships"."status" <> 'ACTIVE' or "merchant_memberships"."joined_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "merchant_profiles" (
	"merchant_id" uuid PRIMARY KEY NOT NULL,
	"description" text,
	"support_email" varchar(320),
	"support_phone" varchar(32),
	"website_url" text,
	"logo_storage_path" text,
	"banner_storage_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_profiles_support_email_normalized_check" CHECK (
        "merchant_profiles"."support_email" is null
        or (
          "merchant_profiles"."support_email" = lower(btrim("merchant_profiles"."support_email"))
          and length("merchant_profiles"."support_email") > 0
        )
      )
);
--> statement-breakpoint
CREATE TABLE "merchant_staff_profiles" (
	"membership_id" uuid PRIMARY KEY NOT NULL,
	"merchant_id" uuid NOT NULL,
	"employee_code" varchar(100),
	"job_title" varchar(150),
	"work_phone" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_staff_profiles_employee_code_not_empty_check" CHECK ("merchant_staff_profiles"."employee_code" is null or length(btrim("merchant_staff_profiles"."employee_code")) > 0)
);
--> statement-breakpoint
CREATE TABLE "merchant_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"status" "merchant_verification_status" DEFAULT 'PENDING' NOT NULL,
	"document_references" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"submitted_by_user_id" uuid,
	"reviewed_by_user_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_verifications_documents_array_check" CHECK (jsonb_typeof("merchant_verifications"."document_references") = 'array'),
	CONSTRAINT "merchant_verifications_review_fields_check" CHECK (
        (
          "merchant_verifications"."status" in ('VERIFIED', 'REJECTED')
          and "merchant_verifications"."reviewed_at" is not null
          and "merchant_verifications"."reviewed_by_user_id" is not null
        )
        or "merchant_verifications"."status" in ('UNVERIFIED', 'PENDING')
      ),
	CONSTRAINT "merchant_verifications_rejection_reason_check" CHECK (
        "merchant_verifications"."status" <> 'REJECTED'
        or (
          "merchant_verifications"."rejection_reason" is not null
          and length(btrim("merchant_verifications"."rejection_reason")) > 0
        )
      )
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(180) NOT NULL,
	"legal_name" varchar(200) NOT NULL,
	"display_name" varchar(200) NOT NULL,
	"status" "merchant_status" DEFAULT 'PENDING' NOT NULL,
	"verification_status" "merchant_verification_status" DEFAULT 'UNVERIFIED' NOT NULL,
	"currency" char(3) DEFAULT 'PHP' NOT NULL,
	"commission_rate_basis_points" smallint DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"deleted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "merchants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "merchants_required_text_check" CHECK (
        length(btrim("merchants"."slug")) > 0
        and length(btrim("merchants"."legal_name")) > 0
        and length(btrim("merchants"."display_name")) > 0
      ),
	CONSTRAINT "merchants_currency_check" CHECK ("merchants"."currency" = 'PHP'),
	CONSTRAINT "merchants_commission_rate_check" CHECK ("merchants"."commission_rate_basis_points" between 0 and 10000)
);
--> statement-breakpoint
CREATE TABLE "fulfillment_items" (
	"fulfillment_id" uuid NOT NULL,
	"merchant_order_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fulfillment_items_pk" PRIMARY KEY("fulfillment_id","order_item_id"),
	CONSTRAINT "fulfillment_items_quantity_check" CHECK ("fulfillment_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"merchant_order_id" uuid NOT NULL,
	"ship_from_address_id" uuid,
	"status" "fulfillment_status" DEFAULT 'PENDING' NOT NULL,
	"carrier" varchar(100),
	"service" varchar(100),
	"tracking_number" varchar(150),
	"note" text,
	"created_by_user_id" uuid,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fulfillments_id_merchant_order_tenant_unique" UNIQUE("id","merchant_order_id","merchant_id"),
	CONSTRAINT "fulfillments_shipped_at_check" CHECK (
        "fulfillments"."status" not in ('SHIPPED', 'DELIVERED')
        or "fulfillments"."shipped_at" is not null
      ),
	CONSTRAINT "fulfillments_delivered_at_check" CHECK ("fulfillments"."status" <> 'DELIVERED' or "fulfillments"."delivered_at" is not null),
	CONSTRAINT "fulfillments_delivery_order_check" CHECK (
        "fulfillments"."delivered_at" is null
        or ("fulfillments"."shipped_at" is not null and "fulfillments"."delivered_at" >= "fulfillments"."shipped_at")
      )
);
--> statement-breakpoint
CREATE TABLE "merchant_order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_order_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"previous_status" "merchant_order_status",
	"new_status" "merchant_order_status" NOT NULL,
	"changed_by_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_order_status_history_changed_status_check" CHECK ("merchant_order_status_history"."previous_status" is null or "merchant_order_status_history"."previous_status" <> "merchant_order_status_history"."new_status")
);
--> statement-breakpoint
CREATE TABLE "merchant_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"merchant_order_number" varchar(40) NOT NULL,
	"status" "merchant_order_status" DEFAULT 'PENDING' NOT NULL,
	"items_subtotal_centavos" integer NOT NULL,
	"discount_centavos" integer DEFAULT 0 NOT NULL,
	"shipping_centavos" integer DEFAULT 0 NOT NULL,
	"tax_centavos" integer DEFAULT 0 NOT NULL,
	"gross_total_centavos" integer NOT NULL,
	"platform_commission_centavos" integer DEFAULT 0 NOT NULL,
	"merchant_earnings_centavos" integer NOT NULL,
	"refunded_centavos" integer DEFAULT 0 NOT NULL,
	"commission_reversed_centavos" integer DEFAULT 0 NOT NULL,
	"merchant_refund_liability_centavos" integer DEFAULT 0 NOT NULL,
	"net_merchant_earnings_centavos" integer NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_orders_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "merchant_orders_id_order_merchant_unique" UNIQUE("id","order_id","merchant_id"),
	CONSTRAINT "merchant_orders_parent_merchant_unique" UNIQUE("order_id","merchant_id"),
	CONSTRAINT "merchant_orders_number_unique" UNIQUE("merchant_order_number"),
	CONSTRAINT "merchant_orders_number_not_empty_check" CHECK (length(btrim("merchant_orders"."merchant_order_number")) > 0),
	CONSTRAINT "merchant_orders_nonnegative_amounts_check" CHECK (
        "merchant_orders"."items_subtotal_centavos" >= 0
        and "merchant_orders"."discount_centavos" >= 0
        and "merchant_orders"."shipping_centavos" >= 0
        and "merchant_orders"."tax_centavos" >= 0
        and "merchant_orders"."gross_total_centavos" >= 0
        and "merchant_orders"."platform_commission_centavos" >= 0
        and "merchant_orders"."merchant_earnings_centavos" >= 0
        and "merchant_orders"."refunded_centavos" >= 0
        and "merchant_orders"."commission_reversed_centavos" >= 0
        and "merchant_orders"."merchant_refund_liability_centavos" >= 0
        and "merchant_orders"."net_merchant_earnings_centavos" >= 0
      ),
	CONSTRAINT "merchant_orders_total_check" CHECK (
        "merchant_orders"."gross_total_centavos"
        = "merchant_orders"."items_subtotal_centavos"
          - "merchant_orders"."discount_centavos"
          + "merchant_orders"."shipping_centavos"
          + "merchant_orders"."tax_centavos"
      ),
	CONSTRAINT "merchant_orders_discount_not_above_subtotal_check" CHECK ("merchant_orders"."discount_centavos" <= "merchant_orders"."items_subtotal_centavos"),
	CONSTRAINT "merchant_orders_earnings_check" CHECK (
        "merchant_orders"."merchant_earnings_centavos"
        = "merchant_orders"."gross_total_centavos" - "merchant_orders"."platform_commission_centavos"
      ),
	CONSTRAINT "merchant_orders_refund_bounds_check" CHECK (
        "merchant_orders"."refunded_centavos" <= "merchant_orders"."gross_total_centavos"
        and "merchant_orders"."commission_reversed_centavos" <= "merchant_orders"."platform_commission_centavos"
        and "merchant_orders"."merchant_refund_liability_centavos" <= "merchant_orders"."merchant_earnings_centavos"
      ),
	CONSTRAINT "merchant_orders_net_earnings_check" CHECK (
        "merchant_orders"."net_merchant_earnings_centavos"
        = "merchant_orders"."merchant_earnings_centavos" - "merchant_orders"."merchant_refund_liability_centavos"
      ),
	CONSTRAINT "merchant_orders_confirmed_at_check" CHECK (
        "merchant_orders"."status" = 'PENDING'
        or "merchant_orders"."confirmed_at" is not null
        or "merchant_orders"."status" = 'CANCELLED'
      ),
	CONSTRAINT "merchant_orders_cancelled_at_check" CHECK (
        ("merchant_orders"."status" = 'CANCELLED' and "merchant_orders"."cancelled_at" is not null)
        or ("merchant_orders"."status" <> 'CANCELLED' and "merchant_orders"."cancelled_at" is null)
      )
);
--> statement-breakpoint
CREATE TABLE "order_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"address_type" "order_address_type" NOT NULL,
	"label_snapshot" varchar(50),
	"recipient_name" varchar(150) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"address_line_1" varchar(255) NOT NULL,
	"address_line_2" varchar(255),
	"barangay" varchar(150),
	"city" varchar(150) NOT NULL,
	"province" varchar(150) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country_code" char(2) DEFAULT 'PH' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_addresses_order_type_unique" UNIQUE("order_id","address_type"),
	CONSTRAINT "order_addresses_required_text_check" CHECK (
        length(btrim("order_addresses"."recipient_name")) > 0
        and length(btrim("order_addresses"."phone")) > 0
        and length(btrim("order_addresses"."address_line_1")) > 0
        and length(btrim("order_addresses"."city")) > 0
        and length(btrim("order_addresses"."province")) > 0
        and length(btrim("order_addresses"."postal_code")) > 0
      ),
	CONSTRAINT "order_addresses_country_code_check" CHECK ("order_addresses"."country_code" ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"merchant_order_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_name_snapshot" varchar(200) NOT NULL,
	"variant_name_snapshot" varchar(150) NOT NULL,
	"sku_snapshot" varchar(100) NOT NULL,
	"option_values_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"image_storage_path_snapshot" text,
	"image_url_snapshot" text,
	"unit_price_centavos" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_subtotal_centavos" integer NOT NULL,
	"line_discount_centavos" integer DEFAULT 0 NOT NULL,
	"line_tax_centavos" integer DEFAULT 0 NOT NULL,
	"line_total_centavos" integer NOT NULL,
	"platform_commission_centavos" integer DEFAULT 0 NOT NULL,
	"merchant_earnings_centavos" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_items_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "order_items_id_product_merchant_unique" UNIQUE("id","product_id","merchant_id"),
	CONSTRAINT "order_items_id_merchant_order_tenant_unique" UNIQUE("id","merchant_order_id","merchant_id"),
	CONSTRAINT "order_items_merchant_order_line_unique" UNIQUE("merchant_order_id","line_number"),
	CONSTRAINT "order_items_line_number_check" CHECK ("order_items"."line_number" > 0),
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_snapshot_text_check" CHECK (
        length(btrim("order_items"."product_name_snapshot")) > 0
        and length(btrim("order_items"."variant_name_snapshot")) > 0
        and length(btrim("order_items"."sku_snapshot")) > 0
      ),
	CONSTRAINT "order_items_nonnegative_amounts_check" CHECK (
        "order_items"."unit_price_centavos" >= 0
        and "order_items"."line_subtotal_centavos" >= 0
        and "order_items"."line_discount_centavos" >= 0
        and "order_items"."line_tax_centavos" >= 0
        and "order_items"."line_total_centavos" >= 0
        and "order_items"."platform_commission_centavos" >= 0
        and "order_items"."merchant_earnings_centavos" >= 0
      ),
	CONSTRAINT "order_items_subtotal_check" CHECK ("order_items"."line_subtotal_centavos" = "order_items"."unit_price_centavos" * "order_items"."quantity"),
	CONSTRAINT "order_items_discount_check" CHECK ("order_items"."line_discount_centavos" <= "order_items"."line_subtotal_centavos"),
	CONSTRAINT "order_items_total_check" CHECK (
        "order_items"."line_total_centavos"
        = "order_items"."line_subtotal_centavos"
          - "order_items"."line_discount_centavos"
          + "order_items"."line_tax_centavos"
      ),
	CONSTRAINT "order_items_earnings_check" CHECK (
        "order_items"."merchant_earnings_centavos"
        = "order_items"."line_total_centavos" - "order_items"."platform_commission_centavos"
      ),
	CONSTRAINT "order_items_options_object_check" CHECK (jsonb_typeof("order_items"."option_values_snapshot") = 'object')
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"previous_status" "marketplace_order_status",
	"new_status" "marketplace_order_status" NOT NULL,
	"changed_by_user_id" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_status_history_changed_status_check" CHECK ("order_status_history"."previous_status" is null or "order_status_history"."previous_status" <> "order_status_history"."new_status")
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_number" varchar(32) NOT NULL,
	"user_id" uuid NOT NULL,
	"source_cart_id" uuid,
	"source_address_id" uuid,
	"idempotency_key" varchar(100) NOT NULL,
	"customer_email_snapshot" varchar(320) NOT NULL,
	"status" "marketplace_order_status" DEFAULT 'PENDING' NOT NULL,
	"payment_method" "payment_method" NOT NULL,
	"payment_status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"currency" char(3) DEFAULT 'PHP' NOT NULL,
	"items_subtotal_centavos" integer NOT NULL,
	"discount_centavos" integer DEFAULT 0 NOT NULL,
	"shipping_centavos" integer DEFAULT 0 NOT NULL,
	"tax_centavos" integer DEFAULT 0 NOT NULL,
	"total_centavos" integer NOT NULL,
	"customer_note" text,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_order_number_unique" UNIQUE("order_number"),
	CONSTRAINT "orders_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "orders_required_text_check" CHECK (
        length(btrim("orders"."order_number")) > 0
        and length(btrim("orders"."idempotency_key")) > 0
        and length(btrim("orders"."customer_email_snapshot")) > 0
      ),
	CONSTRAINT "orders_nonnegative_amounts_check" CHECK (
        "orders"."items_subtotal_centavos" >= 0
        and "orders"."discount_centavos" >= 0
        and "orders"."shipping_centavos" >= 0
        and "orders"."tax_centavos" >= 0
        and "orders"."total_centavos" >= 0
      ),
	CONSTRAINT "orders_discount_not_above_subtotal_check" CHECK ("orders"."discount_centavos" <= "orders"."items_subtotal_centavos"),
	CONSTRAINT "orders_total_check" CHECK (
        "orders"."total_centavos"
        = "orders"."items_subtotal_centavos"
          - "orders"."discount_centavos"
          + "orders"."shipping_centavos"
          + "orders"."tax_centavos"
      ),
	CONSTRAINT "orders_currency_check" CHECK ("orders"."currency" = 'PHP'),
	CONSTRAINT "orders_cancelled_at_check" CHECK (
        ("orders"."status" = 'CANCELLED' and "orders"."cancelled_at" is not null)
        or ("orders"."status" <> 'CANCELLED' and "orders"."cancelled_at" is null)
      )
);
--> statement-breakpoint
CREATE TABLE "merchant_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"merchant_order_id" uuid,
	"payment_allocation_id" uuid,
	"refund_id" uuid,
	"entry_type" "merchant_ledger_entry_type" NOT NULL,
	"amount_centavos" integer NOT NULL,
	"currency" char(3) DEFAULT 'PHP' NOT NULL,
	"available_at" timestamp with time zone NOT NULL,
	"idempotency_key" varchar(150) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_ledger_entries_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "merchant_ledger_entries_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "merchant_ledger_entries_nonzero_amount_check" CHECK ("merchant_ledger_entries"."amount_centavos" <> 0),
	CONSTRAINT "merchant_ledger_entries_currency_check" CHECK ("merchant_ledger_entries"."currency" = 'PHP'),
	CONSTRAINT "merchant_ledger_entries_reference_count_check" CHECK (
        num_nonnulls(
          "merchant_ledger_entries"."merchant_order_id",
          "merchant_ledger_entries"."payment_allocation_id",
          "merchant_ledger_entries"."refund_id"
        ) <= 1
      ),
	CONSTRAINT "merchant_ledger_entries_idempotency_key_not_empty_check" CHECK (length(btrim("merchant_ledger_entries"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "merchant_payout_items" (
	"payout_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"ledger_entry_id" uuid NOT NULL,
	"amount_centavos" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_payout_items_pk" PRIMARY KEY("payout_id","ledger_entry_id"),
	CONSTRAINT "merchant_payout_items_ledger_entry_unique" UNIQUE("ledger_entry_id"),
	CONSTRAINT "merchant_payout_items_amount_check" CHECK ("merchant_payout_items"."amount_centavos" > 0)
);
--> statement-breakpoint
CREATE TABLE "merchant_payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"status" "merchant_payout_status" DEFAULT 'PENDING' NOT NULL,
	"amount_centavos" integer NOT NULL,
	"currency" char(3) DEFAULT 'PHP' NOT NULL,
	"provider" varchar(100),
	"provider_payout_id" varchar(255),
	"idempotency_key" varchar(150) NOT NULL,
	"period_starts_at" timestamp with time zone,
	"period_ends_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_payouts_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "merchant_payouts_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "merchant_payouts_amount_check" CHECK ("merchant_payouts"."amount_centavos" > 0),
	CONSTRAINT "merchant_payouts_currency_check" CHECK ("merchant_payouts"."currency" = 'PHP'),
	CONSTRAINT "merchant_payouts_period_check" CHECK (
        "merchant_payouts"."period_starts_at" is null
        or "merchant_payouts"."period_ends_at" is null
        or "merchant_payouts"."period_ends_at" > "merchant_payouts"."period_starts_at"
      ),
	CONSTRAINT "merchant_payouts_provider_reference_pair_check" CHECK (
        ("merchant_payouts"."provider" is null and "merchant_payouts"."provider_payout_id" is null)
        or (
          "merchant_payouts"."provider" is not null
          and length(btrim("merchant_payouts"."provider")) > 0
          and "merchant_payouts"."provider_payout_id" is not null
          and length(btrim("merchant_payouts"."provider_payout_id")) > 0
        )
      ),
	CONSTRAINT "merchant_payouts_processed_at_check" CHECK ("merchant_payouts"."status" <> 'PAID' or "merchant_payouts"."processed_at" is not null),
	CONSTRAINT "merchant_payouts_idempotency_key_not_empty_check" CHECK (length(btrim("merchant_payouts"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"merchant_order_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"status" "payment_allocation_status" DEFAULT 'PENDING' NOT NULL,
	"gross_amount_centavos" integer NOT NULL,
	"platform_commission_centavos" integer NOT NULL,
	"merchant_amount_centavos" integer NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_allocations_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "payment_allocations_payment_merchant_order_unique" UNIQUE("payment_id","merchant_order_id"),
	CONSTRAINT "payment_allocations_amounts_check" CHECK (
        "payment_allocations"."gross_amount_centavos" > 0
        and "payment_allocations"."platform_commission_centavos" >= 0
        and "payment_allocations"."merchant_amount_centavos" >= 0
        and "payment_allocations"."platform_commission_centavos" + "payment_allocations"."merchant_amount_centavos"
          = "payment_allocations"."gross_amount_centavos"
      ),
	CONSTRAINT "payment_allocations_settled_at_check" CHECK ("payment_allocations"."status" <> 'SETTLED' or "payment_allocations"."settled_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"provider" varchar(100),
	"provider_payment_id" varchar(255),
	"idempotency_key" varchar(100) NOT NULL,
	"amount_centavos" integer NOT NULL,
	"currency" char(3) DEFAULT 'PHP' NOT NULL,
	"failure_code" varchar(100),
	"authorized_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_id_order_unique" UNIQUE("id","order_id"),
	CONSTRAINT "payments_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "payments_idempotency_key_not_empty_check" CHECK (length(btrim("payments"."idempotency_key")) > 0),
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount_centavos" > 0),
	CONSTRAINT "payments_currency_check" CHECK ("payments"."currency" = 'PHP'),
	CONSTRAINT "payments_paid_at_check" CHECK (
        "payments"."status" not in ('PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
        or "payments"."paid_at" is not null
      ),
	CONSTRAINT "payments_authorized_at_check" CHECK ("payments"."status" <> 'AUTHORIZED' or "payments"."authorized_at" is not null),
	CONSTRAINT "payments_online_provider_check" CHECK (
        "payments"."method" <> 'ONLINE_PAYMENT'
        or "payments"."status" not in ('AUTHORIZED', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED')
        or ("payments"."provider" is not null and "payments"."provider_payment_id" is not null)
      ),
	CONSTRAINT "payments_provider_reference_pair_check" CHECK (
        ("payments"."provider" is null and "payments"."provider_payment_id" is null)
        or (
          "payments"."provider" is not null
          and length(btrim("payments"."provider")) > 0
          and "payments"."provider_payment_id" is not null
          and length(btrim("payments"."provider_payment_id")) > 0
        )
      )
);
--> statement-breakpoint
CREATE TABLE "refund_items" (
	"refund_id" uuid NOT NULL,
	"merchant_order_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"amount_centavos" integer NOT NULL,
	"commission_reversal_centavos" integer DEFAULT 0 NOT NULL,
	"merchant_liability_centavos" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refund_items_pk" PRIMARY KEY("refund_id","order_item_id"),
	CONSTRAINT "refund_items_quantity_check" CHECK ("refund_items"."quantity" > 0),
	CONSTRAINT "refund_items_amount_breakdown_check" CHECK (
        "refund_items"."amount_centavos" > 0
        and "refund_items"."commission_reversal_centavos" >= 0
        and "refund_items"."merchant_liability_centavos" >= 0
        and "refund_items"."commission_reversal_centavos" + "refund_items"."merchant_liability_centavos"
          = "refund_items"."amount_centavos"
      )
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"merchant_order_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"provider_refund_id" varchar(255),
	"idempotency_key" varchar(100) NOT NULL,
	"amount_centavos" integer NOT NULL,
	"commission_reversal_centavos" integer DEFAULT 0 NOT NULL,
	"merchant_liability_centavos" integer DEFAULT 0 NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'PENDING' NOT NULL,
	"requested_by_user_id" uuid,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "refunds_id_merchant_order_tenant_unique" UNIQUE("id","merchant_order_id","merchant_id"),
	CONSTRAINT "refunds_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "refunds_amount_breakdown_check" CHECK (
        "refunds"."amount_centavos" > 0
        and "refunds"."commission_reversal_centavos" >= 0
        and "refunds"."merchant_liability_centavos" >= 0
        and "refunds"."commission_reversal_centavos" + "refunds"."merchant_liability_centavos"
          = "refunds"."amount_centavos"
      ),
	CONSTRAINT "refunds_idempotency_key_not_empty_check" CHECK (length(btrim("refunds"."idempotency_key")) > 0),
	CONSTRAINT "refunds_provider_refund_id_not_empty_check" CHECK (
        "refunds"."provider_refund_id" is null
        or length(btrim("refunds"."provider_refund_id")) > 0
      ),
	CONSTRAINT "refunds_reason_not_empty_check" CHECK (length(btrim("refunds"."reason")) > 0),
	CONSTRAINT "refunds_processed_at_check" CHECK ("refunds"."status" <> 'SUCCEEDED' or "refunds"."processed_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "discount_brands" (
	"discount_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"brand_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_brands_pk" PRIMARY KEY("discount_id","merchant_id","brand_id")
);
--> statement-breakpoint
CREATE TABLE "discount_categories" (
	"discount_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_categories_pk" PRIMARY KEY("discount_id","merchant_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "discount_collections" (
	"discount_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_collections_pk" PRIMARY KEY("discount_id","merchant_id","collection_id")
);
--> statement-breakpoint
CREATE TABLE "discount_products" (
	"discount_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discount_products_pk" PRIMARY KEY("discount_id","merchant_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "discount_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discount_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"merchant_order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"code_snapshot" varchar(64),
	"amount_centavos" integer NOT NULL,
	"status" "discount_redemption_status" DEFAULT 'APPLIED' NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reversed_at" timestamp with time zone,
	CONSTRAINT "discount_redemptions_merchant_order_unique" UNIQUE("merchant_order_id"),
	CONSTRAINT "discount_redemptions_amount_check" CHECK ("discount_redemptions"."amount_centavos" >= 0),
	CONSTRAINT "discount_redemptions_reversed_at_check" CHECK (
        ("discount_redemptions"."status" = 'REVERSED' and "discount_redemptions"."reversed_at" is not null)
        or ("discount_redemptions"."status" <> 'REVERSED' and "discount_redemptions"."reversed_at" is null)
      )
);
--> statement-breakpoint
CREATE TABLE "discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"name" varchar(150) NOT NULL,
	"code" varchar(64),
	"description" text,
	"discount_type" "discount_type" NOT NULL,
	"application_method" "discount_application_method" DEFAULT 'CODE' NOT NULL,
	"fixed_amount_centavos" integer,
	"percentage_basis_points" smallint,
	"maximum_discount_centavos" integer,
	"minimum_subtotal_centavos" integer DEFAULT 0 NOT NULL,
	"minimum_item_quantity" integer DEFAULT 1 NOT NULL,
	"first_order_only" boolean DEFAULT false NOT NULL,
	"total_usage_limit" integer,
	"per_user_usage_limit" integer,
	"redeemed_count" integer DEFAULT 0 NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid,
	"updated_by_user_id" uuid,
	"deleted_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "discounts_id_merchant_unique" UNIQUE("id","merchant_id"),
	CONSTRAINT "discounts_name_not_empty_check" CHECK (length(btrim("discounts"."name")) > 0),
	CONSTRAINT "discounts_code_method_check" CHECK (
        (
          "discounts"."application_method" = 'CODE'
          and "discounts"."code" is not null
          and "discounts"."code" = upper(btrim("discounts"."code"))
          and length("discounts"."code") > 0
        )
        or (
          "discounts"."application_method" = 'AUTOMATIC'
          and "discounts"."code" is null
        )
      ),
	CONSTRAINT "discounts_value_shape_check" CHECK (
        (
          "discounts"."discount_type" = 'FIXED_AMOUNT'
          and "discounts"."fixed_amount_centavos" > 0
          and "discounts"."percentage_basis_points" is null
          and "discounts"."maximum_discount_centavos" is null
        )
        or (
          "discounts"."discount_type" = 'PERCENTAGE'
          and "discounts"."fixed_amount_centavos" is null
          and "discounts"."percentage_basis_points" between 1 and 10000
        )
        or (
          "discounts"."discount_type" = 'FREE_SHIPPING'
          and "discounts"."fixed_amount_centavos" is null
          and "discounts"."percentage_basis_points" is null
        )
      ),
	CONSTRAINT "discounts_nonnegative_thresholds_check" CHECK (
        "discounts"."minimum_subtotal_centavos" >= 0
        and "discounts"."minimum_item_quantity" >= 1
        and "discounts"."redeemed_count" >= 0
        and (
          "discounts"."maximum_discount_centavos" is null
          or "discounts"."maximum_discount_centavos" >= 0
        )
      ),
	CONSTRAINT "discounts_positive_usage_limits_check" CHECK (
        ("discounts"."total_usage_limit" is null or "discounts"."total_usage_limit" > 0)
        and ("discounts"."per_user_usage_limit" is null or "discounts"."per_user_usage_limit" > 0)
      ),
	CONSTRAINT "discounts_redeemed_within_limit_check" CHECK (
        "discounts"."total_usage_limit" is null
        or "discounts"."redeemed_count" <= "discounts"."total_usage_limit"
      ),
	CONSTRAINT "discounts_valid_window_check" CHECK ("discounts"."ends_at" is null or "discounts"."ends_at" > "discounts"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "domain_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid,
	"aggregate_type" varchar(100) NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" varchar(150) NOT NULL,
	"event_version" smallint DEFAULT 1 NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" varchar(180) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "domain_events_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "domain_events_required_text_check" CHECK (
        length(btrim("domain_events"."aggregate_type")) > 0
        and length(btrim("domain_events"."event_type")) > 0
        and length(btrim("domain_events"."idempotency_key")) > 0
      ),
	CONSTRAINT "domain_events_version_check" CHECK ("domain_events"."event_version" > 0),
	CONSTRAINT "domain_events_payload_object_check" CHECK (jsonb_typeof("domain_events"."payload") = 'object')
);
--> statement-breakpoint
CREATE TABLE "outbox_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"domain_event_id" uuid NOT NULL,
	"topic" varchar(150) NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 10 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" varchar(150),
	"processed_at" timestamp with time zone,
	"last_error" text,
	"idempotency_key" varchar(180) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_messages_domain_event_unique" UNIQUE("domain_event_id"),
	CONSTRAINT "outbox_messages_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "outbox_messages_topic_not_empty_check" CHECK (length(btrim("outbox_messages"."topic")) > 0),
	CONSTRAINT "outbox_messages_attempts_check" CHECK (
        "outbox_messages"."attempts" >= 0
        and "outbox_messages"."max_attempts" > 0
        and "outbox_messages"."attempts" <= "outbox_messages"."max_attempts"
      ),
	CONSTRAINT "outbox_messages_processing_lock_check" CHECK (
        "outbox_messages"."status" <> 'PROCESSING'
        or (
          "outbox_messages"."locked_at" is not null
          and "outbox_messages"."locked_by" is not null
          and length(btrim("outbox_messages"."locked_by")) > 0
        )
      ),
	CONSTRAINT "outbox_messages_processed_at_check" CHECK (
        ("outbox_messages"."status" in ('PROCESSED', 'FAILED') and "outbox_messages"."processed_at" is not null)
        or ("outbox_messages"."status" not in ('PROCESSED', 'FAILED') and "outbox_messages"."processed_at" is null)
      ),
	CONSTRAINT "outbox_messages_idempotency_key_not_empty_check" CHECK (length(btrim("outbox_messages"."idempotency_key")) > 0)
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"merchant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"rating" smallint NOT NULL,
	"title" varchar(150),
	"body" text,
	"status" "review_status" DEFAULT 'PENDING' NOT NULL,
	"moderated_by_user_id" uuid,
	"moderation_note" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "reviews_order_item_unique" UNIQUE("order_item_id"),
	CONSTRAINT "reviews_user_product_tenant_unique" UNIQUE("user_id","merchant_id","product_id"),
	CONSTRAINT "reviews_rating_check" CHECK ("reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_title_not_empty_check" CHECK ("reviews"."title" is null or length(btrim("reviews"."title")) > 0),
	CONSTRAINT "reviews_published_at_check" CHECK (
        ("reviews"."status" = 'PUBLISHED' and "reviews"."published_at" is not null)
        or ("reviews"."status" <> 'PUBLISHED' and "reviews"."published_at" is null)
      )
);
--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_platform_roles" ADD CONSTRAINT "user_platform_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_platform_roles" ADD CONSTRAINT "user_platform_roles_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_platform_roles" ADD CONSTRAINT "user_platform_roles_role_scope_fk" FOREIGN KEY ("role_id","role_scope") REFERENCES "public"."roles"("id","scope") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_tenant_fk" FOREIGN KEY ("variant_id","product_id","merchant_id") REFERENCES "public"."product_variants"("id","product_id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_merged_into_cart_id_carts_id_fk" FOREIGN KEY ("merged_into_cart_id") REFERENCES "public"."carts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_product_tenant_fk" FOREIGN KEY ("product_id","merchant_id") REFERENCES "public"."products"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_collection_tenant_fk" FOREIGN KEY ("collection_id","merchant_id") REFERENCES "public"."collections"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_products" ADD CONSTRAINT "collection_products_product_tenant_fk" FOREIGN KEY ("product_id","merchant_id") REFERENCES "public"."products"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_tenant_fk" FOREIGN KEY ("product_id","merchant_id") REFERENCES "public"."products"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_tenant_fk" FOREIGN KEY ("product_id","merchant_id") REFERENCES "public"."products"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_tenant_fk" FOREIGN KEY ("option_id","product_id","merchant_id") REFERENCES "public"."product_options"("id","product_id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_options" ADD CONSTRAINT "product_options_product_tenant_fk" FOREIGN KEY ("product_id","merchant_id") REFERENCES "public"."products"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_tenant_fk" FOREIGN KEY ("product_id","merchant_id") REFERENCES "public"."products"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_tenant_fk" FOREIGN KEY ("brand_id","merchant_id") REFERENCES "public"."brands"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_variant_tenant_fk" FOREIGN KEY ("variant_id","product_id","merchant_id") REFERENCES "public"."product_variants"("id","product_id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variant_option_values" ADD CONSTRAINT "variant_option_values_value_tenant_fk" FOREIGN KEY ("option_value_id","product_id","option_id","merchant_id") REFERENCES "public"."product_option_values"("id","product_id","option_id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_location_tenant_fk" FOREIGN KEY ("location_id","merchant_id") REFERENCES "public"."inventory_locations"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_variant_tenant_fk" FOREIGN KEY ("variant_id","merchant_id") REFERENCES "public"."product_variants"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_balance_tenant_fk" FOREIGN KEY ("merchant_id","location_id","variant_id") REFERENCES "public"."inventory_balances"("merchant_id","location_id","variant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_balance_tenant_fk" FOREIGN KEY ("merchant_id","location_id","variant_id") REFERENCES "public"."inventory_balances"("merchant_id","location_id","variant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_merchant_order_tenant_fk" FOREIGN KEY ("merchant_order_id","merchant_id") REFERENCES "public"."merchant_orders"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_addresses" ADD CONSTRAINT "merchant_addresses_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_invitation_roles" ADD CONSTRAINT "merchant_invitation_roles_invitation_tenant_fk" FOREIGN KEY ("invitation_id","merchant_id") REFERENCES "public"."merchant_invitations"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_invitation_roles" ADD CONSTRAINT "merchant_invitation_roles_role_scope_fk" FOREIGN KEY ("role_id","role_scope") REFERENCES "public"."roles"("id","scope") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_invitations" ADD CONSTRAINT "merchant_invitations_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_invitations" ADD CONSTRAINT "merchant_invitations_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_invitations" ADD CONSTRAINT "merchant_invitations_accepted_membership_tenant_fk" FOREIGN KEY ("accepted_by_membership_id","merchant_id") REFERENCES "public"."merchant_memberships"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_membership_roles" ADD CONSTRAINT "merchant_membership_roles_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_membership_roles" ADD CONSTRAINT "merchant_membership_roles_membership_tenant_fk" FOREIGN KEY ("membership_id","merchant_id") REFERENCES "public"."merchant_memberships"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_membership_roles" ADD CONSTRAINT "merchant_membership_roles_role_scope_fk" FOREIGN KEY ("role_id","role_scope") REFERENCES "public"."roles"("id","scope") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_memberships" ADD CONSTRAINT "merchant_memberships_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_memberships" ADD CONSTRAINT "merchant_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_memberships" ADD CONSTRAINT "merchant_memberships_invited_by_user_id_users_id_fk" FOREIGN KEY ("invited_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_profiles" ADD CONSTRAINT "merchant_profiles_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_staff_profiles" ADD CONSTRAINT "merchant_staff_profiles_membership_tenant_fk" FOREIGN KEY ("membership_id","merchant_id") REFERENCES "public"."merchant_memberships"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_verifications" ADD CONSTRAINT "merchant_verifications_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_verifications" ADD CONSTRAINT "merchant_verifications_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_verifications" ADD CONSTRAINT "merchant_verifications_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_fulfillment_tenant_fk" FOREIGN KEY ("fulfillment_id","merchant_order_id","merchant_id") REFERENCES "public"."fulfillments"("id","merchant_order_id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_order_item_tenant_fk" FOREIGN KEY ("order_item_id","merchant_order_id","merchant_id") REFERENCES "public"."order_items"("id","merchant_order_id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_merchant_order_tenant_fk" FOREIGN KEY ("merchant_order_id","merchant_id") REFERENCES "public"."merchant_orders"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_ship_from_address_tenant_fk" FOREIGN KEY ("ship_from_address_id","merchant_id") REFERENCES "public"."merchant_addresses"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_order_status_history" ADD CONSTRAINT "merchant_order_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_order_status_history" ADD CONSTRAINT "merchant_order_status_history_order_tenant_fk" FOREIGN KEY ("merchant_order_id","merchant_id") REFERENCES "public"."merchant_orders"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_orders" ADD CONSTRAINT "merchant_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_orders" ADD CONSTRAINT "merchant_orders_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_merchant_order_tenant_fk" FOREIGN KEY ("merchant_order_id","order_id","merchant_id") REFERENCES "public"."merchant_orders"("id","order_id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_tenant_fk" FOREIGN KEY ("product_id","merchant_id") REFERENCES "public"."products"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_tenant_fk" FOREIGN KEY ("variant_id","product_id","merchant_id") REFERENCES "public"."product_variants"("id","product_id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_source_cart_owner_fk" FOREIGN KEY ("source_cart_id","user_id") REFERENCES "public"."carts"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_source_address_owner_fk" FOREIGN KEY ("source_address_id","user_id") REFERENCES "public"."addresses"("id","user_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_order_tenant_fk" FOREIGN KEY ("merchant_order_id","merchant_id") REFERENCES "public"."merchant_orders"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_allocation_tenant_fk" FOREIGN KEY ("payment_allocation_id","merchant_id") REFERENCES "public"."payment_allocations"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_ledger_entries" ADD CONSTRAINT "merchant_ledger_entries_refund_tenant_fk" FOREIGN KEY ("refund_id","merchant_id") REFERENCES "public"."refunds"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payout_items" ADD CONSTRAINT "merchant_payout_items_payout_tenant_fk" FOREIGN KEY ("payout_id","merchant_id") REFERENCES "public"."merchant_payouts"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payout_items" ADD CONSTRAINT "merchant_payout_items_ledger_tenant_fk" FOREIGN KEY ("ledger_entry_id","merchant_id") REFERENCES "public"."merchant_ledger_entries"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payouts" ADD CONSTRAINT "merchant_payouts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_order_fk" FOREIGN KEY ("payment_id","order_id") REFERENCES "public"."payments"("id","order_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_merchant_order_tenant_fk" FOREIGN KEY ("merchant_order_id","order_id","merchant_id") REFERENCES "public"."merchant_orders"("id","order_id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_refund_tenant_fk" FOREIGN KEY ("refund_id","merchant_order_id","merchant_id") REFERENCES "public"."refunds"("id","merchant_order_id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_items" ADD CONSTRAINT "refund_items_order_item_tenant_fk" FOREIGN KEY ("order_item_id","merchant_order_id","merchant_id") REFERENCES "public"."order_items"("id","merchant_order_id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_order_fk" FOREIGN KEY ("payment_id","order_id") REFERENCES "public"."payments"("id","order_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_merchant_order_tenant_fk" FOREIGN KEY ("merchant_order_id","order_id","merchant_id") REFERENCES "public"."merchant_orders"("id","order_id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_brands" ADD CONSTRAINT "discount_brands_discount_tenant_fk" FOREIGN KEY ("discount_id","merchant_id") REFERENCES "public"."discounts"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_brands" ADD CONSTRAINT "discount_brands_brand_tenant_fk" FOREIGN KEY ("brand_id","merchant_id") REFERENCES "public"."brands"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_categories" ADD CONSTRAINT "discount_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_categories" ADD CONSTRAINT "discount_categories_discount_tenant_fk" FOREIGN KEY ("discount_id","merchant_id") REFERENCES "public"."discounts"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_collections" ADD CONSTRAINT "discount_collections_discount_tenant_fk" FOREIGN KEY ("discount_id","merchant_id") REFERENCES "public"."discounts"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_collections" ADD CONSTRAINT "discount_collections_collection_tenant_fk" FOREIGN KEY ("collection_id","merchant_id") REFERENCES "public"."collections"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_products" ADD CONSTRAINT "discount_products_discount_tenant_fk" FOREIGN KEY ("discount_id","merchant_id") REFERENCES "public"."discounts"("id","merchant_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_products" ADD CONSTRAINT "discount_products_product_tenant_fk" FOREIGN KEY ("product_id","merchant_id") REFERENCES "public"."products"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_discount_tenant_fk" FOREIGN KEY ("discount_id","merchant_id") REFERENCES "public"."discounts"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_redemptions" ADD CONSTRAINT "discount_redemptions_order_tenant_fk" FOREIGN KEY ("merchant_order_id","merchant_id") REFERENCES "public"."merchant_orders"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discounts" ADD CONSTRAINT "discounts_deleted_by_user_id_users_id_fk" FOREIGN KEY ("deleted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "domain_events" ADD CONSTRAINT "domain_events_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_messages" ADD CONSTRAINT "outbox_messages_domain_event_id_domain_events_id_fk" FOREIGN KEY ("domain_event_id") REFERENCES "public"."domain_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_moderated_by_user_id_users_id_fk" FOREIGN KEY ("moderated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_tenant_fk" FOREIGN KEY ("product_id","merchant_id") REFERENCES "public"."products"("id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_tenant_fk" FOREIGN KEY ("order_item_id","product_id","merchant_id") REFERENCES "public"."order_items"("id","product_id","merchant_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "permissions_key_lower_unique" ON "permissions" USING btree (lower("key"));--> statement-breakpoint
CREATE INDEX "role_permissions_permission_role_idx" ON "role_permissions" USING btree ("permission_id","role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "roles_scope_key_lower_unique" ON "roles" USING btree ("scope",lower("key"));--> statement-breakpoint
CREATE INDEX "roles_scope_active_name_idx" ON "roles" USING btree ("scope","name") WHERE "roles"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "user_platform_roles_role_user_idx" ON "user_platform_roles" USING btree ("role_id","user_id");--> statement-breakpoint
CREATE INDEX "audit_logs_merchant_occurred_at_idx" ON "audit_logs" USING btree ("merchant_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_occurred_at_idx" ON "audit_logs" USING btree ("actor_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_logs_correlation_idx" ON "audit_logs" USING btree ("correlation_id") WHERE "audit_logs"."correlation_id" is not null;--> statement-breakpoint
CREATE INDEX "cart_items_cart_merchant_idx" ON "cart_items" USING btree ("cart_id","merchant_id");--> statement-breakpoint
CREATE INDEX "cart_items_variant_cart_idx" ON "cart_items" USING btree ("merchant_id","variant_id","cart_id");--> statement-breakpoint
CREATE UNIQUE INDEX "carts_active_user_unique" ON "carts" USING btree ("user_id") WHERE "carts"."user_id" is not null and "carts"."status" = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX "carts_guest_token_hash_unique" ON "carts" USING btree ("guest_token_hash") WHERE "carts"."guest_token_hash" is not null;--> statement-breakpoint
CREATE INDEX "carts_status_expires_at_idx" ON "carts" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "carts_user_status_idx" ON "carts" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "wishlist_items_product_created_at_idx" ON "wishlist_items" USING btree ("merchant_id","product_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "brands_merchant_name_lower_unique" ON "brands" USING btree ("merchant_id",lower("name"));--> statement-breakpoint
CREATE INDEX "brands_merchant_active_name_idx" ON "brands" USING btree ("merchant_id","is_active","name") WHERE "brands"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "categories_parent_active_sort_idx" ON "categories" USING btree ("parent_id","is_active","sort_order");--> statement-breakpoint
CREATE INDEX "collection_products_collection_sort_idx" ON "collection_products" USING btree ("merchant_id","collection_id","sort_order");--> statement-breakpoint
CREATE INDEX "collection_products_product_idx" ON "collection_products" USING btree ("merchant_id","product_id");--> statement-breakpoint
CREATE INDEX "collections_merchant_active_window_idx" ON "collections" USING btree ("merchant_id","is_active","starts_at","ends_at");--> statement-breakpoint
CREATE UNIQUE INDEX "product_categories_primary_unique" ON "product_categories" USING btree ("merchant_id","product_id") WHERE "product_categories"."is_primary";--> statement-breakpoint
CREATE INDEX "product_categories_category_product_idx" ON "product_categories" USING btree ("category_id","merchant_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_images_primary_unique" ON "product_images" USING btree ("merchant_id","product_id") WHERE "product_images"."is_primary";--> statement-breakpoint
CREATE INDEX "product_images_product_sort_idx" ON "product_images" USING btree ("merchant_id","product_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_option_values_option_value_lower_unique" ON "product_option_values" USING btree ("merchant_id","option_id",lower("value"));--> statement-breakpoint
CREATE INDEX "product_option_values_product_option_order_idx" ON "product_option_values" USING btree ("merchant_id","product_id","option_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_options_product_name_lower_unique" ON "product_options" USING btree ("merchant_id","product_id",lower("name"));--> statement-breakpoint
CREATE INDEX "product_options_product_display_order_idx" ON "product_options" USING btree ("merchant_id","product_id","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_merchant_sku_lower_unique" ON "product_variants" USING btree ("merchant_id",lower("sku"));--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_merchant_barcode_unique" ON "product_variants" USING btree ("merchant_id","barcode") WHERE "product_variants"."barcode" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "product_variants_active_default_unique" ON "product_variants" USING btree ("merchant_id","product_id") WHERE "product_variants"."is_default" and "product_variants"."is_active" and "product_variants"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "product_variants_product_active_price_idx" ON "product_variants" USING btree ("merchant_id","product_id","is_active","price_centavos") WHERE "product_variants"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "products_public_listing_idx" ON "products" USING btree ("status","published_at") WHERE "products"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "products_merchant_status_published_idx" ON "products" USING btree ("merchant_id","status","published_at") WHERE "products"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "products_merchant_brand_status_idx" ON "products" USING btree ("merchant_id","brand_id","status") WHERE "products"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "variant_option_values_filter_idx" ON "variant_option_values" USING btree ("merchant_id","option_value_id","variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "addresses_one_active_default_per_user_unique" ON "addresses" USING btree ("user_id") WHERE "addresses"."is_default" and "addresses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "addresses_user_active_updated_at_idx" ON "addresses" USING btree ("user_id","deleted_at","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "users_status_created_at_idx" ON "users" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "inventory_balances_variant_availability_idx" ON "inventory_balances" USING btree ("merchant_id","variant_id","stock_on_hand","stock_reserved");--> statement-breakpoint
CREATE INDEX "inventory_balances_location_low_stock_idx" ON "inventory_balances" USING btree ("merchant_id","location_id","stock_on_hand","reorder_threshold");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_locations_merchant_code_lower_unique" ON "inventory_locations" USING btree ("merchant_id",lower("code"));--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_locations_default_unique" ON "inventory_locations" USING btree ("merchant_id") WHERE "inventory_locations"."is_default" and "inventory_locations"."is_active";--> statement-breakpoint
CREATE INDEX "inventory_locations_merchant_active_name_idx" ON "inventory_locations" USING btree ("merchant_id","is_active","name");--> statement-breakpoint
CREATE INDEX "inventory_movements_balance_created_at_idx" ON "inventory_movements" USING btree ("merchant_id","location_id","variant_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_reference_idx" ON "inventory_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_reservations_active_cart_balance_unique" ON "inventory_reservations" USING btree ("cart_id","merchant_id","location_id","variant_id") WHERE "inventory_reservations"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "inventory_reservations_processing_idx" ON "inventory_reservations" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "inventory_reservations_balance_status_idx" ON "inventory_reservations" USING btree ("merchant_id","location_id","variant_id","status");--> statement-breakpoint
CREATE INDEX "inventory_reservations_order_idx" ON "inventory_reservations" USING btree ("merchant_id","merchant_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_addresses_default_type_unique" ON "merchant_addresses" USING btree ("merchant_id","address_type") WHERE "merchant_addresses"."is_default" and "merchant_addresses"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "merchant_addresses_merchant_type_active_idx" ON "merchant_addresses" USING btree ("merchant_id","address_type","deleted_at");--> statement-breakpoint
CREATE INDEX "merchant_invitation_roles_role_invitation_idx" ON "merchant_invitation_roles" USING btree ("role_id","invitation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_invitations_pending_email_unique" ON "merchant_invitations" USING btree ("merchant_id",lower("email")) WHERE "merchant_invitations"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "merchant_invitations_merchant_status_expires_at_idx" ON "merchant_invitations" USING btree ("merchant_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "merchant_membership_roles_role_membership_idx" ON "merchant_membership_roles" USING btree ("role_id","membership_id");--> statement-breakpoint
CREATE INDEX "merchant_memberships_user_status_idx" ON "merchant_memberships" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "merchant_memberships_merchant_status_idx" ON "merchant_memberships" USING btree ("merchant_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_staff_profiles_employee_code_unique" ON "merchant_staff_profiles" USING btree ("merchant_id",lower("employee_code")) WHERE "merchant_staff_profiles"."employee_code" is not null;--> statement-breakpoint
CREATE INDEX "merchant_staff_profiles_merchant_idx" ON "merchant_staff_profiles" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "merchant_verifications_merchant_submitted_at_idx" ON "merchant_verifications" USING btree ("merchant_id","submitted_at");--> statement-breakpoint
CREATE INDEX "merchant_verifications_status_submitted_at_idx" ON "merchant_verifications" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "merchants_status_verification_created_at_idx" ON "merchants" USING btree ("status","verification_status","created_at");--> statement-breakpoint
CREATE INDEX "fulfillment_items_order_item_idx" ON "fulfillment_items" USING btree ("merchant_id","order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "fulfillments_tracking_unique" ON "fulfillments" USING btree ("merchant_id","carrier","tracking_number") WHERE "fulfillments"."carrier" is not null and "fulfillments"."tracking_number" is not null;--> statement-breakpoint
CREATE INDEX "fulfillments_merchant_status_updated_at_idx" ON "fulfillments" USING btree ("merchant_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "fulfillments_order_status_idx" ON "fulfillments" USING btree ("merchant_order_id","status");--> statement-breakpoint
CREATE INDEX "merchant_order_status_history_order_created_at_idx" ON "merchant_order_status_history" USING btree ("merchant_id","merchant_order_id","created_at");--> statement-breakpoint
CREATE INDEX "merchant_order_status_history_queue_idx" ON "merchant_order_status_history" USING btree ("merchant_id","new_status","created_at");--> statement-breakpoint
CREATE INDEX "merchant_orders_merchant_status_created_at_idx" ON "merchant_orders" USING btree ("merchant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "merchant_orders_parent_status_idx" ON "merchant_orders" USING btree ("order_id","status");--> statement-breakpoint
CREATE INDEX "order_items_order_merchant_idx" ON "order_items" USING btree ("order_id","merchant_id");--> statement-breakpoint
CREATE INDEX "order_items_product_created_at_idx" ON "order_items" USING btree ("merchant_id","product_id","created_at");--> statement-breakpoint
CREATE INDEX "order_items_variant_created_at_idx" ON "order_items" USING btree ("merchant_id","variant_id","created_at");--> statement-breakpoint
CREATE INDEX "order_status_history_order_created_at_idx" ON "order_status_history" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_source_cart_unique" ON "orders" USING btree ("source_cart_id") WHERE "orders"."source_cart_id" is not null;--> statement-breakpoint
CREATE INDEX "orders_user_created_at_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "orders_payment_status_created_at_idx" ON "orders" USING btree ("payment_status","created_at");--> statement-breakpoint
CREATE INDEX "orders_source_address_idx" ON "orders" USING btree ("source_address_id");--> statement-breakpoint
CREATE INDEX "merchant_ledger_entries_available_idx" ON "merchant_ledger_entries" USING btree ("merchant_id","available_at","created_at");--> statement-breakpoint
CREATE INDEX "merchant_ledger_entries_order_idx" ON "merchant_ledger_entries" USING btree ("merchant_id","merchant_order_id");--> statement-breakpoint
CREATE INDEX "merchant_payout_items_merchant_payout_idx" ON "merchant_payout_items" USING btree ("merchant_id","payout_id");--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_payouts_provider_reference_unique" ON "merchant_payouts" USING btree ("provider","provider_payout_id") WHERE "merchant_payouts"."provider" is not null and "merchant_payouts"."provider_payout_id" is not null;--> statement-breakpoint
CREATE INDEX "merchant_payouts_merchant_status_created_at_idx" ON "merchant_payouts" USING btree ("merchant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payment_allocations_merchant_status_created_at_idx" ON "payment_allocations" USING btree ("merchant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "payment_allocations_order_idx" ON "payment_allocations" USING btree ("order_id","payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_unique" ON "payments" USING btree ("provider","provider_payment_id") WHERE "payments"."provider" is not null and "payments"."provider_payment_id" is not null;--> statement-breakpoint
CREATE INDEX "payments_order_created_at_idx" ON "payments" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_status_created_at_idx" ON "payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "refund_items_order_item_idx" ON "refund_items" USING btree ("merchant_id","order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "refunds_provider_refund_unique" ON "refunds" USING btree ("provider_refund_id") WHERE "refunds"."provider_refund_id" is not null;--> statement-breakpoint
CREATE INDEX "refunds_payment_status_idx" ON "refunds" USING btree ("payment_id","status");--> statement-breakpoint
CREATE INDEX "refunds_merchant_status_created_at_idx" ON "refunds" USING btree ("merchant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "discount_brands_brand_discount_idx" ON "discount_brands" USING btree ("merchant_id","brand_id","discount_id");--> statement-breakpoint
CREATE INDEX "discount_categories_category_discount_idx" ON "discount_categories" USING btree ("category_id","merchant_id","discount_id");--> statement-breakpoint
CREATE INDEX "discount_collections_collection_discount_idx" ON "discount_collections" USING btree ("merchant_id","collection_id","discount_id");--> statement-breakpoint
CREATE INDEX "discount_products_product_discount_idx" ON "discount_products" USING btree ("merchant_id","product_id","discount_id");--> statement-breakpoint
CREATE INDEX "discount_redemptions_discount_status_redeemed_idx" ON "discount_redemptions" USING btree ("merchant_id","discount_id","status","redeemed_at");--> statement-breakpoint
CREATE INDEX "discount_redemptions_user_discount_status_idx" ON "discount_redemptions" USING btree ("user_id","discount_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "discounts_merchant_code_upper_unique" ON "discounts" USING btree ("merchant_id",upper("code")) WHERE "discounts"."code" is not null;--> statement-breakpoint
CREATE INDEX "discounts_merchant_active_window_idx" ON "discounts" USING btree ("merchant_id","is_active","starts_at","ends_at");--> statement-breakpoint
CREATE INDEX "discounts_merchant_method_active_idx" ON "discounts" USING btree ("merchant_id","application_method","is_active");--> statement-breakpoint
CREATE INDEX "domain_events_aggregate_occurred_at_idx" ON "domain_events" USING btree ("aggregate_type","aggregate_id","occurred_at");--> statement-breakpoint
CREATE INDEX "domain_events_merchant_occurred_at_idx" ON "domain_events" USING btree ("merchant_id","occurred_at");--> statement-breakpoint
CREATE INDEX "outbox_messages_processing_idx" ON "outbox_messages" USING btree ("available_at","created_at") WHERE 
          "outbox_messages"."status" in ('PENDING', 'RETRY')
          and "outbox_messages"."attempts" < "outbox_messages"."max_attempts"
        ;--> statement-breakpoint
CREATE INDEX "outbox_messages_stale_lock_idx" ON "outbox_messages" USING btree ("locked_at") WHERE "outbox_messages"."status" = 'PROCESSING';--> statement-breakpoint
CREATE INDEX "reviews_product_published_created_at_idx" ON "reviews" USING btree ("merchant_id","product_id","created_at") WHERE "reviews"."status" = 'PUBLISHED' and "reviews"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "reviews_product_published_rating_idx" ON "reviews" USING btree ("merchant_id","product_id","rating") WHERE "reviews"."status" = 'PUBLISHED' and "reviews"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "reviews_merchant_moderation_queue_idx" ON "reviews" USING btree ("merchant_id","status","created_at");--> statement-breakpoint
CREATE INDEX "reviews_user_created_at_idx" ON "reviews" USING btree ("user_id","created_at");