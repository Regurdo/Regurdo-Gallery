/**
 * Row types mirroring `supabase/migrations/0001_init.sql`.
 * Kept hand-written (instead of codegen) to stay minimal — update this file
 * whenever the migration changes.
 */

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export type Photo = {
  id: string;
  slug: string;
  title: string;
  category_id: string | null;
  year: number | null;
  camera: string | null;
  lens: string | null;
  iso: string | null;
  aperture: string | null;
  shutter: string | null;
  storage_path: string;
  width: number;
  height: number;
  sort_order: number;
  created_at: string;
};

export type Album = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_photo_id: string | null;
  sort_order: number;
  created_at: string;
};

export type CommentRow = {
  id: string;
  photo_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
};

/** Comment joined with the author's profile (for the panel & admin list). */
export type CommentWithAuthor = {
  id: string;
  photo_id: string;
  user_id: string;
  /** Root comment when null; otherwise the id of the root being replied to. */
  parent_id: string | null;
  body: string;
  created_at: string;
  authorName: string | null;
  authorAvatar: string | null;
};

/**
 * Root comment with its (one-level) replies, oldest first on both levels.
 * Built client-side from the flat oldest-first list returned by the DB.
 */
export type CommentThread = CommentWithAuthor & {
  replies: CommentWithAuthor[];
};

/**
 * Build one-level threads from the flat oldest-first DB list:
 * roots keep their order, replies attach under their root (also ordered).
 * Pure helper shared by server actions and client components.
 */
export function buildCommentThreads(flat: CommentWithAuthor[]): CommentThread[] {
  const roots: CommentThread[] = [];
  const byId = new Map<string, CommentThread>();
  for (const row of flat) {
    if (row.parent_id === null) {
      const thread: CommentThread = { ...row, replies: [] };
      byId.set(thread.id, thread);
      roots.push(thread);
    }
  }
  for (const row of flat) {
    if (row.parent_id !== null) {
      byId.get(row.parent_id)?.replies.push(row);
    }
  }
  return roots;
}

/** Category joined with its photo count (for the KOLEKSI chips). */
export type CategoryWithCount = {
  id: string;
  name: string;
  slug: string;
  count: number;
};

/**
 * UI-facing photo shape consumed by the gallery grid / list view / lightbox.
 * `url` is a ready-to-render public URL (Supabase Storage or demo image),
 * computed on the server before being passed to client components.
 */
export type GalleryPhoto = {
  id: string;
  slug: string;
  title: string;
  categorySlug: string | null;
  categoryName: string | null;
  year: number | null;
  camera: string | null;
  lens: string | null;
  iso: string | null;
  aperture: string | null;
  shutter: string | null;
  url: string;
  width: number;
  height: number;
};

/**
 * Signed-in viewer context passed from Server Components into the gallery
 * client components (SaveButton + CommentsSection). Anonymous visitors get
 * `authenticated: false` and the UI shows Indonesian login prompts instead.
 */
export type ViewerContext = {
  authenticated: boolean;
  userId: string | null;
  isAdmin: boolean;
  /** Photo ids the viewer has saved (SIMPAN) — pre-computed server-side. */
  savedIds: string[];
};

export const ANON_VIEWER: ViewerContext = {
  authenticated: false,
  userId: null,
  isAdmin: false,
  savedIds: [],
};
