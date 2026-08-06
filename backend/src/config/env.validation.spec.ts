import { validateEnvironment } from './env.validation';

const validEnvironment = (): Record<string, unknown> => ({
  API_PREFIX: 'api',
  AUTH_FRONTEND_URL: 'stylish://auth',
  AUTH_MAX_ACTIVE_SESSIONS: '5',
  AUTH_RATE_LIMIT_WINDOW_MS: '60000',
  CORS_ORIGINS: 'http://localhost:8081',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/stylish',
  EMAIL_PREVIEW_ENABLED: 'false',
  EMAIL_PROVIDER: 'preview',
  EMAIL_VERIFICATION_EXPIRES_IN: '24h',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_ACCESS_SECRET: 'access-secret-that-is-at-least-32-characters',
  JWT_AUDIENCE: 'stylish-test',
  JWT_ISSUER: 'stylish-test',
  JWT_REFRESH_EXPIRES_IN: '30d',
  JWT_REFRESH_SECRET: 'different-refresh-secret-at-least-32-characters',
  NODE_ENV: 'test',
  PASSWORD_RESET_EXPIRES_IN: '30m',
  REDIS_ENABLED: 'false',
  REDIS_REQUIRED: 'false',
  SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_test_server_only_key_for_validation',
  SUPABASE_STORAGE_BUCKET: 'product-images',
  SUPABASE_URL: 'https://test-project.supabase.co',
});

describe('environment validation', () => {
  it('accepts a TLS Redis URL when Redis is enabled and required', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        REDIS_ENABLED: 'true',
        REDIS_REQUIRED: 'true',
        REDIS_URL: 'rediss://user:password@redis.example.com:6380',
      }),
    ).not.toThrow();
  });

  it('rejects required Redis when it is disabled or has an invalid URL', () => {
    expect(() => validateEnvironment({ ...validEnvironment(), REDIS_REQUIRED: 'true' })).toThrow(
      'REDIS_ENABLED',
    );
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        REDIS_ENABLED: 'true',
        REDIS_URL: 'https://redis.example.com',
      }),
    ).toThrow('REDIS_URL');
  });

  it('requires a private-server Supabase configuration for product images', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment(), SUPABASE_STORAGE_BUCKET: 'public-images' }),
    ).toThrow('SUPABASE_STORAGE_BUCKET');
    expect(() =>
      validateEnvironment({ ...validEnvironment(), SUPABASE_URL: 'http://localhost:54321' }),
    ).toThrow('SUPABASE_URL');
  });

  it('requires SMTP credentials and a sender when the SMTP provider is selected', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        EMAIL_PROVIDER: 'smtp',
      }),
    ).toThrow('SMTP_HOST');

    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        EMAIL_FROM_ADDRESS: 'stylish.sender@gmail.com',
        EMAIL_PROVIDER: 'smtp',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PASSWORD: 'test-app-password',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'stylish.sender@gmail.com',
      }),
    ).not.toThrow();
  });

  it('rejects the preview provider in production', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment(),
        EMAIL_PROVIDER: 'preview',
        NODE_ENV: 'production',
      }),
    ).toThrow('EMAIL_PROVIDER');
  });
});
