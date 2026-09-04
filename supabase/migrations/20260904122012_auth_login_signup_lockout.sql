-- Server-side auth throttling for password login and signup attempts.
-- Password failures: 5 consecutive failures trigger a lockout.
-- Repeated lockouts double in duration: 1m, 2m, 4m ... up to 24h.
-- Signup attempts are throttled per normalized email using the same progression.

create table if not exists public.auth_password_lockouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  lock_level integer not null default 0 check (lock_level >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.auth_signup_rate_limits (
  email text primary key,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  lock_level integer not null default 0 check (lock_level >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

revoke all on table public.auth_password_lockouts from public, anon, authenticated;
revoke all on table public.auth_signup_rate_limits from public, anon, authenticated;
grant all on table public.auth_password_lockouts to supabase_auth_admin;
grant all on table public.auth_signup_rate_limits to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;

create or replace function public.hook_password_verification_attempt(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_user_id uuid;
  v_valid boolean;
  v_failed_attempts integer;
  v_lock_level integer;
  v_locked_until timestamptz;
  v_next_lock_level integer;
  v_lock_seconds integer;
begin
  v_user_id := (event->>'user_id')::uuid;
  v_valid := coalesce((event->>'valid')::boolean, false);

  if v_user_id is null then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 400,
        'message', 'Invalid authentication request.'
      )
    );
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text, 0));

  select failed_attempts, lock_level, locked_until
    into v_failed_attempts, v_lock_level, v_locked_until
    from public.auth_password_lockouts
   where user_id = v_user_id
   for update;

  if v_locked_until is not null and v_locked_until > now() then
    return jsonb_build_object(
      'decision', 'reject',
      'message', format(
        'Too many failed login attempts. Please try again in %s.',
        case
          when v_locked_until - now() < interval '60 seconds' then 'less than a minute'
          else ceil(extract(epoch from (v_locked_until - now())) / 60)::text || ' minutes'
        end
      ),
      'should_logout_user', false
    );
  end if;

  if v_valid then
    delete from public.auth_password_lockouts where user_id = v_user_id;
    return jsonb_build_object('decision', 'continue');
  end if;

  v_failed_attempts := coalesce(v_failed_attempts, 0) + 1;
  v_lock_level := coalesce(v_lock_level, 0);

  if v_failed_attempts >= 5 then
    v_next_lock_level := least(v_lock_level + 1, 10);
    v_lock_seconds := least(60 * (2 ^ (v_next_lock_level - 1)), 86400);

    insert into public.auth_password_lockouts (
      user_id, failed_attempts, lock_level, locked_until, updated_at
    ) values (
      v_user_id, 0, v_next_lock_level, now() + make_interval(secs => v_lock_seconds), now()
    )
    on conflict (user_id) do update set
      failed_attempts = excluded.failed_attempts,
      lock_level = excluded.lock_level,
      locked_until = excluded.locked_until,
      updated_at = now();

    return jsonb_build_object(
      'decision', 'reject',
      'message', format(
        'Too many failed login attempts. Your account is paused for %s.',
        case
          when v_lock_seconds < 3600 then floor(v_lock_seconds / 60)::text || ' minute' || case when v_lock_seconds = 60 then '' else 's' end
          else floor(v_lock_seconds / 3600)::text || ' hour' || case when v_lock_seconds = 3600 then '' else 's' end
        end
      ),
      'should_logout_user', false
    );
  end if;

  insert into public.auth_password_lockouts (
    user_id, failed_attempts, lock_level, locked_until, updated_at
  ) values (
    v_user_id, v_failed_attempts, v_lock_level, null, now()
  )
  on conflict (user_id) do update set
    failed_attempts = excluded.failed_attempts,
    lock_level = greatest(public.auth_password_lockouts.lock_level, excluded.lock_level),
    locked_until = null,
    updated_at = now();

  return jsonb_build_object('decision', 'continue');
end;
$$;

grant execute on function public.hook_password_verification_attempt(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_password_verification_attempt(jsonb) from public, anon, authenticated;

create or replace function public.hook_before_user_created_rate_limit(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  v_email text;
  v_attempt_count integer;
  v_lock_level integer;
  v_locked_until timestamptz;
  v_next_lock_level integer;
  v_lock_seconds integer;
begin
  v_email := lower(trim(event->'user'->>'email'));

  if v_email is null or v_email = '' then
    return '{}'::jsonb;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_email, 0));

  select attempt_count, lock_level, locked_until
    into v_attempt_count, v_lock_level, v_locked_until
    from public.auth_signup_rate_limits
   where email = v_email
   for update;

  if v_locked_until is not null and v_locked_until > now() then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 429,
        'message', format(
          'Too many signup attempts. Please try again in %s.',
          case
            when v_locked_until - now() < interval '60 seconds' then 'less than a minute'
            else ceil(extract(epoch from (v_locked_until - now())) / 60)::text || ' minutes'
          end
        )
      )
    );
  end if;

  v_attempt_count := coalesce(v_attempt_count, 0) + 1;
  v_lock_level := coalesce(v_lock_level, 0);

  if v_attempt_count >= 5 then
    v_next_lock_level := least(v_lock_level + 1, 10);
    v_lock_seconds := least(60 * (2 ^ (v_next_lock_level - 1)), 86400);

    insert into public.auth_signup_rate_limits (
      email, attempt_count, lock_level, locked_until, updated_at
    ) values (
      v_email, 0, v_next_lock_level, now() + make_interval(secs => v_lock_seconds), now()
    )
    on conflict (email) do update set
      attempt_count = excluded.attempt_count,
      lock_level = excluded.lock_level,
      locked_until = excluded.locked_until,
      updated_at = now();

    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 429,
        'message', format(
          'Too many signup attempts. Please try again in %s.',
          case
            when v_lock_seconds < 3600 then floor(v_lock_seconds / 60)::text || ' minute' || case when v_lock_seconds = 60 then '' else 's' end
            else floor(v_lock_seconds / 3600)::text || ' hour' || case when v_lock_seconds = 3600 then '' else 's' end
          end
        )
      )
    );
  end if;

  insert into public.auth_signup_rate_limits (
    email, attempt_count, lock_level, locked_until, updated_at
  ) values (
    v_email, v_attempt_count, v_lock_level, null, now()
  )
  on conflict (email) do update set
    attempt_count = excluded.attempt_count,
    lock_level = greatest(public.auth_signup_rate_limits.lock_level, excluded.lock_level),
    locked_until = null,
    updated_at = now();

  return '{}'::jsonb;
end;
$$;

grant execute on function public.hook_before_user_created_rate_limit(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created_rate_limit(jsonb) from public, anon, authenticated;
