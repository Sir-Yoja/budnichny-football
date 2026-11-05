-- Player-reported match scores and optional comments for moderation.
alter table public.game_player_stats
  add column if not exists reported_score_a integer,
  add column if not exists reported_score_b integer,
  add column if not exists player_comment text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='game_player_stats_reported_score_pair'
      and conrelid='public.game_player_stats'::regclass
  ) then
    alter table public.game_player_stats
      add constraint game_player_stats_reported_score_pair
      check (
        (reported_score_a is null and reported_score_b is null)
        or
        (reported_score_a is not null and reported_score_b is not null
         and reported_score_a >= 0 and reported_score_b >= 0)
      );
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='game_player_stats_player_comment_length'
      and conrelid='public.game_player_stats'::regclass
  ) then
    alter table public.game_player_stats
      add constraint game_player_stats_player_comment_length
      check (player_comment is null or char_length(player_comment) <= 1000);
  end if;
end $$;

create index if not exists idx_game_player_stats_game_status
  on public.game_player_stats(game_id,status);

create or replace function public.resubmit_match_stat(p_stat_id bigint,p_payload jsonb)
returns void language plpgsql security definer set search_path=''
as $$
declare old public.game_player_stats%rowtype; me uuid:=auth.uid();
begin
 if me is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select * into old from public.game_player_stats where id=p_stat_id for update;
 if old.id is null or old.submitted_by is distinct from me or old.status<>'needs_correction' then
  raise exception 'stat_not_eligible_for_resubmission' using errcode='42501';
 end if;
 if not public.is_linked_participant_for(old.player_id) then raise exception 'participant_link_required'; end if;
 if coalesce((p_payload->>'game_id')::bigint,0)<>old.game_id then raise exception 'game_id_mismatch'; end if;
 if coalesce((p_payload->>'reported_score_a')::integer,-1)<0
    or coalesce((p_payload->>'reported_score_b')::integer,-1)<0 then
  raise exception 'valid_match_score_required' using errcode='22023';
 end if;
 update public.game_player_stats set
  goals=greatest(0,coalesce((p_payload->>'goals')::integer,0)),
  assists=greatest(0,coalesce((p_payload->>'assists')::integer,0)),
  own_goals=greatest(0,coalesce((p_payload->>'own_goals')::integer,0)),
  saves=greatest(0,coalesce((p_payload->>'saves')::integer,0)),
  conceded=greatest(0,coalesce((p_payload->>'conceded')::integer,0)),
  goalkeeper=coalesce((p_payload->>'goalkeeper')::boolean,false),
  reported_score_a=(p_payload->>'reported_score_a')::integer,
  reported_score_b=(p_payload->>'reported_score_b')::integer,
  player_comment=nullif(left(coalesce(p_payload->>'player_comment',''),1000),''),
  status='pending',moderation_note=null
 where id=p_stat_id;
end; $$;
