export const EMAIL_DELIVERY = Symbol('EMAIL_DELIVERY');

export type ActionEmailPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export type ActionEmail = {
  idempotencyKey: string;
  purpose: ActionEmailPurpose;
  rawToken: string;
  recipient: string;
};

export interface EmailDeliveryPort {
  send(message: ActionEmail): Promise<void>;
}
