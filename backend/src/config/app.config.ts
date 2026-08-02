import { registerAs } from '@nestjs/config';

function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export default registerAs('app', () => ({
  apiPrefix: process.env.API_PREFIX ?? 'api',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  swaggerEnabled: process.env.SWAGGER_ENABLED !== 'false',
}));
