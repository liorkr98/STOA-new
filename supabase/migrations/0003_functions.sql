-- Triggers + secure wallet settlement functions.

-- ── updated_at maintenance ────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reports_updated_at before update on reports
  for each row execute function set_updated_at();
create trigger wallets_updated_at before update on wallets
  for each row execute function set_updated_at();

-- ── New auth user -> profile + wallet with demo starting credits ──────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_handle text;
  v_name text;
  v_wallet uuid;
begin
  v_name := coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1));
  v_handle := coalesce(new.raw_user_meta_data ->> 'handle', split_part(new.email, '@', 1));
  -- Ensure handle uniqueness with a short suffix if needed.
  if exists (select 1 from profiles where handle = v_handle) then
    v_handle := v_handle || '_' || substr(new.id::text, 1, 4);
  end if;

  insert into profiles (id, handle, display_name)
  values (new.id, v_handle, v_name);

  insert into wallets (owner_id, balance) values (new.id, 100)
  returning id into v_wallet;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, memo)
  values (v_wallet, new.id, 'deposit', 100, 'Welcome credits');

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ── Engagement counters ───────────────────────────────────────────────────────
create or replace function bump_like()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update reports set likes = likes + 1 where id = new.report_id;
  elsif tg_op = 'DELETE' then
    update reports set likes = greatest(0, likes - 1) where id = old.report_id;
  end if;
  return null;
end;
$$;

create trigger likes_counter after insert or delete on likes
  for each row execute function bump_like();

create or replace function bump_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update reports set comment_count = comment_count + 1 where id = new.report_id;
  elsif tg_op = 'DELETE' then
    update reports set comment_count = greatest(0, comment_count - 1) where id = old.report_id;
  end if;
  return null;
end;
$$;

create trigger comments_counter after insert or delete on comments
  for each row execute function bump_comment();

create or replace function bump_follow()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update profiles set followers_count = followers_count + 1 where id = new.analyst_id;
  elsif tg_op = 'DELETE' then
    update profiles set followers_count = greatest(0, followers_count - 1) where id = old.analyst_id;
  end if;
  return null;
end;
$$;

create trigger follows_counter after insert or delete on follows
  for each row execute function bump_follow();

-- ── View counter ──────────────────────────────────────────────────────────────
create or replace function increment_views(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update reports set views = views + 1 where id = p_report_id;
end;
$$;

-- ── Pay-per-report unlock (atomic, 90/10 split) ──────────────────────────────
create or replace function purchase_report(p_report_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_buyer uuid := auth.uid();
  v_report reports%rowtype;
  v_price numeric(12, 2);
  v_cut numeric(12, 2);
  v_share numeric(12, 2);
  v_buyer_wallet wallets%rowtype;
  v_author_wallet_id uuid;
  v_author_price numeric(10, 2);
begin
  if v_buyer is null then
    raise exception 'not authenticated';
  end if;

  select * into v_report from reports where id = p_report_id;
  if not found then raise exception 'report not found'; end if;
  if v_report.access <> 'paid' then raise exception 'report is not pay-per-report'; end if;
  if v_report.author_id = v_buyer then raise exception 'cannot purchase your own report'; end if;

  if exists (select 1 from report_unlocks where report_id = p_report_id and user_id = v_buyer) then
    return jsonb_build_object('status', 'already_unlocked');
  end if;

  select coalesce(v_report.price, report_price) into v_author_price
    from profiles where id = v_report.author_id;
  v_price := coalesce(v_report.price, v_author_price, 0);
  if v_price <= 0 then raise exception 'report has no price'; end if;

  select * into v_buyer_wallet from wallets where owner_id = v_buyer for update;
  if v_buyer_wallet.balance < v_price then raise exception 'insufficient balance'; end if;

  v_cut := round(v_price * 0.10, 2);
  v_share := v_price - v_cut;

  update wallets set balance = balance - v_price where owner_id = v_buyer;

  select id into v_author_wallet_id from wallets where owner_id = v_report.author_id for update;
  update wallets
    set balance = balance + v_share, earnings = earnings + v_share
    where id = v_author_wallet_id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_buyer_wallet.id, v_buyer, 'report_unlock', -v_price, p_report_id, v_report.title);

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_author_wallet_id, v_report.author_id, 'payout', v_share, p_report_id, 'Report sale (90%)');

  insert into report_unlocks (report_id, user_id) values (p_report_id, v_buyer);

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (v_report.author_id, v_buyer, 'sale', 'Someone unlocked your report', '/report/' || p_report_id);

  return jsonb_build_object(
    'status', 'unlocked',
    'spent', v_price,
    'platform_fee', v_cut,
    'author_share', v_share,
    'new_balance', v_buyer_wallet.balance - v_price
  );
