# Security rollout — draft

This branch introduces a two-step administrator login in the React shell. Password authentication is followed by a six-digit email challenge sent by the `admin-email-code` Edge Function. The UI checks `is_site_admin()` before rendering administrator controls.

## Required secrets for the Edge Function
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `ADMIN_CODE_PEPPER` (long random secret)
- `RESEND_FROM_EMAIL`
- `APP_ORIGIN`

Never commit secrets or put the service-role key in browser code.

## Important release blockers
- This migration is a draft and has not been run against staging or production.
- The current Edge Function uses a best-effort attempt counter; strict atomic one-time verification and distributed rate limiting still require a database RPC/transaction and integration tests.
- Telegram, Yandex and VK OAuth provider credentials and callback settings must be configured in Supabase by the owner.
- Invitation creation, player-link approval and participant match-stat submission/moderation screens are not implemented in this branch yet.
- Audit all existing Storage policies and bucket visibility before rollout.
- Take a database backup and run the migration against a staging clone first.
- Do not deploy this branch or apply the migration to production until the above items are complete.
