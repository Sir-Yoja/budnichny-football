# Security rollout — production database phase complete

## Production changes completed
- Applied `20261104000100_auth_and_rls_baseline.sql` and `20261104120000_auth_rls_hardening.sql` to Supabase production.
- Verified the first migration with a transaction-only dry run before applying it.
- Preserved all 486 existing `game_player_stats` rows.
- Replaced permissive legacy write policies on league tables with admin-only writes and participant-only pending-stat submissions.
- Enabled RLS for account tables and restricted challenge storage to server-side service access.
- Confirmed the public `game-day-images` bucket remains public for reads; writes, updates and deletes are restricted to the verified administrator.
- Deployed `admin-email-code` Edge Function with JWT verification enabled.
- Tested administrator and guest authorization, invitation creation, player-link request/approval, participant stat submission, moderation, correction/resubmission and final approval in a rollback-only SQL transaction. No test records were retained.
- Confirmed anonymous users can read public players but cannot insert players or match statistics.

## Current account flows
- Player account: Telegram OIDC (`custom:telegram`) or email/password.
- Telegram OIDC provider was configured in Supabase by the project owner. Callback:
  `https://hucunqgqsspwjcvozzll.supabase.co/auth/v1/callback`
- Player-link requests require an invitation token and administrator approval.
- Participant statistics are submitted per match and remain non-public until approved.
- Administrator access is separate: email/password followed by a short-lived email code bound to the current Supabase Auth session.

## Required production Edge Function secrets
Set these in Supabase Dashboard → Edge Functions → Secrets:
- `APP_ORIGINS=https://budnichny-football.ru,https://sir-yoja.github.io`
- `RESEND_API_KEY` — Resend API key.
- `ADMIN_CODE_PEPPER` — independently generated high-entropy secret (at least 32 random bytes).
- `RESEND_FROM_EMAIL` — optional, but use a sender address on a verified domain for production delivery.

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions by default. Never place service-role credentials in frontend code or Git.

## Remaining release gates
1. Configure the secrets above and verify real delivery of the administrator code.
2. Run a live Telegram browser login and create a real test participant account.
3. Test player linking, participant submission, admin correction/approval and rating visibility in the browser.
4. Run final GitHub Actions checks on the exact PR head.
5. Merge the PR and verify GitHub Pages and `https://budnichny-football.ru`.

The frontend has not yet been merged or published. Keep the PR in Draft until the live login and mail tests pass.
