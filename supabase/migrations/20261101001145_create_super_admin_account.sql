/*
# Create the initial Super Admin account

Creates the Auth user norielsayet008@gmail.com with password 12345 and assigns
the super_admin role in public.profiles. Also links the profile to the default
establishment so the super admin can see all data.

1. Inserts a row into auth.users with the given email and a bcrypt password hash.
2. Inserts a corresponding auth.identities row so login works.
3. Inserts or updates the public.profiles row with role = super_admin.
*/

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  email_change,
  email_change_confirm_status,
  recovery_sent_at,
  raw_user_meta_data,
  raw_app_meta_data,
  created_at,
  updated_at,
  last_sign_in_at,
  confirmation_token,
  confirmation_sent_at
)
SELECT
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'norielsayet008@gmail.com',
  crypt('12345', gen_salt('bf', 10)),
  now(),
  '',
  0,
  null,
  jsonb_build_object('full_name', 'Super Administrateur'),
  jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
  now(),
  now(),
  null,
  '',
  null
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users WHERE lower(email) = lower('norielsayet008@gmail.com')
);

-- Insert into auth.identities so the user can sign in
INSERT INTO auth.identities (id, user_id, identity_data, provider_id, provider, last_sign_in_at, created_at, updated_at)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', 'norielsayet008@gmail.com', 'email_verified', true),
  'norielsayet008@gmail.com',
  'email',
  now(),
  now(),
  now()
FROM auth.users u
WHERE lower(u.email) = lower('norielsayet008@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );

-- Assign super_admin role and link to default establishment
DO $$
DECLARE
  v_user_id uuid;
  v_est_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE lower(email) = lower('norielsayet008@gmail.com') LIMIT 1;
  SELECT id INTO v_est_id FROM public.establishments WHERE code = 'DEFAULT' LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, email, full_name, role, establishment_id, active, must_change_password)
    VALUES (v_user_id, 'norielsayet008@gmail.com', 'Super Administrateur', 'super_admin', v_est_id, true, false)
    ON CONFLICT (id) DO UPDATE
    SET role = 'super_admin', active = true, must_change_password = false, email = 'norielsayet008@gmail.com';
  END IF;
END $$;
