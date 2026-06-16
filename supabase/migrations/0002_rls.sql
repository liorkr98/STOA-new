-- Row Level Security. Every table is locked down; the service role bypasses RLS
-- for server jobs (seeding, grading, wallet settlement).

alter table profiles enable row level security;
alter table reports enable row level security;
alter table predictions enable row level security;
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table subscriptions enable row level security;
alter table follows enable row level security;
alter table comments enable row level security;
alter table likes enable row level security;
alter table saved_reports enable row level security;
alter table report_views enable row level security;
alter table report_unlocks enable row level security;
alter table notifications enable row level security;
alter table messages enable row level security;

-- ── Profiles: public read, self write ─────────────────────────────────────────
create policy profiles_read on profiles for select using (true);
create policy profiles_update_self on profiles for update using (id = auth.uid());

-- ── Reports: published is public; authors see + manage their own ─────────────
create policy reports_read on reports
  for select using (status = 'published' or author_id = auth.uid());
create policy reports_insert on reports
  for insert with check (author_id = auth.uid());
create policy reports_update on reports
  for update using (author_id = auth.uid());
create policy reports_delete on reports
  for delete using (author_id = auth.uid());

-- ── Predictions: readable when their report is; author inserts; engine resolves
create policy predictions_read on predictions
  for select using (
    exists (
      select 1 from reports r
      where r.id = predictions.report_id
        and (r.status = 'published' or r.author_id = auth.uid())
    )
  );
create policy predictions_insert on predictions
  for insert with check (author_id = auth.uid());

-- ── Wallets + transactions: owner reads only; writes go through SECURITY DEFINER
create policy wallets_read on wallets for select using (owner_id = auth.uid());
create policy wallet_txn_read on wallet_transactions for select using (owner_id = auth.uid());

-- ── Subscriptions: both parties read; settlement via RPC ──────────────────────
create policy subscriptions_read on subscriptions
  for select using (subscriber_id = auth.uid() or analyst_id = auth.uid());

-- ── Follows: public read; self write ──────────────────────────────────────────
create policy follows_read on follows for select using (true);
create policy follows_insert on follows for insert with check (follower_id = auth.uid());
create policy follows_delete on follows for delete using (follower_id = auth.uid());

-- ── Comments: public read; self write/delete ─────────────────────────────────
create policy comments_read on comments for select using (true);
create policy comments_insert on comments for insert with check (author_id = auth.uid());
create policy comments_delete on comments for delete using (author_id = auth.uid());

-- ── Likes / saves / views: self managed ───────────────────────────────────────
create policy likes_read on likes for select using (true);
create policy likes_write on likes for insert with check (user_id = auth.uid());
create policy likes_delete on likes for delete using (user_id = auth.uid());

create policy saved_read on saved_reports for select using (user_id = auth.uid());
create policy saved_write on saved_reports for insert with check (user_id = auth.uid());
create policy saved_delete on saved_reports for delete using (user_id = auth.uid());

create policy views_insert on report_views for insert with check (true);
create policy views_read on report_views for select using (true);

create policy unlocks_read on report_unlocks for select using (user_id = auth.uid());

-- ── Notifications: recipient reads + marks read ───────────────────────────────
create policy notifications_read on notifications for select using (recipient_id = auth.uid());
create policy notifications_update on notifications for update using (recipient_id = auth.uid());

-- ── Messages: either party reads; sender writes ───────────────────────────────
create policy messages_read on messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());
create policy messages_insert on messages for insert with check (sender_id = auth.uid());
create policy messages_update on messages
  for update using (recipient_id = auth.uid());
