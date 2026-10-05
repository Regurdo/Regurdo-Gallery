-- ============================================================================
-- REGURDO — Complete database migration (Supabase / Postgres)
-- Run this whole file ONCE in: Supabase Dashboard -> SQL Editor -> New query.
-- Safe to re-run on a fresh project (idempotent guards included).
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TABLES
-- ----------------------------------------------------------------------------

-- Mirror of auth.users, extended with app-specific fields.
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  is_admin     boolean not null default false,
  created_at   timestamptz not null default now()
);

create table if not exists public.categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  category_id  uuid references public.categories (id) on delete set null,
  year         int,
  camera       text,
  lens         text,
  iso          text,
  aperture     text,
  shutter      text,
  storage_path text not null,          -- path inside the "photos" bucket
  width        int not null default 0,
  height       int not null default 0,
  sort_order   int not null default 0, -- manual ordering (admin drag & drop)
  created_at   timestamptz not null default now()
);

create table if not exists public.albums (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  description    text,
  cover_photo_id uuid references public.photos (id) on delete set null,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

-- Many-to-many: a photo can live in many albums, with a custom
-- sort order per album.
create table if not exists public.album_photos (
  album_id   uuid not null references public.albums (id) on delete cascade,
  photo_id   uuid not null references public.photos (id) on delete cascade,
  sort_order int  not null default 0,
  primary key (album_id, photo_id)
);

-- "SIMPAN" bookmarks — one row per (user, photo).
create table if not exists public.saved_photos (
  user_id    uuid not null references auth.users (id) on delete cascade,
  photo_id   uuid not null references public.photos (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, photo_id)
);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  photo_id   uuid not null references public.photos (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  body       text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

-- Editable key/value store (e.g. the "about" page content).
create table if not exists public.site_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. INDEXES (slug uniqueness already creates unique indexes)
-- ----------------------------------------------------------------------------

create index if not exists photos_category_id_idx  on public.photos (category_id);
create index if not exists photos_sort_order_idx   on public.photos (sort_order);
create index if not exists photos_created_at_idx   on public.photos (created_at desc);
create index if not exists albums_sort_order_idx   on public.albums (sort_order);
create index if not exists album_photos_photo_idx  on public.album_photos (photo_id);
create index if not exists saved_photos_photo_idx  on public.saved_photos (photo_id);
create index if not exists comments_photo_idx      on public.comments (photo_id);
create index if not exists comments_created_idx    on public.comments (created_at desc);

-- ----------------------------------------------------------------------------
-- 3. HELPER FUNCTIONS & TRIGGERS
-- ----------------------------------------------------------------------------

-- Used by RLS policies: true when the current user's profile is admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_admin from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Auto-create a profile row whenever a new auth user appears
-- (Google OAuth or magic link signup).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'fotografer'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep site_settings.updated_at fresh.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_settings_touch on public.site_settings;
create trigger site_settings_touch
  before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.profiles      enable row level security;
alter table public.categories    enable row level security;
alter table public.photos        enable row level security;
alter table public.albums        enable row level security;
alter table public.album_photos  enable row level security;
alter table public.saved_photos  enable row level security;
alter table public.comments      enable row level security;
alter table public.site_settings enable row level security;

-- Lock down profile updates: authenticated users may only change their own
-- display_name / avatar_url — never is_admin (column-level grant).
revoke update on table public.profiles from authenticated, anon;
grant update (display_name, avatar_url) on table public.profiles to authenticated;

-- ---------- profiles ----------
drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- categories ----------
drop policy if exists "categories_select_public" on public.categories;
create policy "categories_select_public"
  on public.categories for select using (true);

drop policy if exists "categories_insert_admin" on public.categories;
create policy "categories_insert_admin"
  on public.categories for insert to authenticated with check (public.is_admin());

drop policy if exists "categories_update_admin" on public.categories;
create policy "categories_update_admin"
  on public.categories for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories_delete_admin" on public.categories;
create policy "categories_delete_admin"
  on public.categories for delete to authenticated using (public.is_admin());

-- ---------- photos ----------
drop policy if exists "photos_select_public" on public.photos;
create policy "photos_select_public"
  on public.photos for select using (true);

drop policy if exists "photos_insert_admin" on public.photos;
create policy "photos_insert_admin"
  on public.photos for insert to authenticated with check (public.is_admin());

drop policy if exists "photos_update_admin" on public.photos;
create policy "photos_update_admin"
  on public.photos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "photos_delete_admin" on public.photos;
create policy "photos_delete_admin"
  on public.photos for delete to authenticated using (public.is_admin());

-- ---------- albums ----------
drop policy if exists "albums_select_public" on public.albums;
create policy "albums_select_public"
  on public.albums for select using (true);

drop policy if exists "albums_insert_admin" on public.albums;
create policy "albums_insert_admin"
  on public.albums for insert to authenticated with check (public.is_admin());

drop policy if exists "albums_update_admin" on public.albums;
create policy "albums_update_admin"
  on public.albums for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "albums_delete_admin" on public.albums;
create policy "albums_delete_admin"
  on public.albums for delete to authenticated using (public.is_admin());

-- ---------- album_photos ----------
drop policy if exists "album_photos_select_public" on public.album_photos;
create policy "album_photos_select_public"
  on public.album_photos for select using (true);

drop policy if exists "album_photos_insert_admin" on public.album_photos;
create policy "album_photos_insert_admin"
  on public.album_photos for insert to authenticated with check (public.is_admin());

drop policy if exists "album_photos_update_admin" on public.album_photos;
create policy "album_photos_update_admin"
  on public.album_photos for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "album_photos_delete_admin" on public.album_photos;
create policy "album_photos_delete_admin"
  on public.album_photos for delete to authenticated using (public.is_admin());

-- ---------- saved_photos (strictly per-user) ----------
drop policy if exists "saved_select_own" on public.saved_photos;
create policy "saved_select_own"
  on public.saved_photos for select to authenticated using (user_id = auth.uid());

drop policy if exists "saved_insert_own" on public.saved_photos;
create policy "saved_insert_own"
  on public.saved_photos for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "saved_delete_own" on public.saved_photos;
create policy "saved_delete_own"
  on public.saved_photos for delete to authenticated using (user_id = auth.uid());

-- ---------- comments ----------
drop policy if exists "comments_select_public" on public.comments;
create policy "comments_select_public"
  on public.comments for select using (true);

drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
  on public.comments for delete to authenticated using (user_id = auth.uid());

drop policy if exists "comments_delete_admin" on public.comments;
create policy "comments_delete_admin"
  on public.comments for delete to authenticated using (public.is_admin());

-- ---------- site_settings ----------
drop policy if exists "settings_select_public" on public.site_settings;
create policy "settings_select_public"
  on public.site_settings for select using (true);

drop policy if exists "settings_insert_admin" on public.site_settings;
create policy "settings_insert_admin"
  on public.site_settings for insert to authenticated with check (public.is_admin());

drop policy if exists "settings_update_admin" on public.site_settings;
create policy "settings_update_admin"
  on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings_delete_admin" on public.site_settings;
create policy "settings_delete_admin"
  on public.site_settings for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. STORAGE — public "photos" bucket, writes restricted to admins
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;

drop policy if exists "photos_bucket_read" on storage.objects;
create policy "photos_bucket_read"
  on storage.objects for select
  using (bucket_id = 'photos');

drop policy if exists "photos_bucket_insert_admin" on storage.objects;
create policy "photos_bucket_insert_admin"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists "photos_bucket_update_admin" on storage.objects;
create policy "photos_bucket_update_admin"
  on storage.objects for update to authenticated
  using (bucket_id = 'photos' and public.is_admin())
  with check (bucket_id = 'photos' and public.is_admin());

drop policy if exists "photos_bucket_delete_admin" on storage.objects;
create policy "photos_bucket_delete_admin"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. SEED DATA
-- ----------------------------------------------------------------------------

insert into public.categories (name, slug) values
  ('Architecture', 'architecture'),
  ('Street',       'street'),
  ('Nature',       'nature')
on conflict (slug) do nothing;

-- Initial "about" content (editable later from the admin dashboard).
insert into public.site_settings (key, value) values
  ('about', jsonb_build_object(
    'tagline', 'Yang penting moto',
    'bio', 'Orang biasa yang suka moto moto ajah.',
    'start_year', 2022,
    'city', 'Probolinggo',
    'equipment', jsonb_build_array(
      jsonb_build_object('name', 'Poco X6 Pro',    'role', 'Main Camera'),
      jsonb_build_object('name', 'Tripod Inbex',   'role', 'Tripod'),
      jsonb_build_object('name', 'Acer Nitro V15', 'role', 'Editing')
    ),
    'email', 'dafafatian@gmail.com',
    'instagram', 'https://instagram.com/regurdo_',
    'portrait_path', '',
    'portrait_caption', 'Photographer — Regurdo'
  ))
on conflict (key) do nothing;

-- ----------------------------------------------------------------------------
-- 7. MAKE YOURSELF ADMIN  (one-time — see also supabase/promote-admin.sql)
--
-- Run AFTER you have signed in once (so your profiles row exists),
-- replacing the email with your own:
--
--   update public.profiles
--      set is_admin = true
--    where id = (select id from auth.users where email = 'you@example.com');
--
-- ============================================================================