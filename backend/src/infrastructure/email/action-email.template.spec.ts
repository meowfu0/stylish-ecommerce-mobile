import { buildActionEmailContent } from './action-email.template';

describe('buildActionEmailContent', () => {
  it('builds an encoded email-verification link with HTML and text fallbacks', () => {
    const result = buildActionEmailContent('stylish://auth/', {
      idempotencyKey: '8fc17e09-2a14-4cb0-8f86-7c4d9a79dd70',
      purpose: 'EMAIL_VERIFICATION',
      rawToken: 'token with reserved?/characters',
      recipient: 'customer@example.com',
    });

    expect(result.link).toBe(
      'stylish://auth/verify-email?token=token%20with%20reserved%3F%2Fcharacters',
    );
    expect(result.subject).toBe('Verify your Velori email');
    expect(result.html).toContain('Verify Email');
    expect(result.text).toContain(result.link);
  });

  it('builds a password-reset message with the approved expiration notice', () => {
    const result = buildActionEmailContent('https://app.stylish.example/auth', {
      idempotencyKey: '70b7c891-f25f-4cf7-a71f-757544353f20',
      purpose: 'PASSWORD_RESET',
      rawToken: 'safe-token',
      recipient: 'customer@example.com',
    });

    expect(result.link).toBe('https://app.stylish.example/auth/reset-password?token=safe-token');
    expect(result.subject).toBe('Reset your Velori password');
    expect(result.text).toContain('expires in 30 minutes');
  });
});
