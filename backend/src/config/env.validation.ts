import { z } from 'zod';

const positiveIntegerString = z.string().regex(/^[1-9]\d*$/, 'must be a positive integer');
const optionalEmailAddress = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.email().optional(),
);
const optionalNonEmptyString = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

function isPostgresUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'postgres:' || url.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

function containsOnlyHttpOrigins(value: string): boolean {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) {
    return false;
  }

  return origins.every((origin) => {
    try {
      const url = new URL(origin);
      return (
        (url.protocol === 'http:' || url.protocol === 'https:') &&
        url.origin === origin.replace(/\/$/, '')
      );
    } catch {
      return false;
    }
  });
}

function isRedisUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'redis:' || url.protocol === 'rediss:';
  } catch {
    return false;
  }
}

const baseEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: positiveIntegerString.default('3000'),
  API_PREFIX: z.literal('api').default('api'),
  CORS_ORIGINS: z
    .string()
    .min(1, 'must contain at least one browser origin')
    .refine(containsOnlyHttpOrigins, 'must be a comma-separated list of valid HTTP(S) origins'),
  DATABASE_URL: z
    .string()
    .min(1, 'is required')
    .refine(isPostgresUrl, 'must be a valid PostgreSQL connection URL'),
  DATABASE_SSL: z.enum(['true', 'false']).default('true'),
  DATABASE_SSL_CA_PATH: z.string().trim().min(1, 'must not be empty').optional(),
  DATABASE_MAX_CONNECTIONS: positiveIntegerString.default('10'),
  DATABASE_CONNECTION_TIMEOUT_MS: positiveIntegerString.default('5000'),
  DATABASE_IDLE_TIMEOUT_MS: positiveIntegerString.default('10000'),
  DATABASE_QUERY_TIMEOUT_MS: positiveIntegerString.default('5000'),
  SWAGGER_ENABLED: z.enum(['true', 'false']).default('true'),
  JWT_ACCESS_SECRET: z.string().min(32, 'must contain at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.literal('15m').default('15m'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must contain at least 32 characters'),
  JWT_REFRESH_EXPIRES_IN: z.literal('30d').default('30d'),
  JWT_ISSUER: z.string().trim().min(1).default('stylish-api'),
  JWT_AUDIENCE: z.string().trim().min(1).default('stylish-expo'),
  EMAIL_VERIFICATION_EXPIRES_IN: z.literal('24h').default('24h'),
  PASSWORD_RESET_EXPIRES_IN: z.literal('30m').default('30m'),
  AUTH_MAX_ACTIVE_SESSIONS: z.literal('5').default('5'),
  AUTH_RATE_LIMIT_WINDOW_MS: positiveIntegerString.default('60000'),
  AUTH_FRONTEND_URL: z.string().trim().min(1).default('stylish://auth'),
  EMAIL_PROVIDER: z.enum(['preview', 'smtp']).default('preview'),
  EMAIL_PREVIEW_ENABLED: z.enum(['true', 'false']).default('false'),
  EMAIL_PREVIEW_DIRECTORY: z.string().trim().min(1).default('.email-previews'),
  SMTP_HOST: optionalNonEmptyString,
  SMTP_PORT: positiveIntegerString.default('465'),
  SMTP_SECURE: z.enum(['true', 'false']).default('true'),
  SMTP_USER: optionalEmailAddress,
  SMTP_PASSWORD: optionalNonEmptyString,
  SMTP_CONNECTION_TIMEOUT_MS: positiveIntegerString.default('10000'),
  EMAIL_FROM_ADDRESS: optionalEmailAddress,
  EMAIL_FROM_NAME: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[^\r\n]+$/, 'must not contain line breaks')
    .default('Velori'),
  EMAIL_REPLY_TO: optionalEmailAddress,
  REDIS_ENABLED: z.enum(['true', 'false']).default('false'),
  REDIS_REQUIRED: z.enum(['true', 'false']).default('false'),
  REDIS_URL: z.string().trim().optional(),
  REDIS_KEY_PREFIX: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9:_-]+$/, 'must use only letters, numbers, colons, underscores, or hyphens')
    .default('stylish'),
  REDIS_CONNECTION_TIMEOUT_MS: positiveIntegerString.default('3000'),
  REDIS_DEFAULT_TTL_SECONDS: positiveIntegerString.default('60'),
  REDIS_IDEMPOTENCY_TTL_SECONDS: positiveIntegerString.default('300'),
  REDIS_LOCK_TTL_MS: positiveIntegerString.default('10000'),
  SUPABASE_URL: z.url().refine(
    (value) => {
      const url = new URL(value);
      return url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
    },
    {
      message: 'must be an HTTPS Supabase project URL',
    },
  ),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(20),
  SUPABASE_STORAGE_BUCKET: z.literal('product-images'),
});

