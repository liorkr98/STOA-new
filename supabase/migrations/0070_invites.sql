-- Invite-only preview. Tokens live only in the URL and an httpOnly cookie;
-- the database stores a sha256 hash so a leaked backup cannot mint access.

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  token_prefix text not null,
  created_by uuid not null references public.profiles (id),
  note text,
  max_uses int not null default 1,
  use_count int not null default 0,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint invites_max_uses_check check (max_uses >= 1 and max_uses <= 50),
  constraint invites_use_count_check check (use_count >= 0 and use_count <= max_uses)
);

create table public.invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.invites (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (invite_id, user_id)
);

create index invites_created_at_idx on public.invites (created_at desc);
create index invite_redemptions_user_idx on public.invite_redemptions (user_id);

comment on table public.invites is
  'Closed-preview invite links. Raw tokens are never stored; only sha256(token).';
comment on table public.invite_redemptions is
  'One row per (invite, user) when a new account is created from an invite.';

alter table public.invites enable row level security;
alter table public.invite_redemptions enable row level security;

revoke all on table public.invites from public, anon, authenticated;
revoke all on table public.invite_redemptions from public, anon, authenticated;
