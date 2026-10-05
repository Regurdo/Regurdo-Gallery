"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/config";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { CommentThread, CommentWithAuthor } from "@/lib/types";
import { buildCommentThreads } from "@/lib/types";
import { demoCommentsForPhoto } from "@/lib/demo-data";

/**
 * Comment server actions: read (per photo, threaded), add (root or reply),
 * delete.
 *
 * Security model (defense in depth):
 *  - reads are public (comments_select_public RLS);
 *  - writes go through the USER-scoped client, so RLS enforces
 *    insert(user_id = auth.uid()) and delete(own row OR admin);
 *  - reply integrity (max 1 level, same photo) is enforced a second time by
 *    the comments_reply_rules DB trigger.
 */

export type CommentsResult = { comments?: CommentThread[]; error?: string };

export type AddCommentResult = { comment?: CommentWithAuthor; error?: string };

const MAX_BODY = 500; // mirrors the DB check constraint

/** Anti-spam limits — mirrored by the comments_antispam_rules DB trigger
 *  (migration 0003). The DB is the real enforcement; the checks below are a
 *  fast first line so users get instant feedback without a wasted round-trip. */
const MAX_LINKS = 2; // URLs per comment
const RATE_WINDOW_MS = 60_000; // 60 s sliding window
const RATE_MAX_POSTS = 5; // max comments (root + reply) per window

/** Match http(s)://… or www.… — cheap link-spam heuristic. */
const URL_PATTERN = /(https?:\/\/|www\.)\S+/gi;

/** Per-instance memory of recent post timestamps per user (best effort —
 *  serverless instances are ephemeral, the DB trigger covers the rest). */
const postTimestamps = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (postTimestamps.get(userId) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (recent.length >= RATE_MAX_POSTS) {
    postTimestamps.set(userId, recent); // keep window fresh
    return true;
  }
  recent.push(now);
  postTimestamps.set(userId, recent);
  return false;
}

