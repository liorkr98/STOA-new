-- Prevent authenticated users from self-editing trust/scoring/system fields
-- on `profiles` via broad RLS update access.
--
-- This keeps profile personalization editable while reserving privileged fields
-- (role/score/tier/etc.) for grading jobs, admin flows, and security-definer
-- functions.

create or replace function guard_profiles_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only restrict true self-edits from authenticated user sessions.
  if auth.uid() is not null and auth.uid() = old.id then
    if new.role is distinct from old.role then
      raise exception 'role is platform-managed';
    end if;
    if new.score is distinct from old.score then
      raise exception 'score is platform-managed';
    end if;
    if new.rating is distinct from old.rating then
      raise exception 'rating is platform-managed';
    end if;
    if new.tier is distinct from old.tier then
      raise exception 'tier is platform-managed';
    end if;
    if new.followers_count is distinct from old.followers_count then
      raise exception 'followers_count is platform-managed';
    end if;
    if new.verified is distinct from old.verified then
      raise exception 'verified is platform-managed';
    end if;
    if new.identity_verified is distinct from old.identity_verified then
      raise exception 'identity_verified is platform-managed';
    end if;
    if new.wilson_win_rate is distinct from old.wilson_win_rate then
      raise exception 'wilson_win_rate is platform-managed';
    end if;
    if new.profit_factor is distinct from old.profit_factor then
      raise exception 'profit_factor is platform-managed';
    end if;
    if new.avg_return is distinct from old.avg_return then
      raise exception 'avg_return is platform-managed';
    end if;
    if new.avg_alpha is distinct from old.avg_alpha then
      raise exception 'avg_alpha is platform-managed';
    end if;
    if new.sample_size is distinct from old.sample_size then
      raise exception 'sample_size is platform-managed';
    end if;
    if new.referred_by is distinct from old.referred_by then
      raise exception 'referred_by is platform-managed';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_self_update on profiles;
create trigger profiles_guard_self_update
before update on profiles
for each row execute function guard_profiles_self_update();
