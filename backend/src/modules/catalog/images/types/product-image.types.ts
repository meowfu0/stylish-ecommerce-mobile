export type ProductImageView = {
  id: string;
  merchantId: string;
  productId: string;
  altText: string | null;
  contentType: string;
  sizeBytes: number;
  displayOrder: number;
  isPrimary: boolean;
  signedUrl: string | null;
  readUrlExpiresAt: string | null;
  confirmedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ProductImageUploadRequestView = {
  imageId: string;
  productId: string;
  contentType: string;
  fileSizeBytes: number;
  storagePath: string;
  uploadUrl: string;
  uploadToken: string;
  expiresAt: string;
};

export type ProductImageDeleteView = {
  deleted: true;
  imageId: string;
};
