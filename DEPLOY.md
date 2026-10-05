# DEPLOY — Mempublikasikan REGURGO ke Internet (Vercel, gratis)

Panduan ini membawa situs REGURGO-mu dari komputer lokal ke URL publik
(https://nama-proyekmu.vercel.app) menggunakan **Vercel** — platform yang
dibuat oleh tim Next.js, gratis untuk situs pribadi seperti ini.

**Kabar baik sebelum mulai:**
- Migrasi database (0001–0003) **tidak perlu diulang** — database Supabase-mu
  sudah berada di cloud dan dipakai bersama oleh versi lokal & produksi.
- Bucket Storage `photos` sudah publik — foto lama langsung tampil.
- `next.config.ts` sudah siap-deploy: domain `*.vercel.app` dan domain
  custom-mu otomatis diizinkan untuk Server Actions (asal
  `NEXT_PUBLIC_SITE_URL` diisi dengan benar).

---

## Langkah 0 — Prasyarat

1. Akun GitHub (gratis) — github.com
2. Akun Vercel (gratis) — vercel.com (pilih "Sign up with GitHub")
3. Proyek REGURGO sudah berjalan lokal dengan Supabase aktif (kamu sudah di
   tahap ini — artinya `.env.local` berisi 3 kunci Supabase).

Siapkan isi `.env.local`-mu, nanti dipakai lagi di Langkah 2.

---

## Langkah 1 — Unggah source code ke GitHub

1. Ekstrak `regurgo-source-code.zip` ke sebuah folder.
2. Buka folder tersebut di terminal (Windows: klik kanan → "Git Bash Here"
   atau gunakan PowerShell; macOS/Linux: Terminal).
3. Buat repo baru di **github.com/new**:
   - Repository name: misal `regurgo`
   - Pilih **Private** (disarankan)
   - **Jangan** centang "Add a README / .gitignore / license"
   - Klik **Create repository**
4. Jalankan perintah berikut (ganti `NAMAKU` dengan username GitHub-mu):

```bash
git init
git add .
git commit -m "REGURGO — situs portofolio fotografi"
git branch -M main
git remote add origin https://github.com/NAMAKU/regurgo.git
git push -u origin main
```

> File `.env.local` **tidak akan ikut terunggah** — sudah diblokir
> `.gitignore`. Kunci rahasia tetap aman.

---

## Langkah 2 — Import proyek di Vercel

1. Buka **vercel.com/new**, klik **Import** pada repo `regurgo` tadi.
2. Biarkan semua pengaturan build **default** (Framework Preset: Next.js —
   terdeteksi otomatis).
3. Buka bagian **Environment Variables** dan tambahkan 4 variabel berikut
   (salin nilainya dari `.env.local`):

   | Nama                          | Nilai                                        |
   | ----------------------------- | -------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`    | `https://xxxxx.supabase.co`                  |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | kunci "anon public" dari Supabase          |
   | `SUPABASE_SERVICE_ROLE_KEY`   | kunci "service_role" (rahasia, server-only)  |
   | `NEXT_PUBLIC_SITE_URL`        | `https://regurgo.vercel.app` ← lihat catatan |

   > **Catatan `NEXT_PUBLIC_SITE_URL`:** isi dengan alamat final situsmu.
   > Vercel biasanya menampilkan pratinjau alamatnya di bagian atas form
   > (misal `regurgo.vercel.app`) — tulis lengkap dengan `https://`.
   > Jika nanti memakai domain sendiri (Langkah 5), ubah variabel ini lalu
   > Redeploy.

4. Klik **Deploy** dan tunggu ± 2 menit.

---

## Langkah 3 — Sambungkan Supabase ke domain produksi

Supabase hanya me-redirect OAuth (Google) ke domain yang terdaftar:

1. Buka **Supabase Dashboard → Authentication → URL Configuration**.
2. **Site URL**: ganti menjadi `https://regurgo.vercel.app` (domain produksi).
3. **Redirect URLs**: klik **Add URL**, tambahkan:
   `https://regurgo.vercel.app/auth/callback`
4. Biarkan `http://localhost:3000/auth/callback` tetap terdaftar — dipakai
   untuk development lokal.
5. **Save.**

> Pengaturan Google OAuth di Google Cloud Console **tidak perlu diubah** —
> callback tetap mengarah ke Supabase (`...supabase.co/auth/v1/callback`),
> yang berubah hanya daftar domain aplikasi yang boleh dialihkan.

---

## Langkah 4 — Uji situs produksi

Buka `https://regurgo.vercel.app` lalu periksa:

- [ ] Galeri tampil dengan foto aslimu (bukan demo)
- [ ] **Masuk** dengan Google berhasil (setelah Langkah 3)
- [ ] Dasbor admin terbuka: unggah 1 foto, buat kategori & album
- [ ] Komentar (tambah + balas) berjalan
- [ ] `https://regurgo.vercel.app/sitemap.xml` dan `/robots.txt` tampil

### Penting: batas ukuran unggahan di Vercel

Platform Vercel membatasi body request **± 4,5 MB**. Foto kamera di atas
itu akan gagal terunggah di produksi (di lokal tetap bisa sampai ± 12 MB).
Solusinya sederhana:

- Ekspor foto sebagai **JPG kualitas ± 85%** (Lightroom/Capture One), atau
- Kompres lewat squoosh.app sebelum mengunggah, atau
- Atur kamera agar merekam JPG (bukan RAW) untuk salinan web.

Foto 2500–3500 px sisi panjang dengan JPG 85% umumnya hanya 1–3 MB dan
sudah sangat tajam untuk galeri.

---

## Langkah 5 (opsional) — Memakai domain sendiri

1. Vercel → proyekmu → **Settings → Domains → Add**, tulis domainmu
   (misal `regurgo.com` atau `www.regurgo.com`).
2. Buka pengelola domainmu (Niagahoster/Namecheap/Cloudflare/dll), isi DNS
   sesuai instruksi Vercel — umumnya:
   - Domain utama: **A record** → `76.76.21.21`
   - Subdomain (`www.`): **CNAME** → `cname.vercel-dns.com`
3. Tunggu DNS aktif (beberapa menit – beberapa jam). Sertifikat HTTPS
   diterbitkan otomatis oleh Vercel.
4. Setelah domain aktif:
   - Vercel → Settings → Environment Variables: ubah
     `NEXT_PUBLIC_SITE_URL` menjadi `https://regurgo.com` → **Redeploy**
   - Supabase → URL Configuration: Site URL + Redirect URLs ikut
     diganti ke `https://regurgo.com` (tambahkan `/auth/callback`)

---

## Troubleshooting

| Gejala | Penyebab & solusi |
| --- | --- |
| "Invalid Server Actions request" saat unggah/simpan di produksi | `NEXT_PUBLIC_SITE_URL` tidak sama dengan domain yang dibuka. Perbaiki nilainya lalu Redeploy. Untuk domain tambahan (mis. `www.` dan domain utama sekaligus), set `SERVER_ACTIONS_EXTRA_ORIGINS` berisi daftar dipisah koma, contoh: `www.regurgo.com`. |
| Login Google kembali ke localhost / error redirect | Redirect URLs di Supabase belum memuat domain produksi (Langkah 3). |
| Upload foto gagal hanya di produksi | Ukuran melebihi ± 4,5 MB (batas platform Vercel). Kompres dulu. |
| Build di Vercel gagal dengan "Module not found" | Ada file yang tidak ikut ter-push. Pastikan folder `src/`, `public/`, `supabase/`, dan file konfigurasi root (`next.config.ts`, `tsconfig.json`, `package.json`, `postcss.config.mjs`, `tailwind.config.ts`, `components.json`) terunggah. |
| Halaman tampil mode demo ("Supabase belum diatur") | Environment Variables di Vercel belum diisi / belum di-Redeploy setelah diisi. |
| Perubahan terlihat lama muncul di Google | Normal — sitemap sudah ada; daftarkan domain di Google Search Console untuk mempercepat. |
