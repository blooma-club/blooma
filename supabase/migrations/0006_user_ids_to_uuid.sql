ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS credit_transactions_user_id_fkey;

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_id_fkey;

ALTER TABLE public.users
  ALTER COLUMN id TYPE uuid USING id::uuid;

ALTER TABLE public.generated_images
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE public.uploaded_models
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE public.uploaded_locations
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE public.credit_transactions
  ALTER COLUMN user_id TYPE uuid USING user_id::uuid;

ALTER TABLE public.users
  ADD CONSTRAINT users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.generated_images
  ADD CONSTRAINT generated_images_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.uploaded_models
  ADD CONSTRAINT uploaded_models_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.uploaded_locations
  ADD CONSTRAINT uploaded_locations_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
