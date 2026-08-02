import { BadRequestException } from '@nestjs/common';

import { CatalogPublicationPolicy } from './catalog-publication.policy';
import type { PublicationSnapshot } from './catalog-publication.policy';

describe('CatalogPublicationPolicy', () => {
  const policy = new CatalogPublicationPolicy();
  const complete: PublicationSnapshot = {
    categoryCount: 1,
    description: 'A complete product description.',
    options: [
      { id: 'color', valueCount: 2 },
      { id: 'size', valueCount: 3 },
    ],
    variants: [
      {
        id: 'variant-1',
        isActive: true,
        isDefault: true,
        optionIds: ['color', 'size'],
        priceCentavos: 129_900,
      },
    ],
  };

  it('accepts a complete product with one active default variant', () => {
    expect(() => policy.assertPublishable(complete)).not.toThrow();
  });

  it('returns actionable errors for incomplete publication data', () => {
    try {
      policy.assertPublishable({
        categoryCount: 0,
        description: null,
        options: [{ id: 'color', valueCount: 0 }],
        variants: [
          {
            id: 'variant-1',
            isActive: true,
            isDefault: false,
            optionIds: [],
            priceCentavos: 0,
          },
        ],
      });
      throw new Error('Expected publication validation to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = (error as BadRequestException).getResponse() as {
        errors: Array<{ field: string }>;
        message: string;
      };
      expect(response.message).toBe('Product cannot be published');
      expect(response.errors.map(({ field }) => field)).toEqual(
        expect.arrayContaining([
          'description',
          'categoryIds',
          'variants',
          'options',
          'variants.priceCentavos',
          'variants.optionValueIds',
        ]),
      );
    }
  });

  it('rejects multiple active default variants', () => {
    expect(() =>
      policy.assertPublishable({
        ...complete,
        variants: [complete.variants[0]!, { ...complete.variants[0]!, id: 'variant-2' }],
      }),
    ).toThrow(BadRequestException);
  });
});
