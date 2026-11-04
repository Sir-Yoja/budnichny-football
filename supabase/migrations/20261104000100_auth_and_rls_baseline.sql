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
 code_hash text not null, expires_at timestamptz not null,
 attempts integer not null default 0 check(attempts between 0 and 5),
 verified_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists admin_email_challenges_user_created_idx on public.admin_email_challenges(user_id,created_at desc);

alter table public.game_player_stats
 add column if not exists submitted_by uuid references auth.users(id) on delete set null,
 add column if not exists status text not null default 'approved'
   check(status in ('pending','approved','rejected','needs_correction'));

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
 update public.player_link_requests set status=p_decision,note=coalesce(left(p_note,500),note),
  reviewed_by=auth.uid(),reviewed_at=now() where id=p_request_id;
end; $$;

create or replace function public.review_match_stat(p_stat_id bigint,p_decision text,p_note text default null)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if not public.is_site_admin() then raise exception 'admin_required' using errcode='42501'; end if;
 if p_decision not in ('approved','rejected','needs_correction') then raise exception 'invalid_decision'; end if;
 update public.game_player_stats set status=p_decision
 where id=p_stat_id and status='pending';
 if not found then raise exception 'stat_not_pending_or_missing'; end if;
end; $$;

-- Browser cannot directly manipulate account-layer tables.
alter table public.user_profiles enable row level security;
alter table public.invitation_tokens enable row level security;
alter table public.player_link_requests enable row level security;
alter table public.admin_email_challenges enable row level security;
revoke all on public.user_profiles,public.invitation_tokens,public.player_link_requests,public.admin_email_challenges from anon,authenticated;
grant select,insert,update,delete on public.user_profiles,public.player_link_requests,public.invitation_tokens to authenticated;
grant execute on function public.create_invitation(integer,integer) to authenticated;
grant execute on function public.request_player_link(bigint,text,text) to authenticated;
grant execute on function public.review_player_link_request(bigint,text,text) to authenticated;
grant execute on function public.review_match_stat(bigint,text,text) to authenticated;

drop policy if exists user_profiles_read_self_or_admin on public.user_profiles;
create policy user_profiles_read_self_or_admin on public.user_profiles for select to authenticated
 using(user_id=auth.uid() or public.is_site_admin());
drop policy if exists user_profiles_admin_manage on public.user_profiles;
create policy user_profiles_admin_manage on public.user_profiles for all to authenticated
 using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists link_requests_read_own_or_admin on public.player_link_requests;
create policy link_requests_read_own_or_admin on public.player_link_requests for select to authenticated
 using(user_id=auth.uid() or public.is_site_admin());
drop policy if exists link_requests_admin_manage on public.player_link_requests;
create policy link_requests_admin_manage on public.player_link_requests for all to authenticated
 using(public.is_site_admin()) with check(public.is_site_admin());
drop policy if exists invitations_admin_manage on public.invitation_tokens;
create policy invitations_admin_manage on public.invitation_tokens for all to authenticated
 using(public.is_site_admin()) with check(public.is_site_admin());

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
  execute format('create policy %I on public.%I for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin())',t||'_admin_manage',t);
 end loop;
end $$;
create policy game_player_stats_public_approved on public.game_player_stats for select to anon,authenticated using(status='approved');
create policy game_player_stats_admin_manage on public.game_player_stats for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin());
create policy game_player_stats_participant_read_own on public.game_player_stats for select to authenticated using(submitted_by=auth.uid());
create policy game_player_stats_participant_submit on public.game_player_stats for insert to authenticated
 with check(status='pending' and submitted_by=auth.uid() and public.is_linked_participant_for(player_id)
  and exists(select 1 from public.games g where g.id=game_player_stats.game_id
   and g.game_day_id=game_player_stats.game_day_id
   and game_player_stats.team_id in (g.team_a_id,g.team_b_id))
  and exists(select 1 from public.game_day_players dp where dp.game_day_id=game_player_stats.game_day_id
   and dp.player_id=game_player_stats.player_id and dp.team_id=game_player_stats.team_id));

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
