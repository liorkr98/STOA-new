-- Defense in depth: the idempotent mint path must not create credits either.
-- 0068 already revoked EXECUTE from anon/authenticated; this disables the body.

create or replace function top_up_idem(p_amount numeric, p_client_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'demo top-up is disabled';
end;
$$;

revoke all on function public.top_up_idem(numeric, uuid) from public, anon, authenticated;
grant execute on function public.top_up_idem(numeric, uuid) to service_role;
