alter table public.players
  add column if not exists debuff_enabled boolean not null default false,
  add column if not exists debuff_amount numeric(5,2) not null default 0;

alter table public.players
  drop constraint if exists players_debuff_amount_check;

alter table public.players
  add constraint players_debuff_amount_check
  check (debuff_amount >= 0 and debuff_amount <= 10);
