/**
 * Client-safe comment view helpers — shared by CommentsSection (client) and
 * the server actions without pulling server-only modules into the bundle.
 */

import type { CommentThread, CommentWithAuthor } from "@/lib/types";

/** Mirrors the DB check constraint (char_length between 1 and 500). */
export const MAX_COMMENT_BODY = 500;

/** Viewer identity slice consumed by the comment UI (no savedIds needed). */
export type ViewerCommentIdentity = {
  authenticated: boolean;
  userId: string | null;
  isAdmin: boolean;
};

export type { CommentThread, CommentWithAuthor };
