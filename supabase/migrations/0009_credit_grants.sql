-- Helper RPCs for credit adjustments without raw SQL.

create or replace function public.add_credits(
  p_user_id uuid,
  p_amount integer
)
returns void
language plpgsql
as $$
begin
  update public.users
  set credits = coalesce(credits, 0) + p_amount,
      updated_at = now()
  where id = p_user_id;
end;
$$;

create or replace function public.grant_credits_with_reset(
  p_user_id uuid,
  p_amount integer,
  p_reset_date timestamptz
)
returns void
language plpgsql
as $$
begin
  update public.users
  set credits = coalesce(credits, 0) + p_amount,
      credits_reset_date = coalesce(p_reset_date, credits_reset_date),
      updated_at = now()
  where id = p_user_id;
end;
$$;
