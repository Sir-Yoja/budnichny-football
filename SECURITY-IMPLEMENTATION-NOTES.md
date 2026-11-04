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
- Invalid-code attempts and one-time challenge consumption are serialized by the `consume_admin_email_challenge` database RPC. The challenge is bound to the Supabase Auth `session_id`, so another login session cannot reuse a recently verified challenge. The 60-second send cooldown is still a best-effort check in the Edge Function and needs distributed rate-limit testing.
- Telegram, Yandex and VK OAuth provider credentials and callback settings must be configured in Supabase by the owner.
- The branch includes UI for invitation creation, player-link request review, per-match participant submissions and admin moderation. Review feedback is stored separately from the applicant's original note and displayed in the account cabinet.
- Audit all existing Storage policies and bucket visibility before rollout. The migration only replaces specifically named `game-day-images` policies; any other permissive Storage policy must be reviewed explicitly.
- Take a database backup and run the migration against a staging clone first.
- Do not deploy this branch or apply the migration to production until the above items are complete.


## Changes made during the follow-up review
- Fixed malformed dollar-quote delimiters in the three PL/pgSQL functions that consume the admin challenge, resubmit match statistics and revoke invitations.
- Added separate review-feedback fields for player-link requests and match-stat moderation so administrator comments do not overwrite the user's original note.
- Tightened match-stat resubmission ownership with `IS DISTINCT FROM`, including rows whose `submitted_by` value is NULL; stale moderator feedback is cleared when a correction is resubmitted.
- Bound administrator email verification to the authenticated Supabase session rather than only the administrator user ID.
- The player cabinet now loads its submitted match-stat statuses and displays moderator feedback.

## Remaining release blockers
- Verify every referenced table column, type, foreign key and unique constraint against the live schema or a staging clone.
- Review the broad RLS policy replacement against all existing application flows before applying it; the migration intentionally replaces legacy policies on eight league tables.
- Verify all write paths in the legacy iframe and all Storage policies.
- Configure and test Yandex/VK OAuth credentials and callback URLs. Telegram login and signature verification are not implemented.
- Run SQL migration tests, role-based integration tests and a full production build on staging. No migration has been applied and no Edge Function has been deployed by this branch.
