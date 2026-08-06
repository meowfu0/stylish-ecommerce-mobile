import authConfig from './auth.config';

describe('auth configuration', () => {
  const originalNodeEnvironment = process.env.NODE_ENV;
  const originalSessionLimit = process.env.AUTH_MAX_ACTIVE_SESSIONS;

  afterEach(() => {
    if (originalNodeEnvironment === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnvironment;
    }

    if (originalSessionLimit === undefined) {
      delete process.env.AUTH_MAX_ACTIVE_SESSIONS;
    } else {
      process.env.AUTH_MAX_ACTIVE_SESSIONS = originalSessionLimit;
    }
  });

  it('does not block local development logins at the active-session limit', () => {
    process.env.NODE_ENV = 'development';
    process.env.AUTH_MAX_ACTIVE_SESSIONS = '5';

    expect(authConfig().maxActiveSessions).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('retains the configured active-session limit outside development', () => {
    process.env.NODE_ENV = 'production';
    process.env.AUTH_MAX_ACTIVE_SESSIONS = '5';

    expect(authConfig().maxActiveSessions).toBe(5);
  });
});
