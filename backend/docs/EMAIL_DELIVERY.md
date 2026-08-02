# Email delivery

Stylish uses a provider-neutral email port. Local development can write safe
email previews to `backend/.email-previews`, while the SMTP provider sends the
same verification and password-reset templates through Nodemailer.

Raw verification and password-reset tokens are never logged or stored in plain
text in PostgreSQL. SMTP credentials are server-only and must never be placed in
Expo configuration, Swagger, Postman, source control, or API responses.

## Local preview mode

Use this while developing without sending real email:

```env
EMAIL_PROVIDER=preview
EMAIL_PREVIEW_ENABLED=true
EMAIL_PREVIEW_DIRECTORY=.email-previews
AUTH_FRONTEND_URL=stylish://auth
```

Registration, resend-verification, and forgot-password requests create a `.txt`
file in `backend/.email-previews`. The directory is ignored by Git.

## Gmail SMTP with a Google App Password

Nodemailer is the SMTP client. Gmail is a convenient free sender for development
and small demonstrations, but it is not intended for a production marketplace or
high-volume automated delivery.

1. Choose the Gmail account that Stylish will send from.
2. Enable 2-Step Verification on that Google Account.
3. Open Google Account security settings and create an App Password named
   `Stylish Backend`.
4. Copy the generated 16-character App Password once. Do not use the normal
   Gmail password.
5. Configure `backend/.env`:

```env
EMAIL_PROVIDER=smtp
EMAIL_PREVIEW_ENABLED=false
EMAIL_PREVIEW_DIRECTORY=.email-previews

SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your.sender@gmail.com
SMTP_PASSWORD=replace_with_google_app_password
SMTP_CONNECTION_TIMEOUT_MS=10000

EMAIL_FROM_ADDRESS=your.sender@gmail.com
EMAIL_FROM_NAME=Stylish
EMAIL_REPLY_TO=your.sender@gmail.com
AUTH_FRONTEND_URL=stylish://auth
```

For Gmail, keep `EMAIL_FROM_ADDRESS` equal to `SMTP_USER`; Gmail can rewrite a
different From address to the authenticated account. `EMAIL_REPLY_TO` is
optional. Paste the App Password without spaces and never disclose it.

Restart the backend after changing environment variables. Validation stops
startup when SMTP is selected without its host, username, App Password, or sender
address; when preview output remains enabled; or when production uses the preview
provider.

## Verify real delivery

1. Start the backend with `npm run start:dev`.
2. Register a new account using an inbox you control.
3. Confirm the registration API succeeds.
4. Check the recipient inbox, spam folder, and the backend's sanitized
   `email.smtp.accepted` event.
5. Open the verification link and complete email verification.
6. Test `POST /api/auth/resend-verification` and
   `POST /api/auth/forgot-password` with Postman.

SMTP does not provide transactional API-level idempotency. Stylish supplies a
stable Message-ID based on the database action-token operation, but PostgreSQL
remains the source of truth for token validity and one-time consumption.

## Troubleshooting

- **App Password option is missing:** confirm 2-Step Verification is enabled.
  Some organization-managed, security-key-only, or Advanced Protection accounts
  may not allow App Passwords.
- **`EAUTH` or SMTP 535:** use the Google-generated App Password, not the normal
  Gmail password. Generate a new App Password if necessary.
- **Backend fails during startup:** inspect only the variable name in the
  validation error; never paste SMTP credentials into logs or chat.
- **Email not received:** check spam, Google Account security activity, and the
  sanitized backend event.
- **Deep link does not open:** confirm the app handles the route produced from
  `AUTH_FRONTEND_URL`.
- **Return to local previews:** restore `EMAIL_PROVIDER=preview` and
  `EMAIL_PREVIEW_ENABLED=true`.

For production, replace Gmail SMTP with a dedicated transactional email provider
or Gmail OAuth 2.0 without changing the authentication module's email port.
