-- DRAFT ONLY. Review and test on a staging clone before production.
-- Account roles, invitations, player-link requests, per-match moderation, RLS.
begin;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.user_profiles(
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null default 'guest' check(role in ('guest','participant')),
 linked_player_id bigint unique references public.players(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.invitation_tokens(
 id bigint generated always as identity primary key,
 token_hash text not null unique,
 created_by uuid not null references auth.users(id),
 max_uses integer not null default 1 check(max_uses between 1 and 10),
 uses integer not null default 0 check(uses>=0 and uses<=max_uses),
 expires_at timestamptz not null, revoked_at timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.player_link_requests(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 player_id bigint not null references public.players(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','approved','rejected','needs_correction')),
 note text, reviewed_by uuid references auth.users(id), reviewed_at timestamptz,
 created_at timestamptz not null default now()
);
create unique index if not exists player_link_requests_one_pending_per_player on public.player_link_requests(player_id) where status='pending';
create unique index if not exists player_link_requests_one_pending_per_user on public.player_link_requests(user_id) where status='pending';

create table if not exists public.admin_email_challenges(
 id bigint generated always as identity primary key,
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id uuid not null,
 code_hash text not null, expires_at timestamptz not null,
 attempts integer not null default 0 check(attempts between 0 and 5),
 verified_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists admin_email_challenges_user_created_idx on public.admin_email_challenges(user_id,created_at desc);
create index if not exists admin_email_challenges_session_created_idx
 on public.admin_email_challenges(user_id,session_id,created_at desc);

-- Serialize challenge issuance and enforce cooldown per authenticated session.
create or replace function public.issue_admin_email_challenge(
 p_user_id uuid,p_session_id uuid,p_code_hash text,p_expires_at timestamptz
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare last_created timestamptz; new_id bigint;
begin
 if p_user_id is distinct from '888c101b-d99b-4e8c-8c68-ff0a7e61badd'::uuid
    or p_session_id is null or p_code_hash is null
    or p_expires_at<=now() or p_expires_at>now()+interval '5 minutes' then
  raise exception 'invalid_challenge_request' using errcode='22023';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_session_id::text,0));
 select created_at into last_created from public.admin_email_challenges
  where user_id=p_user_id and session_id=p_session_id
  order by created_at desc limit 1;
 if last_created is not null and last_created>now()-interval '60 seconds' then
  return jsonb_build_object('status','cooldown');
 end if;
 delete from public.admin_email_challenges
  where user_id=p_user_id and session_id=p_session_id;
 insert into public.admin_email_challenges(user_id,session_id,code_hash,expires_at,attempts)
 values(p_user_id,p_session_id,p_code_hash,p_expires_at,0)
 returning id into new_id;
 return jsonb_build_object('status','created','challenge_id',new_id);
end; $$;
revoke all on function public.issue_admin_email_challenge(uuid,uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.issue_admin_email_challenge(uuid,uuid,text,timestamptz) to service_role;


alter table public.game_player_stats
 add column if not exists submitted_by uuid references auth.users(id) on delete set null,
 add column if not exists status text not null default 'approved'
   check(status in ('pending','approved','rejected','needs_correction')),
 add column if not exists moderation_note text;

alter table public.player_link_requests add column if not exists review_note text;

do $$
begin
 if not exists(select 1 from pg_constraint where conname='game_player_stats_nonnegative_counts' and conrelid='public.game_player_stats'::regclass) then
  alter table public.game_player_stats add constraint game_player_stats_nonnegative_counts
   check(goals>=0 and assists>=0 and own_goals>=0 and saves>=0 and conceded>=0);
 end if;
end; $$;


create or replace function public.handle_new_auth_user_profile()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.user_profiles(user_id,role) values(new.id,'guest') on conflict(user_id) do nothing;
 return new;
end; $$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute procedure public.handle_new_auth_user_profile();
insert into public.user_profiles(user_id,role) select id,'guest' from auth.users on conflict(user_id) do nothing;

create or replace function public.is_site_admin()
returns boolean language sql stable security definer set search_path=''
as $$
 select auth.uid()='888c101b-d99b-4e8c-8c68-ff0a7e61badd'::uuid
 and exists(select 1 from public.admin_email_challenges c where c.user_id=auth.uid()
  and c.session_id=(auth.jwt()->>'session_id')::uuid
  and c.verified_at is not null and c.verified_at>now()-interval '15 minutes');
$$;
create or replace function public.is_linked_participant_for(p_player_id bigint)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.user_profiles p where p.user_id=auth.uid()
  and p.role='participant' and p.linked_player_id=p_player_id);
$$;

-- Invitation links are random one-time/multi-use tokens. Only their SHA-256 digest is stored.
create or replace function public.create_invitation(p_max_uses integer default 1,p_ttl_days integer default 14)
returns text language plpgsql security definer set search_path=''
as $$
declare raw_token text; token_digest text;
begin
 if not public.is_site_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if p_max_uses<1 or p_max_uses>10 or p_ttl_days<1 or p_ttl_days>60 then raise exception 'invalid_invitation_settings'; end if;
 raw_token:=encode(extensions.gen_random_bytes(32),'hex');
 token_digest:=encode(extensions.digest(convert_to(raw_token,'UTF8'),'sha256'),'hex');
 insert into public.invitation_tokens(token_hash,created_by,max_uses,expires_at)
 values(token_digest,auth.uid(),p_max_uses,now()+make_interval(days=>p_ttl_days));
 return raw_token;
end; $$;

create or replace function public.request_player_link(p_player_id bigint,p_invitation_token text,p_note text default null)
returns bigint language plpgsql security definer set search_path=''
as $$
declare me uuid:=auth.uid(); invite_id bigint; new_id bigint; token_digest text;
begin
 if me is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_invitation_token is null or length(p_invitation_token)<32 then raise exception 'valid_invitation_required'; end if;
 if exists(select 1 from public.user_profiles where user_id=me and linked_player_id is not null) then raise exception 'account_already_linked'; end if;
 if not exists(select 1 from public.players where id=p_player_id) then raise exception 'player_not_found'; end if;
 if exists(select 1 from public.user_profiles where linked_player_id=p_player_id) then raise exception 'player_already_linked'; end if;
 token_digest:=encode(extensions.digest(convert_to(p_invitation_token,'UTF8'),'sha256'),'hex');
 select id into invite_id from public.invitation_tokens
  where token_hash=token_digest and revoked_at is null and expires_at>now() and uses<max_uses
  for update;
 if invite_id is null then raise exception 'invitation_invalid_or_expired'; end if;
 if exists(select 1 from public.player_link_requests where user_id=me and status='pending') then raise exception 'request_already_pending'; end if;
 if exists(select 1 from public.player_link_requests where player_id=p_player_id and status='pending') then raise exception 'player_request_pending'; end if;
 update public.invitation_tokens set uses=uses+1 where id=invite_id;
 insert into public.player_link_requests(user_id,player_id,status,note)
 values(me,p_player_id,'pending',left(p_note,500)) returning id into new_id;
 return new_id;
end; $$;

create or replace function public.review_player_link_request(p_request_id bigint,p_decision text,p_note text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare req public.player_link_requests%rowtype;
begin
 if not public.is_site_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if p_decision not in ('approved','rejected','needs_correction') then raise exception 'invalid_decision'; end if;
 select * into req from public.player_link_requests where id=p_request_id for update;
 if req.id is null or req.status<>'pending' then raise exception 'request_not_pending'; end if;
 if p_decision='approved' then
  if exists(select 1 from public.user_profiles where linked_player_id=req.player_id and user_id<>req.user_id) then raise exception 'player_already_linked'; end if;
  if exists(select 1 from public.user_profiles where user_id=req.user_id and linked_player_id is not null and linked_player_id<>req.player_id) then raise exception 'account_already_linked'; end if;
  insert into public.user_profiles(user_id,role,linked_player_id) values(req.user_id,'participant',req.player_id)
  on conflict(user_id) do update set role='participant',linked_player_id=excluded.linked_player_id,updated_at=now();
 end if;
 update public.player_link_requests set status=p_decision,
  review_note=case when p_note is null then review_note else left(p_note,500) end,
  reviewed_by=auth.uid(),reviewed_at=now() where id=p_request_id;
end; $$;

create or replace function public.review_match_stat(p_stat_id bigint,p_decision text,p_note text default null)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if not public.is_site_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if p_decision not in ('approved','rejected','needs_correction') then raise exception 'invalid_decision'; end if;
 update public.game_player_stats set status=p_decision,moderation_note=nullif(left(p_note,500),'')
 where id=p_stat_id and status='pending';
 if not found then raise exception 'stat_not_pending_or_missing'; end if;
end; $$;


-- Atomic, one-time challenge consumption. Only service_role may call this RPC.
create or replace function public.consume_admin_email_challenge(p_user_id uuid,p_code_hash text,p_session_id uuid)
returns text language plpgsql security definer set search_path=''
as $$
declare c public.admin_email_challenges%rowtype;
begin
 select * into c from public.admin_email_challenges
  where user_id=p_user_id and session_id=p_session_id order by created_at desc limit 1 for update;
 if c.id is null or c.verified_at is not null or c.expires_at<=now() then return 'expired'; end if;
 if c.attempts>=5 then return 'locked'; end if;
 if c.code_hash<>p_code_hash then
  update public.admin_email_challenges set attempts=attempts+1 where id=c.id;
  return 'invalid';
 end if;
 update public.admin_email_challenges set verified_at=now() where id=c.id and verified_at is null;
 if not found then return 'expired'; end if;
 return 'verified';
end; $$;
revoke all on function public.consume_admin_email_challenge(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.consume_admin_email_challenge(uuid,text,uuid) to service_role;


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
 update public.game_player_stats set
  goals=greatest(0,coalesce((p_payload->>'goals')::integer,0)),
  assists=greatest(0,coalesce((p_payload->>'assists')::integer,0)),
  own_goals=greatest(0,coalesce((p_payload->>'own_goals')::integer,0)),
  saves=greatest(0,coalesce((p_payload->>'saves')::integer,0)),
  conceded=greatest(0,coalesce((p_payload->>'conceded')::integer,0)),
  goalkeeper=coalesce((p_payload->>'goalkeeper')::boolean,false),
  status='pending',moderation_note=null
 where id=p_stat_id;
end; $$;
revoke all on function public.resubmit_match_stat(bigint,jsonb) from public,anon;
grant execute on function public.resubmit_match_stat(bigint,jsonb) to authenticated;

create or replace function public.revoke_invitation(p_invitation_id bigint)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if not public.is_site_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 update public.invitation_tokens set revoked_at=now() where id=p_invitation_id and revoked_at is null;
 if not found then raise exception 'invitation_not_found_or_revoked'; end if;
end; $$;
revoke all on function public.revoke_invitation(bigint) from public,anon;
grant execute on function public.revoke_invitation(bigint) to authenticated;


-- Security-definer RPCs are not executable by anonymous callers.
revoke all on function public.is_site_admin() from public,anon;
grant execute on function public.is_site_admin() to authenticated;
revoke all on function public.is_linked_participant_for(bigint) from public,anon;
grant execute on function public.is_linked_participant_for(bigint) to authenticated;
revoke all on function public.create_invitation(integer,integer) from public,anon;
revoke all on function public.request_player_link(bigint,text,text) from public,anon;
revoke all on function public.review_player_link_request(bigint,text,text) from public,anon;
revoke all on function public.review_match_stat(bigint,text,text) from public,anon;

-- Browser cannot directly manipulate account-layer tables.
alter table public.user_profiles enable row level security;
alter table public.invitation_tokens enable row level security;
alter table public.player_link_requests enable row level security;
alter table public.admin_email_challenges enable row level security;
revoke all on public.user_profiles,public.invitation_tokens,public.player_link_requests,public.admin_email_challenges from anon,authenticated;
grant select on public.user_profiles,public.player_link_requests,public.invitation_tokens to authenticated;
grant execute on function public.create_invitation(integer,integer) to authenticated;
grant execute on function public.request_player_link(bigint,text,text) to authenticated;
grant execute on function public.review_player_link_request(bigint,text,text) to authenticated;
grant execute on function public.review_match_stat(bigint,text,text) to authenticated;

drop policy if exists user_profiles_read_self_or_admin on public.user_profiles;
create policy user_profiles_read_self_or_admin on public.user_profiles for select to authenticated
 using(user_id=auth.uid() or public.is_site_admin());
drop policy if exists user_profiles_admin_manage on public.user_profiles;
drop policy if exists user_profiles_admin_manage on public.user_profiles;
drop policy if exists link_requests_read_own_or_admin on public.player_link_requests;
create policy link_requests_read_own_or_admin on public.player_link_requests for select to authenticated
 using(user_id=auth.uid() or public.is_site_admin());
drop policy if exists link_requests_admin_manage on public.player_link_requests;
drop policy if exists link_requests_admin_manage on public.player_link_requests;
drop policy if exists invitations_admin_manage on public.invitation_tokens;
create policy invitations_admin_read on public.invitation_tokens for select to authenticated using(public.is_site_admin());

-- Remove legacy permissive policies: PostgreSQL combines permissive policies with OR.
do $$
declare t text; p record;
begin
 foreach t in array array['game_day_players','game_days','game_player_stats','games','match_players','matches','players','teams'] loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy if exists %I on public.%I',p.policyname,t);
  end loop;
  execute format('alter table public.%I enable row level security',t);
  execute format('alter table public.%I force row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to anon,authenticated',t);
  execute format('grant insert,update,delete on public.%I to authenticated',t);
 end loop;
end $$;
grant usage,select on all sequences in schema public to authenticated;

-- Public league data; unapproved participant submissions are never public.
do $$
declare t text;
begin
 foreach t in array array['game_day_players','game_days','games','match_players','matches','players','teams'] loop
  execute format('create policy %I on public.%I for select to anon,authenticated using(true)',t||'_public_read',t);
  execute format('create policy %I on public.%I for insert to authenticated with check(public.is_site_admin())',t||'_admin_insert',t);
  execute format('create policy %I on public.%I for update to authenticated using(public.is_site_admin()) with check(public.is_site_admin())',t||'_admin_update',t);
  execute format('create policy %I on public.%I for delete to authenticated using(public.is_site_admin())',t||'_admin_delete',t);
 end loop;
end $$;
create policy game_player_stats_public_approved on public.game_player_stats for select to anon using(status='approved');
create policy game_player_stats_authenticated_read on public.game_player_stats for select to authenticated
 using(status='approved' or submitted_by=auth.uid() or public.is_site_admin());
create policy game_player_stats_participant_submit on public.game_player_stats for insert to authenticated
 with check(status='pending' and submitted_by=auth.uid()
  and goals>=0 and assists>=0 and own_goals>=0 and saves>=0 and conceded>=0
  and public.is_linked_participant_for(player_id)
  and exists(select 1 from public.games g where g.id=game_player_stats.game_id
   and g.game_day_id=game_player_stats.game_day_id
   and game_player_stats.team_id in (g.team_a_id,g.team_b_id))
  and exists(select 1 from public.game_day_players dp where dp.game_day_id=game_player_stats.game_day_id
   and dp.player_id=game_player_stats.player_id and dp.team_id=game_player_stats.team_id));
create policy game_player_stats_admin_delete on public.game_player_stats for delete to authenticated
 using(public.is_site_admin());
revoke update on public.game_player_stats from authenticated;

-- Admin-only image writes. Review all existing Storage policies and bucket visibility before rollout.
drop policy if exists game_day_images_insert_authenticated on storage.objects;
drop policy if exists game_day_images_delete_authenticated on storage.objects;
drop policy if exists game_day_images_admin_insert on storage.objects;
drop policy if exists game_day_images_admin_delete on storage.objects;
create policy game_day_images_admin_insert on storage.objects for insert to authenticated
 with check(bucket_id='game-day-images' and public.is_site_admin());
create policy game_day_images_admin_delete on storage.objects for delete to authenticated
 using(bucket_id='game-day-images' and public.is_site_admin());

commit;
-- Not yet production-ready: deploy/test edge functions, client flows, storage and OAuth on staging first.
