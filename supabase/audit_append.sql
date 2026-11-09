-- YapShield: Atomic Hash-Chained Audit Append Function
--
-- This function runs inside a single database transaction. It acquires an exclusive
-- transaction-scoped advisory lock ('audit_logs_chain_lock') to prevent concurrency
-- race conditions between multiple serverless instances (e.g. on Vercel).
--
-- Steps:
-- 1. pg_advisory_xact_lock(hashtext('audit_logs_chain_lock'))
-- 2. Selects latest hash from audit_logs (or 'GENESIS' if empty).
-- 3. Formats payload matching computeHash() in TypeScript:
--    prevHash|action|categories|riskScore|decision|maskedPrompt|overrideCount|createdAtIso
-- 4. Computes SHA-256 hash using encode(sha256(convert_to(payload, 'UTF8')), 'hex').
-- 5. Inserts new row into audit_logs and returns the created record.
-- 6. Lock is automatically released upon transaction completion.

create or replace function audit_append(
  p_action text,
  p_decision text,
  p_masked_prompt text default '',
  p_risk_score numeric default 0,
  p_categories text[] default '{}',
  p_user_id text default null,
  p_override_count integer default 0,
  p_created_at text default null
)
returns audit_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_hash text;
  v_cats text;
  v_created_at_text text;
  v_created_at_tz timestamptz;
  v_payload text;
  v_hash text;
  v_row audit_logs%rowtype;
begin
  -- 1. Acquire transaction advisory lock (released automatically on commit/rollback)
  perform pg_advisory_xact_lock(hashtext('audit_logs_chain_lock'));

  -- 2. Read the latest recorded hash
  select hash into v_prev_hash
  from audit_logs
  order by id desc
  limit 1;

  if v_prev_hash is null or v_prev_hash = '' then
    v_prev_hash := 'GENESIS';
  end if;

  -- 3. Standardize timestamp to ISO-8601 UTC
  if p_created_at is not null and btrim(p_created_at) <> '' then
    v_created_at_text := btrim(p_created_at);
    v_created_at_tz := v_created_at_text::timestamptz;
  else
    v_created_at_tz := clock_timestamp();
    v_created_at_text := to_char(v_created_at_tz at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  end if;

  -- 4. Build comma-separated categories string
  v_cats := coalesce(array_to_string(p_categories, ','), '');

  -- 5. Construct payload matching TypeScript computeHash()
  v_payload := v_prev_hash || '|' ||
               p_action || '|' ||
               v_cats || '|' ||
               round(coalesce(p_risk_score, 0))::text || '|' ||
               p_decision || '|' ||
               coalesce(p_masked_prompt, '') || '|' ||
               coalesce(p_override_count, 0)::text || '|' ||
               v_created_at_text;

  -- 6. Compute SHA-256 hash in lowercase hex
  v_hash := encode(sha256(convert_to(v_payload, 'UTF8')), 'hex');

  -- 7. Insert the row into audit_logs table
  insert into audit_logs (
    user_id,
    action,
    categories,
    risk_score,
    masked_prompt,
    decision,
    prev_hash,
    hash,
    created_at
  ) values (
    p_user_id,
    p_action,
    coalesce(p_categories, '{}'),
    coalesce(p_risk_score, 0),
    coalesce(p_masked_prompt, ''),
    p_decision,
    v_prev_hash,
    v_hash,
    v_created_at_tz
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Grant execute permissions to service_role and authenticated users
grant execute on function audit_append to service_role;
grant execute on function audit_append to authenticated;