end;
$$;

-- ── Demo top-up (simulated deposit; replace with Stripe later) ───────────────
create or replace function top_up(p_amount numeric)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_wallet wallets%rowtype;
begin
  if v_user is null then raise exception 'not authenticated'; end if;
  if p_amount <= 0 or p_amount > 1000 then raise exception 'invalid amount'; end if;

  select * into v_wallet from wallets where owner_id = v_user for update;
  update wallets set balance = balance + p_amount where owner_id = v_user;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, memo)
  values (v_wallet.id, v_user, 'deposit', p_amount, 'Demo top-up');

  return jsonb_build_object('status', 'ok', 'new_balance', v_wallet.balance + p_amount);
end;
$$;

-- ── Subscribe to an analyst (atomic, 90/10 split) ────────────────────────────
create or replace function subscribe_to_analyst(p_analyst_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_buyer uuid := auth.uid();
  v_price numeric(10, 2);
  v_cut numeric(12, 2);
  v_share numeric(12, 2);
  v_buyer_wallet wallets%rowtype;
  v_author_wallet_id uuid;
begin
  if v_buyer is null then raise exception 'not authenticated'; end if;
  if v_buyer = p_analyst_id then raise exception 'cannot subscribe to yourself'; end if;

  if exists (
    select 1 from subscriptions
    where subscriber_id = v_buyer and analyst_id = p_analyst_id and status = 'active'
  ) then
    return jsonb_build_object('status', 'already_subscribed');
  end if;

  select sub_price into v_price from profiles where id = p_analyst_id;
  if v_price is null or v_price <= 0 then raise exception 'analyst has no subscription price'; end if;

  select * into v_buyer_wallet from wallets where owner_id = v_buyer for update;
  if v_buyer_wallet.balance < v_price then raise exception 'insufficient balance'; end if;

  v_cut := round(v_price * 0.10, 2);
  v_share := v_price - v_cut;

  update wallets set balance = balance - v_price where owner_id = v_buyer;
  select id into v_author_wallet_id from wallets where owner_id = p_analyst_id for update;
  update wallets set balance = balance + v_share, earnings = earnings + v_share
    where id = v_author_wallet_id;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_buyer_wallet.id, v_buyer, 'subscription', -v_price, p_analyst_id, 'Monthly subscription');

  insert into wallet_transactions (wallet_id, owner_id, type, amount, related_id, memo)
  values (v_author_wallet_id, p_analyst_id, 'payout', v_share, p_analyst_id, 'Subscription (90%)');

  insert into subscriptions (subscriber_id, analyst_id, status, price)
  values (v_buyer, p_analyst_id, 'active', v_price)
  on conflict (subscriber_id, analyst_id)
  do update set status = 'active', price = excluded.price,
    started_at = now(), renews_at = now() + interval '30 days';

  insert into notifications (recipient_id, actor_id, kind, body, link)
  values (p_analyst_id, v_buyer, 'subscribe', 'You have a new subscriber', null);

  return jsonb_build_object(
    'status', 'subscribed',
    'spent', v_price,
    'platform_fee', v_cut,
    'author_share', v_share,
    'new_balance', v_buyer_wallet.balance - v_price
  );
end;
$$;

-- ── Expire lapsed subscriptions (called by the hourly cron) ───────────────────
create or replace function expire_subscriptions()
returns int language plpgsql security definer set search_path = public as $$
declare
  v_count int;
begin
  update subscriptions
  set status = 'expired'
  where status = 'active' and renews_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
