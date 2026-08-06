ALTER TYPE "public"."merchant_verification_status" ADD VALUE 'CHANGES_REQUESTED' BEFORE 'VERIFIED';--> statement-breakpoint
ALTER TABLE "merchant_verifications" DROP CONSTRAINT "merchant_verifications_review_fields_check";--> statement-breakpoint
ALTER TABLE "merchant_verifications" ADD COLUMN "review_note" text;--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_verifications_pending_merchant_unique" ON "merchant_verifications" USING btree ("merchant_id") WHERE "merchant_verifications"."status" = 'PENDING';--> statement-breakpoint
CREATE UNIQUE INDEX "merchants_applicant_open_application_unique" ON "merchants" USING btree ("created_by_user_id") WHERE 
          "merchants"."created_by_user_id" is not null
          and "merchants"."deleted_at" is null
          and "merchants"."status" = 'PENDING'
          and "merchants"."verification_status" not in ('VERIFIED', 'REJECTED')
        ;--> statement-breakpoint
CREATE INDEX "merchants_applicant_created_at_idx" ON "merchants" USING btree ("created_by_user_id","created_at" DESC NULLS LAST) WHERE "merchants"."created_by_user_id" is not null and "merchants"."deleted_at" is null;--> statement-breakpoint
ALTER TABLE "merchant_verifications" ADD CONSTRAINT "merchant_verifications_review_note_check" CHECK (
        "merchant_verifications"."status"::text <> 'CHANGES_REQUESTED'
        or (
          "merchant_verifications"."review_note" is not null
          and length(btrim("merchant_verifications"."review_note")) > 0
        )
      );--> statement-breakpoint
ALTER TABLE "merchant_verifications" ADD CONSTRAINT "merchant_verifications_review_fields_check" CHECK (
        (
          (
            "merchant_verifications"."status" in ('VERIFIED', 'REJECTED')
            or "merchant_verifications"."status"::text = 'CHANGES_REQUESTED'
          )
          and "merchant_verifications"."reviewed_at" is not null
          and "merchant_verifications"."reviewed_by_user_id" is not null
        )
        or "merchant_verifications"."status" in ('UNVERIFIED', 'PENDING')
      );