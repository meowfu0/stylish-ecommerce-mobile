import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  from: {
    address: process.env.EMAIL_FROM_ADDRESS,
    name: process.env.EMAIL_FROM_NAME ?? 'Velori',
  },
  previewEnabled: process.env.EMAIL_PREVIEW_ENABLED === 'true',
  previewDirectory: process.env.EMAIL_PREVIEW_DIRECTORY ?? '.email-previews',
  provider: process.env.EMAIL_PROVIDER ?? 'preview',
  replyTo: process.env.EMAIL_REPLY_TO,
  smtp: {
    connectionTimeoutMs: Number(process.env.SMTP_CONNECTION_TIMEOUT_MS ?? 10000),
    host: process.env.SMTP_HOST,
    password: process.env.SMTP_PASSWORD,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== 'false',
    user: process.env.SMTP_USER,
  },
}));
