import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';

type MemoryEntry = {
  expiresAt: number;
  value: string;
};

export type RateLimitResult = {
  count: number;
  resetInMs: number;
};

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly client: ReturnType<typeof createClient> | undefined;
  private readonly defaultTtlSeconds: number;
  private readonly enabled: boolean;
  private readonly fallbackEnabled: boolean;
  private readonly keyPrefix: string;
  private readonly logger = new Logger(RedisService.name);
  private readonly memory = new Map<string, MemoryEntry>();
  private readonly required: boolean;
  private connected = false;

  constructor(configService: ConfigService) {
    this.enabled = configService.getOrThrow<boolean>('redis.enabled');
    this.required = configService.getOrThrow<boolean>('redis.required');
    this.keyPrefix = configService.getOrThrow<string>('redis.keyPrefix');
    this.defaultTtlSeconds = configService.getOrThrow<number>('redis.defaultTtlSeconds');
    this.fallbackEnabled = configService.getOrThrow<string>('app.nodeEnv') !== 'production';

    if (this.enabled) {
      this.client = createClient({
        url: configService.getOrThrow<string>('redis.url'),
        socket: {
          connectTimeout: configService.getOrThrow<number>('redis.connectionTimeoutMs'),
          reconnectStrategy: (retries) =>
            retries >= 3 ? false : Math.min(100 * 2 ** retries, 1000),
        },
      });
      this.client.on('error', () => {
        this.connected = false;
        this.logger.warn({
          event: 'redis.connection.error',
          message: 'Redis connection is unavailable',
        });
      });
      this.client.on('ready', () => {
        this.connected = true;
      });
      this.client.on('end', () => {
        this.connected = false;
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.client) {
      this.logger.log({
        event: 'redis.disabled',
        fallback: this.fallbackEnabled ? 'memory' : 'none',
      });
      return;
    }

    try {
      await this.client.connect();
      this.connected = this.client.isReady;
      this.logger.log({ event: 'redis.connected' });
    } catch {
      this.connected = false;

      if (this.required) {
        throw new Error('Redis is required but unavailable');
      }

      this.logger.warn({
        event: 'redis.connection.unavailable',
        fallback: this.fallbackEnabled ? 'memory' : 'none',
      });
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (!this.client?.isOpen) {
      return;
    }

    try {
      await this.client.quit();
    } catch {
      this.client.destroy();
    } finally {
      this.connected = false;
    }
  }

  isOperational(): boolean {
    return (this.connected && this.client?.isReady === true) || this.fallbackEnabled;
  }

  usingMemoryFallback(): boolean {
    return !(this.connected && this.client?.isReady === true) && this.fallbackEnabled;
  }

  async ping(): Promise<boolean> {
    if (!this.client?.isReady) {
      return false;
    }

    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);

    if (value === null) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      await this.delete(key);
      return null;
    }
  }

  async setJson(
    key: string,
    value: unknown,
    ttlSeconds = this.defaultTtlSeconds,
  ): Promise<boolean> {
    return this.set(key, JSON.stringify(value), ttlSeconds);
  }

  async delete(key: string): Promise<void> {
    const namespacedKey = this.namespaced(key);

    if (this.client?.isReady) {
      try {
        await this.client.del(namespacedKey);
        return;
      } catch {
        // A development fallback may handle the operation below.
      }
    }

    if (this.fallbackEnabled) {
      this.memory.delete(namespacedKey);
    }
  }

  async increment(key: string): Promise<number | null> {
    const namespacedKey = this.namespaced(key);

    if (this.client?.isReady) {
      try {
        return await this.client.incr(namespacedKey);
      } catch {
        // A development fallback may handle the operation below.
      }
    }

    if (!this.fallbackEnabled) {
      return null;
    }

    this.removeExpired(namespacedKey);
    const current = this.memory.get(namespacedKey);
    const next = (current ? Number(current.value) : 0) + 1;

    this.memory.set(namespacedKey, { expiresAt: Number.POSITIVE_INFINITY, value: String(next) });
    return next;
  }

  async acquireLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    const namespacedKey = this.namespaced(`lock:${key}`);

    if (this.client?.isReady) {
      try {
        return (await this.client.set(namespacedKey, token, { NX: true, PX: ttlMs })) === 'OK';
      } catch {
        // A development fallback may handle the operation below.
      }
    }

    if (!this.fallbackEnabled) {
      return false;
    }

    this.removeExpired(namespacedKey);

    if (this.memory.has(namespacedKey)) {
      return false;
    }

    this.memory.set(namespacedKey, { expiresAt: Date.now() + ttlMs, value: token });
    return true;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    const namespacedKey = this.namespaced(`lock:${key}`);

    if (this.client?.isReady) {
      try {
        await this.client.eval(
          "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
          { arguments: [token], keys: [namespacedKey] },
        );
        return;
      } catch {
        // A development fallback may handle the operation below.
      }
    }

    if (this.fallbackEnabled && this.memory.get(namespacedKey)?.value === token) {
      this.memory.delete(namespacedKey);
    }
  }

  async incrementRateLimit(key: string, windowMs: number): Promise<RateLimitResult | null> {
    const namespacedKey = this.namespaced(`rate:${key}`);

    if (this.client?.isReady) {
      try {
        const result = (await this.client.eval(
          "local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; return {current, redis.call('PTTL', KEYS[1])}",
          { arguments: [String(windowMs)], keys: [namespacedKey] },
        )) as [number, number];

        return { count: Number(result[0]), resetInMs: Math.max(Number(result[1]), 0) };
      } catch {
        // A development fallback may handle the operation below.
      }
    }

    if (!this.fallbackEnabled) {
      return null;
    }

    this.removeExpired(namespacedKey);
    const current = this.memory.get(namespacedKey);
    const count = current ? Number(current.value) + 1 : 1;
    const expiresAt = current?.expiresAt ?? Date.now() + windowMs;

    this.memory.set(namespacedKey, { expiresAt, value: String(count) });
    return { count, resetInMs: Math.max(expiresAt - Date.now(), 0) };
  }

  private async get(key: string): Promise<string | null> {
    const namespacedKey = this.namespaced(key);

    if (this.client?.isReady) {
      try {
        return await this.client.get(namespacedKey);
      } catch {
        // A development fallback may handle the operation below.
      }
    }

    if (!this.fallbackEnabled) {
      return null;
    }

    this.removeExpired(namespacedKey);
    return this.memory.get(namespacedKey)?.value ?? null;
  }

  private async set(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    const namespacedKey = this.namespaced(key);

    if (this.client?.isReady) {
      try {
        await this.client.set(namespacedKey, value, { EX: ttlSeconds });
        return true;
      } catch {
        // A development fallback may handle the operation below.
      }
    }

    if (!this.fallbackEnabled) {
      return false;
    }

    this.memory.set(namespacedKey, {
      expiresAt: Date.now() + ttlSeconds * 1000,
      value,
    });
    return true;
  }

  private namespaced(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  private removeExpired(key: string): void {
    const entry = this.memory.get(key);

    if (entry && entry.expiresAt <= Date.now()) {
      this.memory.delete(key);
    }
  }
}
