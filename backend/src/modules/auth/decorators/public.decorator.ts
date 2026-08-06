import { SetMetadata } from '@nestjs/common';

import { IS_PUBLIC_METADATA } from '../constants/auth.constants';

export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_METADATA, true);
