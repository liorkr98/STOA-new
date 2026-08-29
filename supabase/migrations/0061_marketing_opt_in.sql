-- Optional marketing-email preference. Not required to create or use an account.
-- Source of truth for sending is profiles.marketing_opt_in (off by default).
-- A versioned legal_documents row records the copy the user opted into.

alter table profiles
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz;

comment on column profiles.marketing_opt_in is
  'True when the user opted in to product and research emails. Off by default. Withdraw in Settings.';

alter table legal_documents drop constraint if exists legal_documents_doc_type_check;
alter table legal_documents
  add constraint legal_documents_doc_type_check
  check (doc_type in ('terms', 'terms_creator', 'privacy', 'cookies', 'marketing'));

insert into legal_documents (doc_type, version, content_url, effective_at)
values ('marketing', '0.0.1-placeholder', '/privacy#section-marketing-emails', now())
on conflict (doc_type, version) do nothing;
