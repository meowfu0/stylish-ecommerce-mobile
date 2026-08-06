CREATE TYPE "public"."auth_action_token_purpose" AS ENUM('EMAIL_VERIFICATION', 'PASSWORD_RESET');--> statement-breakpoint
CREATE TABLE "auth_action_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" "auth_action_token_purpose" NOT NULL,
	"token_hash" char(64) NOT NULL,
	"idempotency_key" uuid DEFAULT gen_random_uuid() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_action_tokens_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "auth_action_tokens_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "auth_action_tokens_hash_check" CHECK ("auth_action_tokens"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "auth_action_tokens_expiry_check" CHECK ("auth_action_tokens"."expires_at" > "auth_action_tokens"."created_at"),
	CONSTRAINT "auth_action_tokens_terminal_state_check" CHECK (not ("auth_action_tokens"."consumed_at" is not null and "auth_action_tokens"."revoked_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "auth_refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"token_hash" char(64) NOT NULL,
	"parent_token_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoke_reason" varchar(100),
	"reuse_detected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_refresh_tokens_token_hash_unique" UNIQUE("token_hash"),
	CONSTRAINT "auth_refresh_tokens_hash_check" CHECK ("auth_refresh_tokens"."token_hash" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "auth_refresh_tokens_expiry_check" CHECK ("auth_refresh_tokens"."expires_at" > "auth_refresh_tokens"."created_at"),
	CONSTRAINT "auth_refresh_tokens_revocation_check" CHECK (
        ("auth_refresh_tokens"."revoked_at" is null and "auth_refresh_tokens"."revoke_reason" is null)
        or (
          "auth_refresh_tokens"."revoked_at" is not null
          and "auth_refresh_tokens"."revoke_reason" is not null
          and length(btrim("auth_refresh_tokens"."revoke_reason")) > 0
        )
      ),
	CONSTRAINT "auth_refresh_tokens_reuse_check" CHECK ("auth_refresh_tokens"."reuse_detected_at" is null or "auth_refresh_tokens"."used_at" is not null)
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoke_reason" varchar(100),
	"device_name" varchar(120),
	"ip_address" varchar(64),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_id_user_unique" UNIQUE("id","user_id"),
	CONSTRAINT "auth_sessions_expiry_check" CHECK ("auth_sessions"."expires_at" > "auth_sessions"."created_at"),
	CONSTRAINT "auth_sessions_revocation_check" CHECK (
        ("auth_sessions"."revoked_at" is null and "auth_sessions"."revoke_reason" is null)
        or (
          "auth_sessions"."revoked_at" is not null
          and "auth_sessions"."revoke_reason" is not null
          and length(btrim("auth_sessions"."revoke_reason")) > 0
        )
      )
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_changed_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_action_tokens" ADD CONSTRAINT "auth_action_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_refresh_tokens" ADD CONSTRAINT "auth_refresh_tokens_session_id_auth_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."auth_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_refresh_tokens" ADD CONSTRAINT "auth_refresh_tokens_parent_token_id_auth_refresh_tokens_id_fk" FOREIGN KEY ("parent_token_id") REFERENCES "public"."auth_refresh_tokens"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_action_tokens_user_purpose_created_at_idx" ON "auth_action_tokens" USING btree ("user_id","purpose","created_at");--> statement-breakpoint
CREATE INDEX "auth_action_tokens_expires_at_idx" ON "auth_action_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_refresh_tokens_parent_unique" ON "auth_refresh_tokens" USING btree ("parent_token_id") WHERE "auth_refresh_tokens"."parent_token_id" is not null;--> statement-breakpoint
CREATE INDEX "auth_refresh_tokens_session_created_at_idx" ON "auth_refresh_tokens" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "auth_refresh_tokens_expires_at_idx" ON "auth_refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_active_idx" ON "auth_sessions" USING btree ("user_id","revoked_at","expires_at");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_auth_version_nonnegative_check" CHECK ("users"."auth_version" >= 0);