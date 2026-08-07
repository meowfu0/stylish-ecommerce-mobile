import { ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

import { NodemailerEmailService } from './nodemailer-email.service';

const createConfigService = (): ConfigService => {
  const values: Record<string, unknown> = {
    'auth.frontendUrl': 'stylish://auth',
    'email.from.address': 'stylish.sender@gmail.com',
    'email.from.name': 'Velori',
    'email.replyTo': 'stylish.sender@gmail.com',
    'email.smtp.connectionTimeoutMs': 10_000,
    'email.smtp.host': 'smtp.gmail.com',
    'email.smtp.password': 'test-app-password',
    'email.smtp.port': 465,
    'email.smtp.secure': true,
    'email.smtp.user': 'stylish.sender@gmail.com',
  };

  return {
    get: jest.fn((key: string) => values[key]),
    getOrThrow: jest.fn((key: string) => {
      const value = values[key];
      if (value === undefined) {
        throw new Error(`Missing test configuration: ${key}`);
      }
      return value;
    }),
  } as unknown as ConfigService;
};

describe('NodemailerEmailService', () => {
  it('sends a transactional email with a stable message identifier', async () => {
    const sendMail = jest.fn().mockResolvedValue({
      accepted: ['customer@example.com'],
      messageId: '<auth.email_verification.43819b6c-43c4-457e-9cd0-6bc3bb1af65e@stylish.local>',
      pending: [],
      rejected: [],
      response: '250 accepted',
    });
    const service = new NodemailerEmailService(createConfigService(), { sendMail });

    await expect(
      service.send({
        idempotencyKey: '43819b6c-43c4-457e-9cd0-6bc3bb1af65e',
        purpose: 'EMAIL_VERIFICATION',
        rawToken: 'raw-action-token',
        recipient: 'customer@example.com',
      }),
    ).resolves.toBeUndefined();

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Velori <stylish.sender@gmail.com>',
        messageId: '<auth.email_verification.43819b6c-43c4-457e-9cd0-6bc3bb1af65e@stylish.local>',
        replyTo: 'stylish.sender@gmail.com',
        subject: 'Verify your Velori email',
        to: 'customer@example.com',
      }),
    );
  });

  it('returns a safe service-unavailable error when SMTP delivery fails', async () => {
    const sendMail = jest.fn().mockRejectedValue(
      Object.assign(new Error('provider detail that must not reach an API response'), {
        code: 'EAUTH',
        command: 'AUTH PLAIN',
        responseCode: 535,
      }),
    );
    const service = new NodemailerEmailService(createConfigService(), { sendMail });

    await expect(
      service.send({
        idempotencyKey: 'e743ad8e-420f-4acd-a085-04df239283ab',
        purpose: 'PASSWORD_RESET',
        rawToken: 'raw-action-token',
        recipient: 'customer@example.com',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
