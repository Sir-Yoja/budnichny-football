-- Public, minimal badge metadata for the player leaderboard.
-- This function intentionally exposes only player IDs and two public badge booleans.
create or replace function public.get_player_account_badges()
returns table (
  player_id bigint,
  telegram_connected boolean,
  is_admin boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    up.linked_player_id as player_id,
    coalesce(u.raw_app_meta_data -> 'providers', '[]'::jsonb) ? 'custom:telegram' as telegram_connected,
    u.id = '888c101b-d99b-4e8c-8c68-ff0a7e61badd'::uuid as is_admin
  from public.user_profiles as up
  join auth.users as u on u.id = up.user_id
  where up.linked_player_id is not null;
$function$;

revoke all on function public.get_player_account_badges() from public;
grant execute on function public.get_player_account_badges() to anon, authenticated;
