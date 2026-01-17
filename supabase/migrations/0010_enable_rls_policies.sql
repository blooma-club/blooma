-- Enable RLS and add minimal read policies for authenticated users.

alter table public.users enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.generated_images enable row level security;
alter table public.uploaded_models enable row level security;
alter table public.uploaded_locations enable row level security;
alter table public.webhook_events enable row level security;

create policy "Users can view own profile"
on public.users
for select
to authenticated
using (auth.uid() = id);

create policy "Users can view own credit transactions"
on public.credit_transactions
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can view own generated images"
on public.generated_images
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can view own or public models"
on public.uploaded_models
for select
to authenticated
using (auth.uid() = user_id or coalesce(is_public, false));

create policy "Users can view own or public locations"
on public.uploaded_locations
for select
to authenticated
using (auth.uid() = user_id or coalesce(is_public, false));

-- Restrict RPCs to service role only.
revoke execute on function public.consume_credits(uuid, integer) from public;
revoke execute on function public.refund_credits(uuid, integer) from public;
revoke execute on function public.add_credits(uuid, integer) from public;
revoke execute on function public.grant_credits_with_reset(uuid, integer, timestamptz) from public;

grant execute on function public.consume_credits(uuid, integer) to service_role;
grant execute on function public.refund_credits(uuid, integer) to service_role;
grant execute on function public.add_credits(uuid, integer) to service_role;
grant execute on function public.grant_credits_with_reset(uuid, integer, timestamptz) to service_role;
