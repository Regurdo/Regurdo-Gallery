# 📷 TUTORIAL — Menyiapkan Supabase untuk Website REGURDO

> Panduan langkah demi langkah menyiapkan **Supabase** (database + login + storage foto)
> untuk website portofolio REGURDO. Semua file SQL yang disebut di sini sudah ada
> di dalam project. Estimasi waktu: **± 15–20 menit**. Semua fitur cukup dengan
> **paket gratis** Supabase.

## Gambaran Alur

```
1. Buat project Supabase
2. Ambil 3 kredensial API
3. Jalankan SQL migrasi (buat semua tabel + storage)
4. Aktifkan login (URL config → magic link → Google)
5. Isi .env.local di project
6. Jalankan website → login pertama
7. Jadikan diri sendiri admin
8. (Nanti) update URL setelah deploy ke Vercel
```

---

## Langkah 1 — Buat Project Supabase

1. Buka **https://supabase.com/dashboard** → daftar / login (bisa pakai akun GitHub).
2. Klik **New project**.
3. Isi formnya:
   - **Name**: `regurdo` (bebas)
   - **Database Password**: buat password yang kuat, lalu **simpan** di tempat aman
     (dipakai hanya kalau suatu saat connect langsung ke database).
   - **Region**: `Singapore (Southeast Asia 1)` — paling responsif untuk pengunjung dari Indonesia.
   - **Plan**: **Free** (500 MB database + 1 GB storage + 50 MB bandwidth gratis — cukup).
4. Klik **Create new project** → tunggu ± 2 menit sampai provisioning selesai.

## Langkah 2 — Ambil 3 Kredensial API

Buka **⚙️ Project Settings** (menu kiri bawah) → **API** (di versi dashboard terbaru:
**Data API / API Keys**). Salin 3 nilai ini:

| Kredensial | Bentuknya | Variabel di project |
| --- | --- | --- |
| **Project URL** | `https://xxxx.supabase.co` | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon / public** key | panjang, diawali `eyJ...` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** key | panjang, diawali `eyJ...` | `SUPABASE_SERVICE_ROLE_KEY` |

⚠️ **PENTING — service_role adalah kunci master** yang melewati semua pengaman RLS.
Jangan pernah dibagikan, jangan di-commit ke GitHub, dan jangan pernah diberi awalan
`NEXT_PUBLIC_` (awalan itu membuat variabel bocor ke browser).

## Langkah 3 — Jalankan Migrasi Database (3 file SQL, dijalankan berurutan)

1. Di sidebar Supabase, buka **SQL Editor** → klik **New query**.
2. Buka file **`supabase/migrations/0001_init.sql`** di project ini dan **copy
   seluruh isinya** (salinan siap-unduh juga disediakan bersama tutorial ini).
3. Paste ke SQL Editor → klik **Run** (atau `Ctrl+Enter`).
4. Kalau sukses muncul tulisan `Success. No rows returned`.
5. Buat **New query** lagi → copy seluruh isi
   **`supabase/migrations/0002_comment_replies.sql`** → **Run**.
   File ini menambahkan fitur **balasan komentar** (kolom `parent_id`, hapus
   berantai, dan trigger pengaman).
6. Buat **New query** sekali lagi → copy seluruh isi
   **`supabase/migrations/0003_comment_antispam.sql`** → **Run**.
   File ini menambahkan **anti-spam komentar**: maksimal 2 tautan per
   komentar, maksimal 5 komentar per menit per pengguna, dan penolakan
   komentar duplikat.

> Sudah pernah menjalankan migrasi sebelumnya? Cukup jalankan file yang
> belum dijalankan — semua migrasi aman dijalankan ulang dan tidak mengubah
> data komentar yang sudah ada.

Satu file ini otomatis membuat:

- **8 tabel**: `profiles`, `categories`, `photos`, `albums`, `album_photos`,
  `saved_photos`, `comments`, `site_settings`
- **Trigger otomatis**: setiap user baru yang login langsung dibuatkan baris `profiles`
- **RLS aktif di semua tabel** — publik hanya bisa baca, tulis hanya admin,
  SIMPAN/komentar terkunci per-user
- **Storage bucket publik bernama `photos`** — upload/hapus hanya untuk admin
- **Data awal**: kategori Architecture / Street / Nature + konten halaman TENTANG

**Verifikasi cepat**: buka **Table Editor** → harus terlihat 8 tabel.
Buka **Storage** → ada bucket `photos` bertanda **Public**.

## Langkah 4 — Atur Autentikasi

### 4a — URL Configuration (kerjakan paling dulu)

Buka **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (untuk sekarang; diganti setelah deploy)
- **Redirect URLs** → klik **Add URL**, tambahkan:
  - `http://localhost:3000/auth/callback`
  - `https://NAMA-PROJECT.vercel.app/auth/callback` ← boleh ditambahkan sekarang atau nanti

Tanpa langkah ini login akan gagal dengan error *"redirect URL is not allowed"*.

### 4b — Email Magic Link (sudah aktif bawaan)

**Authentication → Sign In / Providers → Email**:

- Biarkan **Enable Email** tetap aktif.
- Untuk **tes lokal** boleh matikan **Confirm email** supaya langsung masuk tanpa
  verifikasi; saat produksi sebaiknya dinyalakan kembali.

Catatan: pengirim email bawaan dibatasi ± 2 email/jam di paket gratis dan sering
dianggap spam. Untuk produksi nanti bisa dipasang SMTP sendiri di
**Project Settings → Authentication → SMTP** (mis. Resend/Gmail) — opsional, menyusul.

### 4c — Login dengan Google

