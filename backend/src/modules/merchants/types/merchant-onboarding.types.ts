export type ApplicationStatus =
  'DRAFT' | 'SUBMITTED' | 'CHANGES_REQUESTED' | 'APPROVED' | 'REJECTED';

export type MerchantProfileView = {
  bannerStoragePath: string | null;
  description: string | null;
  logoStoragePath: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  websiteUrl: string | null;
};

export type MerchantAddressView = {
  addressLine1: string;
  addressLine2: string | null;
  barangay: string | null;
  city: string;
  contactName: string;
  countryCode: string;
  id: string;
  phone: string;
  postalCode: string;
  province: string;
};

export type VerificationView = {
  id: string;
  rejectionReason: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  status: 'UNVERIFIED' | 'PENDING' | 'CHANGES_REQUESTED' | 'VERIFIED' | 'REJECTED';
  submittedAt: string;
};

export type MerchantApplicationView = {
  applicationStatus: ApplicationStatus;
  businessAddress: MerchantAddressView | null;
  createdAt: string;
  currency: string;
  displayName: string;
  id: string;
  latestVerification: VerificationView | null;
  legalName: string;
  profile: MerchantProfileView | null;
  slug: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  updatedAt: string;
  verificationStatus: 'UNVERIFIED' | 'PENDING' | 'CHANGES_REQUESTED' | 'VERIFIED' | 'REJECTED';
};

export type MerchantApplicationDetailsView = MerchantApplicationView & {
  verificationHistory: VerificationView[];
};

export type ApprovedMerchantView = Omit<
  MerchantApplicationView,
  'applicationStatus' | 'latestVerification'
> & {
  applicationStatus: 'APPROVED';
  commissionRateBasisPoints: number;
};

export type ApplicationListView = {
  items: MerchantApplicationView[];
  nextCursor: string | null;
};
