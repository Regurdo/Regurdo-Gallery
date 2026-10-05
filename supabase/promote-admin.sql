-- ============================================================================
-- REGURDO — Promote your account to admin (one-time)
--
-- 1. Sign in to the app once (Google or magic link) so your profile exists.
-- 2. Replace the email below with the account you logged in with.
-- 3. Run this file in: Supabase Dashboard -> SQL Editor.
-- ============================================================================

insert into public.profiles (id, display_name, is_admin)
select id, split_part(email, '@', 1), true
  from auth.users
 where email = 'dafafatian@gmail.com'
on conflict (id) do update set is_admin = true;

-- Verify:
select u.email, p.display_name, p.is_admin
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.is_admin desc;
