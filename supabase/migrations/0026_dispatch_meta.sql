-- Daily dispatch issue counter (served to masthead as "Issue №N").

create table if not exists public.dispatch_meta (
  singleton boolean primary key default true check (singleton = true),
  issue_number integer not null default 1,
  last_issue_date date not null default ((timezone('America/New_York', now()))::date)
);

insert into public.dispatch_meta (singleton, issue_number, last_issue_date)
values (true, 1, (timezone('America/New_York', now()))::date)
on conflict (singleton) do nothing;

create or replace function public.bump_dispatch_issue()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (timezone('America/New_York', now()))::date;
  v_issue integer;
begin
  insert into dispatch_meta (singleton, issue_number, last_issue_date)
  values (true, 1, v_today)
  on conflict (singleton) do nothing;

  select issue_number into v_issue
    from dispatch_meta
   where singleton
   for update;

  if (select last_issue_date from dispatch_meta where singleton) < v_today then
    update dispatch_meta
       set issue_number = issue_number + 1,
           last_issue_date = v_today
     where singleton
     returning issue_number into v_issue;
  end if;

  return v_issue;
end;
$$;

revoke all on function public.bump_dispatch_issue() from public;
grant execute on function public.bump_dispatch_issue() to anon, authenticated, service_role;

grant select on public.dispatch_meta to anon, authenticated;
