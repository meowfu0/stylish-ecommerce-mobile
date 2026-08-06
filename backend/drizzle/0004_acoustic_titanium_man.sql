CREATE TYPE "public"."product_image_status" AS ENUM('PENDING', 'CONFIRMED');--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "status" "product_image_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "content_type" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "size_bytes" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "upload_expires_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "product_images" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "product_images_pending_expiry_idx" ON "product_images" USING btree ("upload_expires_at") WHERE "product_images"."status" = 'PENDING';--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_content_type_check" CHECK ("product_images"."content_type" in ('image/jpeg', 'image/png', 'image/webp'));--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_size_bytes_check" CHECK ("product_images"."size_bytes" > 0 and "product_images"."size_bytes" <= 5242880);--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_lifecycle_check" CHECK (
        (
          "product_images"."status" = 'PENDING'
          and "product_images"."confirmed_at" is null
          and "product_images"."is_primary" = false
        )
        or (
          "product_images"."status" = 'CONFIRMED'
          and "product_images"."confirmed_at" is not null
        )
      );--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_upload_expiry_check" CHECK ("product_images"."upload_expires_at" > "product_images"."created_at");