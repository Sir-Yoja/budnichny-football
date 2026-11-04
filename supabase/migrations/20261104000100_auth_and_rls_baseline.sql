-- DRAFT ONLY: review on a Supabase staging project before production.
begin;

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'guest' check (role in ('guest','participant')),
  linked_player_id bigint unique references public.players(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.admin_email_challenges (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0 check (attempts between 0 and 5),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists admin_email_challenges_user_created_idx
  on public.admin_email_challenges(user_id,created_at desc);

create or replace function public.handle_new_auth_user_profile()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into public.user_profiles(user_id,role) values(new.id,'guest')
  on conflict(user_id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute procedure public.handle_new_auth_user_profile();
insert into public.user_profiles(user_id,role) select id,'guest' from auth.users
on conflict(user_id) do nothing;

create or replace function public.is_site_admin()
returns boolean language sql stable security definer set search_path=''
as $$
  select auth.uid()='888c101b-d99b-4e8c-8c68-ff0a7e61badd'::uuid
  and exists(select 1 from public.admin_email_challenges c
    where c.user_id=auth.uid() and c.verified_at is not null
    and c.verified_at > now()-interval '15 minutes');
$$;
create or replace function public.is_linked_participant_for(p_player_id bigint)
returns boolean language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.user_profiles p where p.user_id=auth.uid()
    and p.role='participant' and p.linked_player_id=p_player_id);
$$;

alter table public.user_profiles enable row level security;
alter table public.admin_email_challenges enable row level security;
revoke all on public.user_profiles,public.admin_email_challenges from anon,authenticated;
grant select,update on public.user_profiles to authenticated;
drop policy if exists user_profiles_self_or_admin_read on public.user_profiles;
create policy user_profiles_self_or_admin_read on public.user_profiles for select to authenticated
using(user_id=auth.uid() or public.is_site_admin());
drop policy if exists user_profiles_admin_update on public.user_profiles;
create policy user_profiles_admin_update on public.user_profiles for update to authenticated
using(public.is_site_admin()) with check(public.is_site_admin());

-- Remove every old permissive policy before adding the restrictive policy set.
do $$
declare t text; p record;
begin
 foreach t in array array['game_day_players','game_days','game_player_stats','games','match_players','matches','players','teams'] loop
  for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy if exists %I on public.%I',p.policyname,t);
  end loop;
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to anon,authenticated',t);
  execute format('grant insert,update,delete on public.%I to authenticated',t);
  execute format('create policy %I on public.%I for select to anon,authenticated using(true)',t||'_public_read',t);
  execute format('create policy %I on public.%I for all to authenticated using(public.is_site_admin()) with check(public.is_site_admin())',t||'_admin_manage',t);
 end loop;
end $$;
grant usage,select on all sequences in schema public to authenticated;

alter table public.game_player_stats
 add column if not exists submitted_by uuid references auth.users(id) on delete set null,
 add column if not exists status text not null default 'approved'
 check(status in ('pending','approved','rejected','needs_correction'));
create policy game_player_stats_participant_submit on public.game_player_stats
for insert to authenticated with check(status='pending' and submitted_by=auth.uid()
 and public.is_linked_participant_for(player_id));

-- Challenges are Edge-Function-only; no browser grants.
revoke all on public.admin_email_challenges from anon,authenticated;
commit;
