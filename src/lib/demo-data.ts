import type { CategoryWithCount, CommentWithAuthor, GalleryPhoto } from "@/lib/types";

/**
 * Demo dataset shown ONLY when Supabase env vars are missing (fresh clone /
 * preview sandbox). It lets the whole gallery UI — grid, list view, lightbox,
 * keyboard nav — be explored before the database is connected.
 *
 * When `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set,
 * this file is never used and everything comes from the real database.
 */

export const DEMO_CATEGORIES: CategoryWithCount[] = [
  { id: "demo-architecture", name: "Architecture", slug: "architecture", count: 4 },
  { id: "demo-nature", name: "Nature", slug: "nature", count: 4 },
  { id: "demo-street", name: "Street", slug: "street", count: 4 },
];

const img = (n: number) => `https://picsum.photos/seed/regurdo-${n}/1200/1500`;

export const DEMO_PHOTOS: GalleryPhoto[] = [
  {
    id: "demo-1",
    slug: "garis-dan-langit",
    title: "Garis dan Langit",
    categorySlug: "architecture",
    categoryName: "Architecture",
    year: 2024,
    camera: "Poco X6 Pro",
    lens: "23mm f/1.7 (bawaan)",
    iso: "100",
    aperture: "f/2.0",
    shutter: "1/500s",
    url: img(1),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-2",
    slug: "senja-di-kota-tua",
    title: "Senja di Kota Tua",
    categorySlug: "street",
    categoryName: "Street",
    year: 2023,
    camera: "Canon EOS R6",
    lens: "RF 35mm f/1.8",
    iso: "400",
    aperture: "f/2.0",
    shutter: "1/125s",
    url: img(2),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-3",
    slug: "sunyi-pagi",
    title: "Sunyi Pagi",
    categorySlug: "nature",
    categoryName: "Nature",
    year: 2024,
    camera: "Poco X6 Pro",
    lens: "23mm f/1.7 (bawaan)",
    iso: "50",
    aperture: "f/2.0",
    shutter: "1/1000s",
    url: img(3),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-4",
    slug: "persimpangan",
    title: "Persimpangan",
    categorySlug: "street",
    categoryName: "Street",
    year: 2025,
    camera: "Canon EOS R6",
    lens: "RF 16mm f/2.8",
    iso: "200",
    aperture: "f/5.6",
    shutter: "1/320s",
    url: img(4),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-5",
    slug: "kaca-dan-beton",
    title: "Kaca dan Beton",
    categorySlug: "architecture",
    categoryName: "Architecture",
    year: 2023,
    camera: "Sony A7 III",
    lens: "FE 85mm f/1.8",
    iso: "100",
    aperture: "f/8",
    shutter: "1/250s",
    url: img(5),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-6",
    slug: "kabut-bukit",
    title: "Kabut Bukit",
    categorySlug: "nature",
    categoryName: "Nature",
    year: 2022,
    camera: "Poco X6 Pro",
    lens: "23mm f/1.7 (bawaan)",
    iso: "64",
    aperture: "f/2.0",
    shutter: "1/800s",
    url: img(6),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-7",
    slug: "jejak-pulang",
    title: "Jejak Pulang",
    categorySlug: "street",
    categoryName: "Street",
    year: 2024,
    camera: "Canon EOS R6",
    lens: "RF 35mm f/1.8",
    iso: "1600",
    aperture: "f/1.8",
    shutter: "1/60s",
    url: img(7),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-8",
    slug: "simetri",
    title: "Simetri",
    categorySlug: "architecture",
    categoryName: "Architecture",
    year: 2025,
    camera: "Sony A7 III",
    lens: "FE 24mm f/1.4",
    iso: "100",
    aperture: "f/11",
    shutter: "1/160s",
    url: img(8),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-9",
    slug: "hujan-pertama",
    title: "Hujan Pertama",
    categorySlug: "nature",
    categoryName: "Nature",
    year: 2023,
    camera: "Poco X6 Pro",
    lens: "23mm f/1.7 (bawaan)",
    iso: "320",
    aperture: "f/2.0",
    shutter: "1/240s",
    url: img(9),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-10",
    slug: "lampu-kota",
    title: "Lampu Kota",
    categorySlug: "street",
    categoryName: "Street",
    year: 2025,
    camera: "Canon EOS R6",
    lens: "RF 50mm f/1.2",
    iso: "800",
    aperture: "f/1.2",
    shutter: "1/15s",
    url: img(10),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-11",
    slug: "cakrawala-timur",
    title: "Cakrawala Timur",
    categorySlug: "nature",
    categoryName: "Nature",
    year: 2025,
    camera: "Poco X6 Pro",
    lens: "23mm f/1.7 (bawaan)",
    iso: "50",
    aperture: "f/2.0",
    shutter: "1/2000s",
    url: img(11),
    width: 1200,
    height: 1500,
  },
  {
    id: "demo-12",
    slug: "menara-sunyi",
    title: "Menara Sunyi",
    categorySlug: "architecture",
    categoryName: "Architecture",
    year: 2024,
    camera: "Sony A7 III",
    lens: "FE 85mm f/1.8",
    iso: "100",
    aperture: "f/4",
    shutter: "1/400s",
    url: img(12),
    width: 1200,
    height: 1500,
  },
];

