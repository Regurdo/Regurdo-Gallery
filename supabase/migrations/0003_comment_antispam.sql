-- ============================================================================
-- REGURDO — Migration 0003: COMMENT ANTI-SPAM
-- Run this whole file ONCE in: Supabase Dashboard -> SQL Editor -> New query.
-- Idempotent: safe to run again (IF NOT EXISTS / OR REPLACE / drop+create).
--
-- Adds three database-enforced guards to public.comments. Because they live
-- in the database, they apply no matter which client posts the comment:
--
--   1. LINK CAP      max 2 URL per komentar           -> REGURDO_TOO_MANY_LINKS
--   2. RATE LIMIT    max 5 komentar / user / 60 detik -> REGURDO_RATE_LIMITED
--   3. DUPLICATE     isi sama, foto sama, 10 menit    -> REGURDO_DUPLICATE
--
-- Anonymous visitors can never comment at all (RLS requires a signed-in
-- user); these rules stop flood/spam behaviour from signed-in accounts.
-- The REGURDO_* message prefixes are translated into friendly Indonesian
-- sentences by src/lib/actions/comments.ts (translateCommentError).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Helper index: the rate-limit and duplicate checks filter by user + time.
-- ---------------------------------------------------------------------------
create index if not exists comments_user_created_idx
  on public.comments (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 2) Trigger function: rejects spammy inserts with descriptive messages.
--    Runs BEFORE INSERT, so a rejected comment is never written.
-- ---------------------------------------------------------------------------
create or replace function public.comments_antispam_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  link_count int;
  recent     int;
  duplicates int;
begin
  -- (a) Link cap: count http(s):// or www. occurrences in the body.
  select coalesce(
           array_length(
             regexp_matches(new.body, '(https?://|www\.)\S+', 'g'), 1),
           0)
    into link_count;
  if link_count > 2 then
    raise exception 'REGURDO_TOO_MANY_LINKS: maksimal 2 tautan per komentar';
  end if;

  -- (b) Rate limit: max 5 comments (roots + replies) in the last 60 seconds.
  select count(*)
    into recent
    from public.comments
   where user_id = new.user_id
     and created_at > now() - interval '60 seconds';
  if recent >= 5 then
    raise exception 'REGURDO_RATE_LIMITED: terlalu banyak komentar dalam waktu singkat';
  end if;

  -- (c) Duplicate: identical body on the same photo within the last 10 min.
  select count(*)
    into duplicates
    from public.comments
   where user_id  = new.user_id
     and photo_id = new.photo_id
     and body     = new.body
     and created_at > now() - interval '10 minutes';
  if duplicates > 0 then
    raise exception 'REGURDO_DUPLICATE: komentar yang sama baru saja dikirim';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Bind the guard to INSERT on public.comments.
-- ---------------------------------------------------------------------------
drop trigger if exists comments_antispam_trigger on public.comments;
create trigger comments_antispam_trigger
  before insert on public.comments
  for each row execute function public.comments_antispam_rules();
