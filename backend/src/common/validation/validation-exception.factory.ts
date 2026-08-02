import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

import type { ApiErrorItem } from '../types/api-response.types';

function flattenValidationErrors(errors: ValidationError[], parentPath = ''): ApiErrorItem[] {
  return errors.flatMap((error) => {
    const field = parentPath ? `${parentPath}.${error.property}` : error.property;
    const ownErrors = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    const childErrors = flattenValidationErrors(error.children ?? [], field);

    return [...ownErrors, ...childErrors];
  });
}

export function createValidationException(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    message: 'Validation failed',
    errors: flattenValidationErrors(errors),
  });
}
