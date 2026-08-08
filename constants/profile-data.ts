export type ProfileFormValues = {
  accountHolderName: string;
  address: string;
  bankAccountNumber: string;
  city: string;
  country: string;
  email: string;
  ifscCode: string;
  password: string;
  pincode: string;
  state: string;
};

export const MOCK_PROFILE: ProfileFormValues = {
  accountHolderName: "Demo Shopper",
  address: "216 St Paul's Rd,",
  bankAccountNumber: "0000000000428",
  city: "London",
  country: "United Kingdom",
  email: "shopper@example.com",
  ifscCode: "MOCK0001",
  password: "MockPass123!",
  pincode: "450116",
  state: "N1 2LL",
};

export const MOCK_STATE_OPTIONS = ["N1 2LL", "SW1A 1AA", "M1 1AE"] as const;
