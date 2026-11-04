begin;

-- Trigger functions are invoked by the trigger, not exposed as public RPC endpoints.
revoke all on function public.handle_new_auth_user_profile() from public, anon, authenticated;

-- Wrap auth helpers in scalar subqueries so Postgres evaluates them once per statement.
drop policy if exists user_profiles_read_self_or_admin on public.user_profiles;
create policy user_profiles_read_self_or_admin
on public.user_profiles for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_site_admin()));

drop policy if exists link_requests_read_own_or_admin on public.player_link_requests;
create policy link_requests_read_own_or_admin
on public.player_link_requests for select to authenticated
using (user_id = (select auth.uid()) or (select public.is_site_admin()));

drop policy if exists game_player_stats_authenticated_read on public.game_player_stats;
create policy game_player_stats_authenticated_read
on public.game_player_stats for select to authenticated
using (status = 'approved' or submitted_by = (select auth.uid()) or (select public.is_site_admin()));

-- Combine participant and administrator INSERT paths into one policy.
drop policy if exists game_player_stats_participant_submit on public.game_player_stats;
drop policy if exists game_player_stats_admin_insert on public.game_player_stats;
create policy game_player_stats_insert_authenticated
on public.game_player_stats for insert to authenticated
with check (
  (select public.is_site_admin())
  or (
    status = 'pending'
    and submitted_by = (select auth.uid())
    and goals >= 0 and assists >= 0 and own_goals >= 0 and saves >= 0 and conceded >= 0
    and (select public.is_linked_participant_for(player_id))
    and exists (
      select 1 from public.games g
      where g.id = game_player_stats.game_id
        and g.game_day_id = game_player_stats.game_day_id
        and game_player_stats.team_id in (g.team_a_id, g.team_b_id)
    )
    and exists (
      select 1 from public.game_day_players dp
      where dp.game_day_id = game_player_stats.game_day_id
        and dp.player_id = game_player_stats.player_id
        and dp.team_id = game_player_stats.team_id
    )
  )
);

commit;
