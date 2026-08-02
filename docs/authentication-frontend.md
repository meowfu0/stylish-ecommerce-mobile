# Authentication frontend

Set `EXPO_PUBLIC_API_URL` in a root `.env.local` file. Web and emulators may use
`http://localhost:3000/api`. Android emulators commonly use
`http://10.0.2.2:3000/api`; a physical device must use the development
computer's reachable LAN address.

Native access and refresh tokens are stored with Expo SecureStore using the
device-only, unlocked keychain accessibility setting. On web, the access token
is memory-only and the rotating refresh token is kept in `sessionStorage` so it
does not survive the browser session. Browser storage remains readable by
same-origin JavaScript and therefore cannot offer the same protection as an
HttpOnly cookie. Keep the web app protected from XSS and do not add token
logging, analytics capture, or persistent `localStorage` token storage.

Protected requests automatically attach the access token. A 401 starts one
shared refresh operation, saves the rotated token pair, and retries the original
request once. Refresh rejection clears tokens, the selected workspace, and the
authenticated user so routing returns to Sign In without a retry loop.

Workspace choices are derived only from `/auth/me`. A single context is selected
automatically; multiple contexts use `/auth/choose-workspace`.
