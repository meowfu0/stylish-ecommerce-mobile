import { SetMetadata } from '@nestjs/common';

export const API_MESSAGE_METADATA = 'stylish:api-message';

export const ApiMessage = (message: string): MethodDecorator =>
  SetMetadata(API_MESSAGE_METADATA, message);
