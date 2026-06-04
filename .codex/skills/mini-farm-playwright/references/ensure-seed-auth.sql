-- Local development only.
-- Makes the seeded auth.users row usable by Supabase Auth password sign-in.
-- This changes auth metadata only; it does not create app-domain test data.

INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  'c1b2c3d4-0000-7000-8000-000000000001',
  'c1b2c3d4-0000-7000-8000-000000000001',
  'c1b2c3d4-0000-7000-8000-000000000001',
  jsonb_build_object(
    'sub', 'c1b2c3d4-0000-7000-8000-000000000001',
    'email', 'dev@example.com',
    'email_verified', true,
    'phone_verified', false
  ),
  'email',
  now(),
  now(),
  now()
)
ON CONFLICT (provider_id, provider) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  identity_data = EXCLUDED.identity_data,
  updated_at = now();