1. Buka **https://console.cloud.google.com** → buat project baru (nama bebas, mis. `regurdo`).
2. **APIs & Services → OAuth consent screen** → pilih **External** → isi App name
   dan email support → **Save**.
3. **Credentials → Create Credentials → OAuth client ID** → pilih **Web application**:
   - **Authorized JavaScript origins**:
     - `http://localhost:3000`
     - `https://NAMA-PROJECT.vercel.app` (setelah deploy)
   - **Authorized redirect URIs**:
     - `https://REF-PROJECT-ANDA.supabase.co/auth/v1/callback`
       (URI persis ini juga ditampilkan Supabase di panel Google — tinggal copy)
4. Salin **Client ID** dan **Client secret**.
5. Kembali ke Supabase → **Authentication → Sign In / Providers → Google** →
   nyalakan **Enable Sign in with Google** → paste Client ID + Secret → **Save**.

## Langkah 5 — Isi File `.env.local`

Di folder project, jalankan:

```bash
cp .env.example .env.local
```

Lalu edit `.env.local` dan isi dari Langkah 2:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...   # anon public
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...       # service_role (hanya server)
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

> Setiap kali `.env.local` diubah, **restart** dev server (`Ctrl+C` → `npm run dev`).

## Langkah 6 — Jalankan Website & Login Pertama

```bash
npm install    # sekali saja (atau: bun install)
npm run dev    # atau: bun run dev
```

1. Buka `http://localhost:3000` → otomatis diarahkan ke `/galeri`.
   (Sebelum env terpasang, halaman menampilkan papan petunjuk "Supabase belum
   diatur" — itu normal, desain aplikasi memang tidak crash tanpa env.)
2. Klik **MASUK** di header → halaman `/login`.
3. Coba **Masuk dengan Google**, atau kirim **magic link** ke email sendiri lalu
   klik tautannya dari email.
4. Berhasil → nama akunmu muncul di menu header.

## Langkah 7 — Jadikan Diri Sendiri Admin (sekali saja)

Supabase belum tahu siapa admin sampai kita set manual:

1. Pastikan **sudah pernah login minimal 1×** (Langkah 6) supaya baris profilmu
   sudah ada di tabel `profiles`.
2. Buka **Supabase → SQL Editor → New query**.
3. Buka file **`supabase/promote-admin.sql`**, ganti email placeholder dengan
   email yang kamu pakai login, lalu jalankan:

```sql
insert into public.profiles (id, display_name, is_admin)
select id, split_part(email, '@', 1), true
  from auth.users
 where email = 'EMAIL-KAMU@example.com'
on conflict (id) do update set is_admin = true;

-- verifikasi:
select u.email, p.display_name, p.is_admin
  from public.profiles p
  join auth.users u on u.id = p.id
 order by p.is_admin desc;
```

4. Kolom `is_admin` harus `true`.
5. **Refresh website** → menu akun sekarang menampilkan **DASBOR ADMIN** dan
   `/admin` sudah bisa dibuka.

## Langkah 8 — Setelah Deploy ke Vercel (boleh menyusul)

1. **Authentication → URL Configuration**: Site URL → `https://NAMA-PROJECT.vercel.app`,
   tambahkan `https://NAMA-PROJECT.vercel.app/auth/callback` ke Redirect URLs.
2. **Google Cloud Console**: tambahkan domain Vercel ke **Authorized JavaScript origins**.
3. **Vercel → Settings → Environment Variables**: isi 4 variabel yang sama,
   dengan `NEXT_PUBLIC_SITE_URL=https://NAMA-PROJECT.vercel.app`.
4. `service_role` tetap aman — hanya dipakai di server, tidak pernah dikirim ke browser.

---

## Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| Halaman menulis *"Supabase belum diatur"* | `.env.local` kosong/salah → periksa lagi, lalu **restart** dev server |
| `Invalid API key` | Key salah copy (kurang/kelihatan spasi) → copy ulang dari Project Settings → API |
| Error `redirect URL is not allowed` saat login | Callback belum terdaftar → tambahkan di **Authentication → URL Configuration → Redirect URLs** (4a) |
| `redirect_uri_mismatch` dari Google | URI di Google Cloud tidak persis sama → copy persis dari panel provider Google di Supabase (4c) |
| Email magic link tidak masuk | Cek **spam**; kuota gratis ± 2 email/jam → tunggu, atau matikan *Confirm email* saat tes lokal |
| `new row violates row-level security` | Akunmu belum admin → jalankan `promote-admin.sql` (Langkah 7) |
| Klik MASUK tidak terjadi apa-apa | Site URL harus `http://localhost:3000` (bukan `127.0.0.1`) |
| Foto tidak tampil | Domain `*.supabase.co` sudah diizinkan di `next.config.ts` — pastikan bucket `photos`Public |

## Checklist Akhir

- [ ] Project Supabase dibuat (region Singapore)
- [ ] 3 kredensial tersalin (URL, anon, service_role)
- [ ] `0001_init.sql` sukses dijalankan → 8 tabel + bucket `photos` muncul
- [ ] `0002_comment_replies.sql` sukses dijalankan → fitur balasan komentar aktif
- [ ] `0003_comment_antispam.sql` sukses dijalankan → anti-spam komentar aktif
- [ ] Redirect URLs memuat `http://localhost:3000/auth/callback`
- [ ] Provider Google aktif (Client ID + Secret terisi)
- [ ] `.env.local` terisi + dev server di-restart
- [ ] Login sukses di `/login`
- [ ] `promote-admin.sql` dijalankan dengan email sendiri
- [ ] `/admin` terbuka → **Dasbor Admin** tampil
