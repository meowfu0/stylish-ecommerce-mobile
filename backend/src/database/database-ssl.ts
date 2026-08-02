import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ConnectionOptions } from 'node:tls';

export type DatabaseSslConfiguration = boolean | ConnectionOptions;

const CERTIFICATE_BEGIN_MARKER = '-----BEGIN CERTIFICATE-----';
const CERTIFICATE_END_MARKER = '-----END CERTIFICATE-----';
const PRIVATE_KEY_MARKER = 'PRIVATE KEY';

export function createDatabaseSslConfiguration(
  enabled: boolean,
  caPath?: string,
): DatabaseSslConfiguration {
  if (!enabled) {
    return false;
  }

  if (!caPath) {
    return true;
  }

  try {
    const ca = readFileSync(resolve(caPath), 'utf8');
    const isCertificate =
      ca.includes(CERTIFICATE_BEGIN_MARKER) && ca.includes(CERTIFICATE_END_MARKER);

    if (!isCertificate || ca.includes(PRIVATE_KEY_MARKER)) {
      throw new Error('Invalid certificate contents');
    }

    return {
      ca,
      rejectUnauthorized: true,
    };
  } catch {
    throw new Error('Database SSL CA certificate could not be loaded');
  }
}
