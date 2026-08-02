export const PRODUCT_IMAGE_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const SUPABASE_STORAGE_REQUEST_TIMEOUT_MS = 10_000;
export const SUPABASE_STORAGE_CLIENT = Symbol('SUPABASE_STORAGE_CLIENT');
