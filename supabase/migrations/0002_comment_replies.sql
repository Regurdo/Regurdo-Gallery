-- ============================================================================
-- REGURDO — Migration 0002: COMMENT REPLIES
-- Run this whole file ONCE in: Supabase Dashboard -> SQL Editor -> New query.
-- Idempotent: safe to run again (guarded with IF NOT EXISTS / drop+create).
--
-- Adds one level of threaded replies to public.comments:
--   parent_id NULL  -> root comment (top level)
--   parent_id = id  -> reply to a root comment
-- Replies to replies are rejected by a trigger (max depth = 1 level).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. COLUMN + INDEX
-- ----------------------------------------------------------------------------

alter table public.comments
  add column if not exists parent_id uuid references public.comments (id) on delete cascade;

create index if not exists comments_parent_idx on public.comments (parent_id);

-- ----------------------------------------------------------------------------
-- 2. TRIGGER — reply rules (data integrity, independent of the UI)
-- ----------------------------------------------------------------------------

create or replace function public.comments_enforce_reply_rules()
returns trigger
language plpgsql
as $$
declare
  parent public.comments;
begin
  if new.parent_id is null then
    return new; -- root comment: nothing to check
  end if;

  select * into parent from public.comments where id = new.parent_id;

  if parent.id is null then
    raise exception 'Komentar induk tidak ditemukan.';
  end if;

  if parent.photo_id is distinct from new.photo_id then
    raise exception 'Balasan harus berada pada foto yang sama dengan komentar induknya.';
  end if;

  if parent.parent_id is not null then
    raise exception 'Balasan hanya bisa ditulis pada komentar utama (kedalaman maksimal 1 tingkat).';
  end if;

  return new;
end;
$$;

drop trigger if exists comments_reply_rules on public.comments;
create trigger comments_reply_rules
  before insert on public.comments
  for each row execute function public.comments_enforce_reply_rules();

-- ----------------------------------------------------------------------------
-- 3. RLS — unchanged. The existing policies already cover replies:
--    comments_select_public (everyone reads), comments_insert_own
--    (user_id = auth.uid()), comments_delete_own / comments_delete_admin.
--    Deleting a root comment cascades to its replies via ON DELETE CASCADE.
-- ============================================================================
