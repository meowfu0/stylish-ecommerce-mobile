import 'dotenv/config';

import { createClient } from 'redis';

async function checkRedis(): Promise<void> {
  const enabled = process.env.REDIS_ENABLED === 'true';

  if (!enabled) {
    process.stdout.write(
      `${JSON.stringify({ connected: false, enabled: false, status: 'disabled' })}\n`,
    );
    return;
  }

  const url = process.env.REDIS_URL;

  if (!url || !['redis:', 'rediss:'].includes(new URL(url).protocol)) {
    throw new Error('REDIS_URL is missing or invalid');
  }

  const client = createClient({
    socket: {
      connectTimeout: Number(process.env.REDIS_CONNECTION_TIMEOUT_MS ?? 3000),
      reconnectStrategy: false,
    },
    url,
  });
  client.on('error', () => undefined);

  try {
    await client.connect();
    const connected = (await client.ping()) === 'PONG';
    process.stdout.write(
      `${JSON.stringify({ connected, enabled: true, status: connected ? 'ready' : 'unavailable' })}\n`,
    );

    if (!connected) {
      process.exitCode = 1;
    }
  } finally {
    if (client.isOpen) {
      await client.quit();
    }
  }
}

void checkRedis().catch(() => {
  process.stderr.write(
    `${JSON.stringify({ connected: false, enabled: true, status: 'unavailable' })}\n`,
  );
  process.exitCode = 1;
});
