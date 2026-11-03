# AirBreakfast

AirBreakfast is a static accommodation-listing demo. Search and filters narrow the sample listings in the browser; date matching uses demo minimum-stay values and does not check live availability.

The Help Center and customer profile are available from the account menu. Email/password authentication uses Supabase Auth for sign-up, sign-in, persistent sessions, sign-out, email confirmation, and password resets. Signed-in users can edit their display name and preferences and sync saved stays across browsers; signed-out favorites remain local to the current browser. Profile fields and saved stays are stored in Supabase Auth user metadata (user-editable, not suitable for authorization or sensitive data). The product-update checkbox only saves a preference; no marketing emails are sent.

This is not a production booking system. A real service needs trusted backend handling for availability and confirmed reservations; browser-side checks and user-editable metadata must not be used as authorization or as the source of truth for bookings.

For local setup, copy `supabase-config.example.js` to `supabase-config.js` and enter your Supabase project URL and publishable/anon key. The local config is ignored by Git. The publishable/anon key is designed to be visible in client-side code; it is not a secret, so secure your data with correct Supabase Row Level Security policies. Never put a Supabase secret/service-role key in browser code or commit it. If a secret key was exposed, revoke/rotate it in Supabase. In Supabase, enable email authentication and add the app's local and deployed URLs to Auth's allowed redirect URLs. Serve the site over HTTP(S) (ES modules do not work from `file://`). Reservation requests are submitted to Formspree and are not confirmed bookings; the form sends the entered email, dates, guest count, and property details.

Email verification and password-reset messages are subject to Supabase/provider rate limits. For a disposable development project, email confirmation can be disabled in Supabase Auth settings to test immediate sign-up; for email-delivery testing, configure custom SMTP and review the project's Auth email rate limits. These settings are managed by Supabase and cannot be bypassed by the webpage. Re-enable appropriate verification before production.

About information is available from the “About us” menu. Hosting information remains available from the footer's “Try hosting” link. The project can display optional listing videos when a direct MP4/WebM URL is set as a property's `videoUrl` in `script.js`; listing photos remain the fallback when no video is configured.

Run the unit tests with:

```sh
npm test
```

Install Chromium once, then run the browser interaction tests:

```sh
npx playwright install chromium
npm run test:e2e
```

Run both suites with `npm run test:all`.

<img width="1504" height="1145" alt="Screenshot 2026-01-12 at 10 29 49 PM" src="https://github.com/user-attachments/assets/e7968359-eafc-411a-bc23-592b333ef46d" />
