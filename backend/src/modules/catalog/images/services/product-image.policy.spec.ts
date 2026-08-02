import { BadRequestException } from '@nestjs/common';

import { ProductImagePolicy } from './product-image.policy';

describe('ProductImagePolicy', () => {
  const policy = new ProductImagePolicy();

  it('maps only approved image content types to server-generated extensions', () => {
    expect(policy.extensionFor('image/jpeg')).toBe('jpg');
    expect(policy.extensionFor('image/png')).toBe('png');
    expect(policy.extensionFor('image/webp')).toBe('webp');
    expect(() => policy.extensionFor('image/gif')).toThrow(BadRequestException);
  });

  it('rejects unsupported types and files larger than 5 MB', () => {
    expect(() => policy.assertDeclaredFile('image/gif', 100)).toThrow(BadRequestException);
    expect(() => policy.assertDeclaredFile('image/jpeg', 5 * 1024 * 1024 + 1)).toThrow(
      BadRequestException,
    );
  });

  it('requires confirmed object metadata to match the initialization request', () => {
    expect(() =>
      policy.assertUploadedFile(
        { contentType: 'image/png', sizeBytes: 2048 },
        { contentType: 'image/png', sizeBytes: 2048 },
      ),
    ).not.toThrow();
    expect(() =>
      policy.assertUploadedFile(
        { contentType: 'image/png', sizeBytes: 2048 },
        { contentType: 'image/jpeg', sizeBytes: 2048 },
      ),
    ).toThrow(BadRequestException);
    expect(() =>
      policy.assertUploadedFile(
        { contentType: 'image/png', sizeBytes: 2048 },
        { contentType: 'image/png', sizeBytes: 4096 },
      ),
    ).toThrow(BadRequestException);
  });
});