export function filterDemoPhotos(opts: { category?: string; q?: string }): GalleryPhoto[] {
  const q = opts.q?.trim().toLowerCase();
  return DEMO_PHOTOS.filter((p) => {
    if (opts.category && p.categorySlug !== opts.category) return false;
    if (q && !p.title.toLowerCase().includes(q)) return false;
    return true;
  });
}

/* --------------------------------- albums --------------------------------- */

export type DemoAlbum = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverPhotoId: string;
  /** Ordered photo ids — mirrors the album_photos.sort_order column. */
  photoIds: string[];
};

export const DEMO_ALBUMS: DemoAlbum[] = [
  {
    id: "demo-album-1",
    slug: "senja-dan-kota",
    title: "Senja dan Kota",
    description:
      "Seri jalanan saat matahari turun — cahaya keras, bayangan panjang, dan kota yang perlahan menyalakan lampunya.",
    coverPhotoId: "demo-2",
    photoIds: ["demo-2", "demo-4", "demo-10", "demo-7"],
  },
  {
    id: "demo-album-2",
    slug: "lanskap-sunyi",
    title: "Lanskap Sunyi",
    description:
      "Kabut, bukit, dan cahaya pagi — perjalanan mencari keheningan beberapa jam di luar kota.",
    coverPhotoId: "demo-6",
    photoIds: ["demo-6", "demo-3", "demo-9", "demo-11"],
  },
  {
    id: "demo-album-3",
    slug: "garis-dan-simetri",
    title: "Garis dan Simetri",
    description:
      "Geometri bangunan dan pengulangan bentuk — arsitektur dilihat dari sudut yang paling jujur.",
    coverPhotoId: "demo-8",
    photoIds: ["demo-8", "demo-1", "demo-5", "demo-12"],
  },
];

/* -------------------------------- comments -------------------------------- */

/**
 * Sample comments for the demo photos (read-only in demo mode — posting
 * requires a real Supabase connection). Ordered oldest -> newest per photo.
 * parent_id null = root comment; otherwise a reply to the referenced root.
 */
export const DEMO_COMMENTS: CommentWithAuthor[] = [
  {
    id: "demo-komentar-1",
    photo_id: "demo-1",
    user_id: "demo-user-a",
    parent_id: null,
    body: "Komposisi garisnya rapi banget — langitnya pas jadi pembeda.",
    created_at: "2024-06-03T09:12:00.000Z",
    authorName: "Raka Pratama",
    authorAvatar: null,
  },
  {
    id: "demo-komentar-2",
    photo_id: "demo-1",
    user_id: "demo-user-b",
    parent_id: null,
    body: "Ini favoritku di seluruh seri arsitektur. Kontrasnya kuat tapi tetap tenang.",
    created_at: "2024-06-04T14:40:00.000Z",
    authorName: "Nadia",
    authorAvatar: null,
  },
  {
    id: "demo-komentar-2-r1",
    photo_id: "demo-1",
    user_id: "demo-user-owner",
    parent_id: "demo-komentar-2",
    body: "Terima kasih, Nadia! Diambil pagi butuh nunggu awan yang pas 😄",
    created_at: "2024-06-04T18:02:00.000Z",
    authorName: "Regurdo",
    authorAvatar: null,
  },
  {
    id: "demo-komentar-3",
    photo_id: "demo-4",
    user_id: "demo-user-c",
    parent_id: null,
    body: "Moment yang selalu susah ditangkap, tapi di sini terasa hidup.",
    created_at: "2024-06-05T07:05:00.000Z",
    authorName: "Bagas",
    authorAvatar: null,
  },
  {
    id: "demo-komentar-4",
    photo_id: "demo-10",
    user_id: "demo-user-a",
    parent_id: null,
    body: "Lama rana 1/15 tanpa tripod? Hasilnya tajam sekali. Keren!",
    created_at: "2024-06-06T19:23:00.000Z",
    authorName: "Raka Pratama",
    authorAvatar: null,
  },
  {
    id: "demo-komentar-4-r1",
    photo_id: "demo-10",
    user_id: "demo-user-owner",
    parent_id: "demo-komentar-4",
    body: "Pakai tripod Inbex kok — dan still image stabilization-nya membantu.",
    created_at: "2024-06-06T20:10:00.000Z",
    authorName: "Regurdo",
    authorAvatar: null,
  },
];

/** Demo comments for one photo, oldest first. */
export function demoCommentsForPhoto(photoId: string): CommentWithAuthor[] {
  return DEMO_COMMENTS.filter((c) => c.photo_id === photoId);
}
