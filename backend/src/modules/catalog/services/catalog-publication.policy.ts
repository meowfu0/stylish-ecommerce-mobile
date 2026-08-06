import { BadRequestException, Injectable } from '@nestjs/common';

export type PublicationSnapshot = {
  description: string | null;
  categoryCount: number;
  options: Array<{ id: string; valueCount: number }>;
  variants: Array<{
    id: string;
    isActive: boolean;
    isDefault: boolean;
    priceCentavos: number;
    optionIds: string[];
  }>;
};

@Injectable()
export class CatalogPublicationPolicy {
  assertPublishable(snapshot: PublicationSnapshot): void {
    const errors: Array<{ field: string; message: string }> = [];
    const activeVariants = snapshot.variants.filter((variant) => variant.isActive);
    const requiredOptionIds = [...snapshot.options.map((option) => option.id)].sort();

    if (!snapshot.description?.trim()) {
      errors.push({ field: 'description', message: 'A product description is required' });
    }

    if (snapshot.categoryCount < 1) {
      errors.push({ field: 'categoryIds', message: 'At least one category is required' });
    }

    if (activeVariants.length < 1) {
      errors.push({ field: 'variants', message: 'At least one active variant is required' });
    }

    if (activeVariants.filter((variant) => variant.isDefault).length !== 1) {
      errors.push({
        field: 'variants',
        message: 'Exactly one active default variant is required',
      });
    }

    if (snapshot.options.some((option) => option.valueCount < 1)) {
      errors.push({
        field: 'options',
        message: 'Every product option must contain at least one value',
      });
    }

    if (activeVariants.some((variant) => variant.priceCentavos <= 0)) {
      errors.push({
        field: 'variants.priceCentavos',
        message: 'Every active variant must have a price greater than zero',
      });
    }

    if (
      activeVariants.some(
        (variant) =>
          [...new Set(variant.optionIds)].sort().join('|') !== requiredOptionIds.join('|'),
      )
    ) {
      errors.push({
        field: 'variants.optionValueIds',
        message: 'Every active variant must select exactly one value for every product option',
      });
    }

    if (errors.length > 0) {
      throw new BadRequestException({ message: 'Product cannot be published', errors });
    }
  }
}
