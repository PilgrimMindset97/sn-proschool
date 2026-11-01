/*
# Recreate Super Admin account with a strong password

The previous account was created by directly inserting into auth.users, which
caused a "Database error querying schema" during login because Supabase Auth's
internal schema expectations were not fully met.

This migration:
1. Inserts the user into auth.users with a strong bcrypt password hash.
2. Inserts the matching auth.identities row with proper identity_data.
3. Creates the profile with super_admin role.
4. Uses a stronger password: SnPro@2026!

Note: The password hash is pre-computed using crypt() with bf(10).
*/

-- Create auth user with strong password
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
  crypt('SnPro@2026!', gen_salt('bf', 10)),
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

-- Create identity record
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider_id,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  u.id,
  jsonb_build_object(
    'sub', u.id::text,
    'email', 'norielsayet008@gmail.com',
    'email_verified', true
  ),
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

-- Create super_admin profile linked to default establishment
INSERT INTO public.profiles (id, email, full_name, role, establishment_id, active, must_change_password)
SELECT
  u.id,
  'norielsayet008@gmail.com',
  'Super Administrateur',
  'super_admin',
  e.id,
  true,
  false
FROM auth.users u, public.establishments e
WHERE lower(u.email) = lower('norielsayet008@gmail.com')
  AND e.code = 'DEFAULT'
ON CONFLICT (id) DO UPDATE
SET role = 'super_admin', active = true, must_change_password = false, email = 'norielsayet008@gmail.com';