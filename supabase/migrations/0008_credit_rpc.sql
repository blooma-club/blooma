-- Atomic credit updates for Supabase JS RPC usage.

create or replace function public.consume_credits(
  p_user_id uuid,
  p_amount integer
)
returns table (
  credits integer,
  credits_used integer
)
language plpgsql
as $$
begin
  return query
  update public.users
  set credits_used = coalesce(credits_used, 0) + p_amount,
      updated_at = now()
  where id = p_user_id
    and (coalesce(credits, 0) - coalesce(credits_used, 0)) >= p_amount
  returning coalesce(credits, 0) as credits,
            coalesce(credits_used, 0) as credits_used;
end;
$$;

create or replace function public.refund_credits(
  p_user_id uuid,
  p_amount integer
)
returns table (
  credits integer,
  credits_used integer
)
language plpgsql
as $$
begin
  return query
  update public.users
  set credits_used = greatest(coalesce(credits_used, 0) - p_amount, 0),
      updated_at = now()
  where id = p_user_id
  returning coalesce(credits, 0) as credits,
            coalesce(credits_used, 0) as credits_used;
end;
$$;
