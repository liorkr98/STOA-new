-- Allow users to create their own profile if the signup trigger didn't run.
create policy profiles_insert_self on profiles
  for insert with check (id = auth.uid());

-- Idempotent profile + wallet bootstrap (e.g. auth user exists but trigger missed).
create or replace function ensure_user_profile()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_email text;
  v_name text;
  v_handle text;
  v_wallet uuid;
begin
  if v_user is null then
    return json_build_object('error', 'Not authenticated');
  end if;

  if exists (select 1 from profiles where id = v_user) then
    return json_build_object('status', 'exists');
  end if;

  select email into v_email from auth.users where id = v_user;
  v_name := coalesce(
    (select raw_user_meta_data ->> 'display_name' from auth.users where id = v_user),
    split_part(v_email, '@', 1)
  );
  v_handle := lower(regexp_replace(split_part(v_email, '@', 1), '[^a-z0-9_]', '_', 'g'));
  if exists (select 1 from profiles where handle = v_handle) then
    v_handle := v_handle || '_' || substr(v_user::text, 1, 4);
  end if;

  insert into profiles (id, handle, display_name)
  values (v_user, v_handle, v_name);

  insert into wallets (owner_id, balance) values (v_user, 100)
  returning id into v_wallet;

  insert into wallet_transactions (wallet_id, owner_id, type, amount, memo)
  values (v_wallet, v_user, 'deposit', 100, 'Welcome credits');

  return json_build_object('status', 'created', 'handle', v_handle);
end;
$$;

grant execute on function ensure_user_profile() to authenticated;
