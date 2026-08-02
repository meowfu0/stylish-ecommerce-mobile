import { BadRequestException } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';

import { storefrontSlugPattern } from './dto/storefront-request.dto';

export class StorefrontSlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const slug = value.trim().toLowerCase();

    if (!storefrontSlugPattern.test(slug) || slug.length > 220) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: [{ field: 'slug', message: 'A valid lowercase storefront slug is required' }],
      });
    }
    return slug;
  }
}