const environmentSchema = baseEnvironmentSchema.superRefine((config, context) => {
  if (config.JWT_ACCESS_SECRET === config.JWT_REFRESH_SECRET) {
    context.addIssue({
      code: 'custom',
      message: 'must be different from JWT_REFRESH_SECRET',
      path: ['JWT_ACCESS_SECRET'],
    });
  }

  if (config.NODE_ENV === 'production' && config.EMAIL_PREVIEW_ENABLED === 'true') {
    context.addIssue({
      code: 'custom',
      message: 'must be false in production',
      path: ['EMAIL_PREVIEW_ENABLED'],
    });
  }

  if (config.NODE_ENV === 'production' && config.EMAIL_PROVIDER !== 'smtp') {
    context.addIssue({
      code: 'custom',
      message: 'must be smtp in production',
      path: ['EMAIL_PROVIDER'],
    });
  }

  if (config.EMAIL_PROVIDER === 'smtp') {
    if (!config.SMTP_HOST) {
      context.addIssue({
        code: 'custom',
        message: 'is required when EMAIL_PROVIDER is smtp',
        path: ['SMTP_HOST'],
      });
    }

    if (!config.SMTP_USER) {
      context.addIssue({
        code: 'custom',
        message: 'is required when EMAIL_PROVIDER is smtp',
        path: ['SMTP_USER'],
      });
    }

    if (!config.SMTP_PASSWORD) {
      context.addIssue({
        code: 'custom',
        message: 'is required when EMAIL_PROVIDER is smtp',
        path: ['SMTP_PASSWORD'],
      });
    }

    if (!config.EMAIL_FROM_ADDRESS) {
      context.addIssue({
        code: 'custom',
        message: 'is required when EMAIL_PROVIDER is smtp',
        path: ['EMAIL_FROM_ADDRESS'],
      });
    }

    if (config.EMAIL_PREVIEW_ENABLED === 'true') {
      context.addIssue({
        code: 'custom',
        message: 'must be false when EMAIL_PROVIDER is smtp',
        path: ['EMAIL_PREVIEW_ENABLED'],
      });
    }
  }

  if (config.REDIS_REQUIRED === 'true' && config.REDIS_ENABLED !== 'true') {
    context.addIssue({
      code: 'custom',
      message: 'must be true when REDIS_REQUIRED is true',
      path: ['REDIS_ENABLED'],
    });
  }

  if (config.REDIS_URL && !isRedisUrl(config.REDIS_URL)) {
    context.addIssue({
      code: 'custom',
      message: 'must be a valid redis:// or rediss:// URL',
      path: ['REDIS_URL'],
    });
  }

  if (config.REDIS_ENABLED === 'true' && !config.REDIS_URL) {
    context.addIssue({
      code: 'custom',
      message: 'is required when Redis is enabled',
      path: ['REDIS_URL'],
    });
  }
});

const databaseEnvironmentSchema = baseEnvironmentSchema.pick({
  NODE_ENV: true,
  DATABASE_URL: true,
  DATABASE_SSL: true,
  DATABASE_SSL_CA_PATH: true,
  DATABASE_MAX_CONNECTIONS: true,
  DATABASE_CONNECTION_TIMEOUT_MS: true,
  DATABASE_IDLE_TIMEOUT_MS: true,
  DATABASE_QUERY_TIMEOUT_MS: true,
});

const storageEnvironmentSchema = baseEnvironmentSchema.pick({
  SUPABASE_SERVICE_ROLE_KEY: true,
  SUPABASE_STORAGE_BUCKET: true,
  SUPABASE_URL: true,
});

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const result = environmentSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'} ${issue.message}`)
      .join('; ');

    throw new Error(`Environment validation failed: ${details}`);
  }

  return result.data;
}

export function validateDatabaseEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = databaseEnvironmentSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'} ${issue.message}`)
      .join('; ');

    throw new Error(`Environment validation failed: ${details}`);
  }

  return result.data;
}

export function validateStorageEnvironment(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const result = storageEnvironmentSchema.safeParse(config);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'} ${issue.message}`)
      .join('; ');

    throw new Error(`Environment validation failed: ${details}`);
  }

  return result.data;
}