/** Threads for one photo, oldest first. Read-only: works for visitors too. */
export async function getCommentsAction(photoId: string): Promise<CommentsResult> {
  if (!photoId) return { error: "Foto tidak dikenali." };
  if (!isSupabaseConfigured) {
    return { comments: buildCommentThreads(demoCommentsForPhoto(photoId)) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, photo_id, user_id, parent_id, body, created_at")
    .eq("photo_id", photoId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[actions/comments] get:", error.message);
    return { error: "Gagal memuat komentar. Coba muat ulang halaman." };
  }

  return { comments: buildCommentThreads(await attachAuthors(supabase, data ?? [])) };
}

/**
 * Add a comment (root) or a reply (parentId set) as the signed-in user.
 * Returns the stored row (with author).
 */
export async function addCommentAction(
  photoId: string,
  body: string,
  parentId?: string | null,
): Promise<AddCommentResult> {
  if (!isSupabaseConfigured) {
    return {
      error:
        "Supabase belum diatur. Isi NEXT_PUBLIC_SUPABASE_URL dan kunci di .env.local, lalu jalankan ulang server.",
    };
  }

  const { user, profile } = await getSession();
  if (!user) return { error: "Masuk dulu untuk menulis komentar." };

  const text = body.trim();
  if (!text) return { error: "Komentar tidak boleh kosong." };
  if (text.length > MAX_BODY)
    return { error: `Komentar maksimal ${MAX_BODY} karakter.` };
  if (!photoId) return { error: "Foto tidak dikenali — muat ulang halaman." };

  const linkCount = text.match(URL_PATTERN)?.length ?? 0;
  if (linkCount > MAX_LINKS)
    return {
      error: `Maksimal ${MAX_LINKS} tautan dalam satu komentar — kurangi tautannya ya.`,
    };
  if (isRateLimited(user.id))
    return {
      error:
        "Kamu mengirim komentar terlalu cepat. Tunggu sekitar satu menit, ya.",
    };

  const supabase = await createClient();
  const parent = (parentId ?? "").trim() || null;

  // Validate the parent BEFORE inserting so the error message is friendly
  // (the DB trigger would reject it anyway — this is the first line).
  if (parent) {
    const { data: parentRow } = await supabase
      .from("comments")
      .select("id, photo_id, parent_id")
      .eq("id", parent)
      .maybeSingle();
    if (!parentRow) {
      return { error: "Komentar yang ingin dibalas sudah tidak ada — muat ulang komentar." };
    }
    if (parentRow.photo_id !== photoId) {
      return { error: "Balasan harus berada pada foto yang sama." };
    }
    if (parentRow.parent_id !== null) {
      return { error: "Balasan hanya bisa ditulis pada komentar utama." };
    }
  }

  const { data, error } = await supabase
    .from("comments")
    .insert({ photo_id: photoId, user_id: user.id, body: text, parent_id: parent })
    .select("id, photo_id, user_id, parent_id, body, created_at")
    .single();

  if (error) return { error: translateCommentError(error.message) };

  revalidatePath("/admin/komentar");
  const [withAuthor] = await attachAuthors(supabase, [data]);
  return {
    comment:
      withAuthor ?? {
        id: data.id,
        photo_id: data.photo_id,
        user_id: data.user_id,
        parent_id: data.parent_id,
        body: data.body,
        created_at: data.created_at,
        authorName: profile?.display_name ?? null,
        authorAvatar: profile?.avatar_url ?? null,
      },
  };
}

/**
 * Delete a comment. RLS allows deleting your own comment OR any comment
 * if you are an admin — the database is the source of truth here.
 * Deleting a root comment also removes its replies (ON DELETE CASCADE).
 */
export async function deleteCommentAction(id: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    return {
      error:
        "Supabase belum diatur. Isi NEXT_PUBLIC_SUPABASE_URL dan kunci di .env.local, lalu jalankan ulang server.",
    };
  }

  const { user } = await getSession();
  if (!user) return { error: "Masuk dulu untuk menghapus komentar." };
  if (!id) return { error: "Komentar tidak dikenali." };

  const supabase = await createClient();
  const { error } = await supabase.from("comments").delete().eq("id", id);
  if (error) return { error: translateCommentError(error.message) };

  revalidatePath("/admin/komentar");
  return {};
}

/* ------------------------------- helpers -------------------------------- */

async function attachAuthors(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: {
    id: string;
    photo_id: string;
    user_id: string;
    parent_id: string | null;
    body: string;
    created_at: string;
  }[],
): Promise<CommentWithAuthor[]> {
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const profiles = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  if (userIds.length > 0) {
    const { data: authors } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds);
    for (const p of authors ?? []) {
      profiles.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
    }
  }
  return rows.map((r) => {
    const author = profiles.get(r.user_id);
    return {
      id: r.id,
      photo_id: r.photo_id,
      user_id: r.user_id,
      parent_id: r.parent_id,
      body: r.body,
      created_at: r.created_at,
      authorName: author?.display_name ?? null,
      authorAvatar: author?.avatar_url ?? null,
    };
  });
}

function translateCommentError(message: string): string {
  if (/REGURDO_RATE_LIMITED/i.test(message))
    return "Kamu mengirim komentar terlalu cepat. Tunggu sekitar satu menit, ya.";
  if (/REGURDO_DUPLICATE/i.test(message))
    return "Komentar yang sama baru saja kamu kirim — tidak perlu dikirim dua kali.";
  if (/REGURDO_TOO_MANY_LINKS/i.test(message))
    return `Maksimal ${MAX_LINKS} tautan dalam satu komentar — kurangi tautannya ya.`;
  if (/row-level security|permission denied/i.test(message))
    return "Database menolak aksi ini — kamu hanya bisa mengubah komentar milikmu sendiri.";
  if (/check constraint/i.test(message))
    return `Komentar harus 1–${MAX_BODY} karakter.`;
  if (/comments_reply_rules|balasan|induk/i.test(message))
    return "Balasan hanya bisa ditulis pada komentar utama — muat ulang komentar lalu coba lagi.";
  if (/foreign key/i.test(message))
    return "Komentar yang ingin dibalas sudah tidak ada — muat ulang halaman.";
  if (/failed to fetch|network/i.test(message))
    return "Tidak dapat menghubungi Supabase. Periksa koneksi atau konfigurasi .env.local.";
  return message;
}
