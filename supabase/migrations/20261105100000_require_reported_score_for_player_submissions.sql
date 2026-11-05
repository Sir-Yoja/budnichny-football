alter table public.game_player_stats
  add constraint game_player_stats_pending_submission_requires_score
  check (
    status <> 'pending'
    or submitted_by is null
    or (reported_score_a is not null and reported_score_b is not null)
  );
