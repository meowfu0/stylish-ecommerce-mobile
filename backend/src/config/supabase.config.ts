import { registerAs } from '@nestjs/config';

const projectOrigin = (value: string): string => new URL(value).origin;

export default registerAs('supabase', () => ({
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  signedReadTtlSeconds: 300,
  signedUploadTtlSeconds: 7200,
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET as string,
  // The dashboard can surface /rest/v1 URLs; Storage always needs the project origin.
  url: projectOrigin(process.env.SUPABASE_URL as string),
}));
