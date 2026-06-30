-- Profile branding: customizable sections, banner style, specialties.

alter table profiles
  add column if not exists profile_config jsonb not null default '{}'::jsonb;

comment on column profiles.profile_config is
  'Branding JSON: sections order, specialties, social links, banner_style, featured tickers.';
