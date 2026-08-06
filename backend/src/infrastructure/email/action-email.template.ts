import type { ActionEmail, ActionEmailPurpose } from './email-delivery.types';

export type ActionEmailContent = {
  actionLabel: string;
  html: string;
  link: string;
  subject: string;
  text: string;
};

const emailCopy: Record<
  ActionEmailPurpose,
  {
    action: 'reset-password' | 'verify-email';
    actionLabel: string;
    expiry: string;
    introduction: string;
    subject: string;
    title: string;
  }
> = {
  EMAIL_VERIFICATION: {
    action: 'verify-email',
    actionLabel: 'Verify Email',
    expiry: 'This verification link expires in 24 hours.',
    introduction: 'Confirm your email address to finish creating your Stylish account.',
    subject: 'Verify your Stylish email',
    title: 'Verify your email',
  },
  PASSWORD_RESET: {
    action: 'reset-password',
    actionLabel: 'Reset Password',
    expiry: 'This password-reset link expires in 30 minutes.',
    introduction: 'Use the secure link below to choose a new password for your Stylish account.',
    subject: 'Reset your Stylish password',
    title: 'Create a new password',
  },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function buildActionEmailContent(
  frontendUrl: string,
  message: ActionEmail,
): ActionEmailContent {
  const copy = emailCopy[message.purpose];
  const baseUrl = frontendUrl.replace(/\/+$/, '');
  const link = `${baseUrl}/${copy.action}?token=${encodeURIComponent(message.rawToken)}`;
  const safeLink = escapeHtml(link);

  return {
    actionLabel: copy.actionLabel,
    link,
    subject: copy.subject,
    text: [
      copy.title,
      '',
      copy.introduction,
      '',
      link,
      '',
      copy.expiry,
      '',
      'If you did not request this, you can safely ignore this email.',
    ].join('\n'),
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(copy.subject)}</title>
  </head>
  <body style="margin:0;background:#f9f9f9;font-family:Montserrat,Arial,sans-serif;color:#17223b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e7eb;border-radius:16px;">
            <tr>
              <td style="padding:40px;">
                <div style="font-size:28px;font-weight:700;color:#f83758;margin-bottom:28px;">Stylish</div>
                <h1 style="font-size:28px;line-height:36px;margin:0 0 12px;">${escapeHtml(copy.title)}</h1>
                <p style="font-size:15px;line-height:24px;color:#676767;margin:0 0 28px;">${escapeHtml(copy.introduction)}</p>
                <a href="${safeLink}" style="display:block;background:#f83758;color:#ffffff;text-decoration:none;text-align:center;font-size:16px;font-weight:600;line-height:20px;padding:18px 24px;border-radius:8px;">${escapeHtml(copy.actionLabel)}</a>
                <p style="font-size:12px;line-height:18px;color:#676767;margin:24px 0 0;">${escapeHtml(copy.expiry)}</p>
                <p style="font-size:12px;line-height:18px;color:#676767;margin:8px 0 0;">If you did not request this, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}
