# Local Auth Reference

Use this only for local development verification.

Seeded auth user:

- Email: `dev@example.com`
- Password: `devpassword123`
- User ID: `c1b2c3d4-0000-7000-8000-000000000001`

Seeded app data:

- Zone ID: `d1b2c3d4-0000-7000-8000-000000000001`
- Device ID: `e1b2c3d4-0000-7000-8000-000000000001`
- Device API key: `dev-api-key-001`

The app protects routes in `app/proxy.ts` and stores Supabase SSR auth in the `mini-farm-auth-token` cookie. The login UI starts GitHub OAuth only, so automated local verification should not try to complete GitHub OAuth. Instead, create an authenticated Playwright storage state using the local Supabase password grant for the seeded email user.

The helper script reads `SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, or `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the environment or local env files. It uses `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL` when supplied, otherwise `http://localhost:54321`.
