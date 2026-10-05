# REGURDO — Setup Guide

Photography gallery rebuilt with **Next.js 16 (App Router, TypeScript)**,
**Tailwind CSS 4**, and **Supabase** (Postgres + Auth + Storage).
Everything runs on the free tiers of Vercel + Supabase.

---

## 1. Prerequisites

- Node.js 20+ (or Bun)
- A [Supabase](https://supabase.com) account (free tier is enough)
- A [Vercel](https://vercel.com) account (free tier is enough)

## 2. Create the Supabase project

1. Go to <https://supabase.com/dashboard> → **New project**.
2. Pick a name (e.g. `regurdo`), a strong database password, and the region
   closest to your visitors (Singapore is usually best for Indonesia).
3. Wait for provisioning, then open **Project Settings → API** — you will need
   the **Project URL**, the **anon public** key, and the **service_role** key.

## 3. Run the database migrations

Three SQL files must be run, in order:

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the entire content of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql)
   and click **Run**.
3. Then paste the entire content of
   [`supabase/migrations/0002_comment_replies.sql`](supabase/migrations/0002_comment_replies.sql)
   and click **Run** again (adds comment **replies**: `parent_id` column,
   cascade delete, guard triggers).
4. Then paste the entire content of
   [`supabase/migrations/0003_comment_antispam.sql`](supabase/migrations/0003_comment_antispam.sql)
   and click **Run** one more time (adds **anti-spam guards**: max 2 links
   per comment, max 5 comments per user per minute, duplicate rejection).

> Already ran `0001` and/or `0002` before? Just run the files you are
> missing — every migration is idempotent (safe to re-run) and none of them
> touch existing comment data.

The first migration creates in one shot:
   - tables: `profiles, categories, photos, albums, album_photos, saved_photos, comments, site_settings`
   - indexes on slugs, foreign keys, ordering and timestamps
   - a trigger that auto-creates a `profiles` row for every new auth user
   - **Row Level Security on every table** (public read, admin-only writes,
     per-user saved photos, moderated comments)
   - the public Storage bucket **`photos`** with admin-only write policies
   - seed data: categories **Architecture / Street / Nature** + default
     `about` site settings

## 4. Enable authentication

### 4a. Email magic link (default provider)

1. **Authentication → Sign In / Providers → Email**: leave **Enable Email** on.
   For testing you may turn **Confirm email** off; keep it on in production.
2. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000` for now (change after deploy).
   - **Redirect URLs**: add
     - `http://localhost:3000/auth/callback`
     - `https://YOUR-PROJECT.vercel.app/auth/callback` (after step 7)

### 4b. Google OAuth

1. Open <https://console.cloud.google.com/apis/credentials> → **Create
   credentials → OAuth client ID** → **Web application**.
2. **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `https://YOUR-PROJECT.vercel.app` (after deploy)
3. **Authorized redirect URIs**:
   - `https://YOUR-SUPABASE-REF.supabase.co/auth/v1/callback`
     (exact value is shown in Supabase under **Authentication → Providers →
     Google**)
4. Copy the **Client ID** and **Client secret** into Supabase →
   **Authentication → Sign In / Providers → Google** → Enable → Save.

## 5. Configure the app locally

```bash
cp .env.example .env.local
# then edit .env.local:
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   # anon public
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...       # service_role (server only!)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Install & run:

```bash
bun install        # or: npm install
bun run dev        # or: npm run dev
```

Open <http://localhost:3000> — you will be redirected to `/galeri`.

## 6. Make yourself the admin

1. Sign in once at `/login` (Google or magic link) — this creates your
   `profiles` row via the database trigger.
2. In Supabase SQL Editor run [`supabase/promote-admin.sql`](supabase/promote-admin.sql)
   after replacing the placeholder email:

```sql
insert into public.profiles (id, display_name, is_admin)
select id, split_part(email, '@', 1), true
  from auth.users
 where email = 'you@example.com'
on conflict (id) do update set is_admin = true;
```

3. Reload the app — **Dasbor Admin** appears in the user menu and `/admin`
   unlocks.

> Notes: `service_role` stays on the server at all times. `/admin` is blocked
> in the Next.js proxy (`src/proxy.ts` — Next 16's replacement for
> `middleware.ts`) **and** double-checked in the admin page itself via the
> `profiles.is_admin` flag. Anonymous users can read published content but
> cannot write anything (RLS).

## 7. Deploy to Vercel

1. Push this repository to GitHub.
2. <https://vercel.com/new> → import the repo → framework auto-detects
   **Next.js** (no build settings needed).
3. Add the four environment variables from step 5 under
   **Settings → Environment Variables**, with
   `NEXT_PUBLIC_SITE_URL=https://YOUR-PROJECT.vercel.app`.
4. Deploy, then go back to Supabase **Authentication → URL Configuration**:
   - **Site URL** → `https://YOUR-PROJECT.vercel.app`
   - **Redirect URLs** → add `https://YOUR-PROJECT.vercel.app/auth/callback`
5. Also add the Vercel domain to the Google OAuth **Authorized JavaScript
   origins** (step 4b).

## 8. Project structure

```
src/
  app/
    layout.tsx              # fonts (Cormorant Garamond + Montserrat), header
    page.tsx                # redirects to /galeri
    globals.css             # REGURDO design tokens (dark + gold)
    galeri/page.tsx         # gallery grid / list + TERSIMPAN view
    album/page.tsx          # public album index; album/[slug] detail
    tentang/page.tsx        # public TENTANG page (bio, stats, gear, contact)
    login/                  # /login — Google OAuth + magic link
    auth/callback/route.ts  # OAuth & magic-link code exchange
    not-found.tsx           # custom 404 (Indonesian)
    admin/                  # dashboard: foto, album, komentar, tentang
  components/
    layout/                 # site-header, collections-bar, site-footer, …
    galeri/                 # photo-grid, galeri-list-view, lightbox,
                            # comments-section (replies), save-button
    admin/                  # photo/album/comment forms, about-form, …
    ui/                     # shadcn/ui primitives
  lib/
    config.ts               # env handling (boots even without Supabase)
    types.ts                # row types mirroring the migration
    auth.ts                 # cached getSession / getCurrentProfile helpers
    queries.ts              # read helpers for Server Components
    comment-view.ts         # comment thread building + limits
    actions/                # server actions: auth, photos, albums,
                            # saved, comments (replies), about
    supabase/               # browser / server / admin clients + session refresh
  proxy.ts                  # Next 16 middleware: session refresh + /admin guard
supabase/
  migrations/0001_init.sql          # complete one-shot migration
  migrations/0002_comment_replies.sql # comment replies (parent_id + triggers)
  migrations/0003_comment_antispam.sql # comment anti-spam (rate limit, links, dupes)
  promote-admin.sql         # one-time admin promotion
```

## 9. Roadmap (phases)

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Setup, database, auth, layout shell | ✅ done |
| 2 | Gallery grid / list + lightbox + keyboard nav | ✅ done |
| 3 | Admin: photo upload / edit / reorder | ✅ done |
| 4 | Albums | ✅ done |
| 5 | Save (bookmark) + comments **with replies** | ✅ done |
| 6 | About page + polish (404, metadata, footer) | ✅ done |

## 10. Going live (deploy)

Siap membawa situs ini ke internet? Panduan lengkap langkah-demi-langkah
(push ke GitHub → import di Vercel → env vars → sambungkan Supabase Auth →
domain sendiri → troubleshooting) ada di **[DEPLOY.md](./DEPLOY.md)**.

Migrasi database tidak perlu diulang saat deploy — database Supabase yang
sama dipakai oleh versi lokal maupun produksi.
