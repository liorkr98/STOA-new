-- Versioned legal documents and user consent audit trail (go-live compliance §A.2).

create table if not exists legal_documents (
  id uuid primary key default gen_random_uuid(),
  doc_type text not null check (doc_type in ('terms', 'terms_creator', 'privacy', 'cookies')),
  version text not null,
  content_url text not null,
  effective_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (doc_type, version)
);

create index if not exists legal_documents_type_effective_idx
  on legal_documents (doc_type, effective_at desc);

create table if not exists user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  legal_document_id uuid not null references legal_documents (id) on delete restrict,
  accepted_at timestamptz not null default now(),
  ip_address inet,
  unique (user_id, legal_document_id)
);

create index if not exists user_consents_user_idx on user_consents (user_id);

-- Age attestation at signup (§A.4).
alter table profiles
  add column if not exists age_attested_at timestamptz;

comment on column profiles.age_attested_at is
  'Timestamp when the user attested they are 18+ at account creation.';

-- Seed placeholder document versions (content is structural placeholders until counsel delivers).
insert into legal_documents (doc_type, version, content_url, effective_at)
values
  ('terms', '0.0.1-placeholder', '/terms', now()),
  ('terms_creator', '0.0.1-placeholder', '/terms/creators', now()),
  ('privacy', '0.0.1-placeholder', '/privacy', now()),
  ('cookies', '0.0.1-placeholder', '/cookies', now())
on conflict (doc_type, version) do nothing;

alter table legal_documents enable row level security;
alter table user_consents enable row level security;

-- Anyone can read published legal document metadata (version pointers).
create policy legal_documents_read on legal_documents
  for select using (true);

create policy user_consents_read_own on user_consents
  for select using (user_id = auth.uid());

create policy user_consents_insert_own on user_consents
  for insert with check (user_id = auth.uid());

-- Admins can read all consents for compliance audits.
create policy user_consents_admin_read on user_consents
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
  );
