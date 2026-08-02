import { createDatabaseSslConfiguration } from './database-ssl';

describe('createDatabaseSslConfiguration', () => {
  it('disables TLS when database SSL is disabled', () => {
    expect(createDatabaseSslConfiguration(false, './missing.crt')).toBe(false);
  });

  it('uses the runtime trust store when no CA path is configured', () => {
    expect(createDatabaseSslConfiguration(true)).toBe(true);
  });

  it('loads the configured CA while keeping certificate verification enabled', () => {
    const ssl = createDatabaseSslConfiguration(true, './certs/supabase-ca.crt');

    expect(typeof ssl).toBe('object');

    if (typeof ssl !== 'object') {
      throw new Error('Expected an SSL configuration object');
    }

    expect(ssl.rejectUnauthorized).toBe(true);
    expect(typeof ssl.ca).toBe('string');

    if (typeof ssl.ca !== 'string') {
      throw new Error('Expected the SSL CA to be a string');
    }

    expect(ssl.ca).toContain('-----BEGIN CERTIFICATE-----');
  });

  it('fails safely when the configured CA cannot be loaded', () => {
    expect(() => createDatabaseSslConfiguration(true, './certs/missing.crt')).toThrow(
      'Database SSL CA certificate could not be loaded',
    );
  });
});
