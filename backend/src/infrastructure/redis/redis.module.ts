import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service';
import { RedisRateLimitGuard } from './redis-rate-limit.guard';
import { RedisOperationCoordinator } from './redis-operation-coordinator.service';

@Global()
@Module({
  exports: [RedisOperationCoordinator, RedisRateLimitGuard, RedisService],
  providers: [RedisOperationCoordinator, RedisRateLimitGuard, RedisService],
})
export class RedisModule {}
