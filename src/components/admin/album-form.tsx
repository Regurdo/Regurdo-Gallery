"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import type { AlbumFormState } from "@/lib/actions/albums";
import type { AlbumEditData } from "@/lib/photo-utils";

const inputCls =
  "h-10 w-full rounded-sm border border-line bg-surface px-3 font-sans text-xs text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 font-sans text-[10px] text-destructive-foreground">{message}</p>;
}

function Label({ htmlFor, children, required }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="label-caps mb-1.5 block !text-[9px] !text-faint">
      {children}
      {required && <span className="ml-1 text-gold">*</span>}
    </label>
  );
}

/**
 * Shared album form for create ("baru") and edit ("[id]") pages.
 * The slug is immutable once created so existing public links never break.
 */
export function AlbumForm({
  mode,
  action,
  album,
}: {
  mode: "create" | "edit";
  action: (state: AlbumFormState, formData: FormData) => Promise<AlbumFormState>;
  album?: AlbumEditData | null;
}) {
  const [state, formActionFn, pending] = useActionState<AlbumFormState, FormData>(action, null);

  return (
    <form action={formActionFn} className="mt-8 max-w-xl">
      {album && <input type="hidden" name="id" value={album.id} />}

      {state?.error && (
        <p
          role="alert"
          className="mb-5 rounded-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 font-sans text-xs leading-relaxed text-destructive-foreground"
        >
          {state.error}
        </p>
      )}

      <div>
        <Label htmlFor="title" required>
          Judul Album
        </Label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={album?.title ?? ""}
          placeholder="cth. Senja dan Kota"
          className={inputCls}
        />
        <FieldError message={state?.fieldErrors?.title} />
      </div>

      {mode === "edit" && album && (
        <div className="mt-4">
          <Label htmlFor="slug">Slug (tautan publik)</Label>
          <input
            id="slug"
            type="text"
            value={`/album/${album.slug}`}
            readOnly
            disabled
            className={`${inputCls} cursor-not-allowed text-faint`}
          />
          <p className="mt-1 font-sans text-[10px] text-faint">
            Tautan album tidak berubah agar tautan lama tetap berfungsi.
          </p>
        </div>
      )}

      <div className="mt-4">
        <Label htmlFor="description">Deskripsi</Label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={400}
          defaultValue={album?.description ?? ""}
          placeholder="Ceritakan singkat ide di balik album ini (maks 400 karakter)…"
          className="w-full resize-y rounded-sm border border-line bg-surface px-3 py-2.5 font-sans text-xs leading-relaxed text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none"
        />
        <FieldError message={state?.fieldErrors?.description} />
      </div>

      <div className="mt-8 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="btn-gold inline-flex h-11 min-w-40 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Menyimpan…
            </>
          ) : mode === "create" ? (
            "Buat Album"
          ) : (
            "Simpan Perubahan"
          )}
        </button>
        <p className="font-sans text-[10px] leading-relaxed text-faint">
          {mode === "create"
            ? "Setelah dibuat, kamu langsung diarahkan ke halaman isi album."
            : "Perubahan judul/deskripsi langsung terlihat di halaman publik."}
        </p>
      </div>
    </form>
  );
}
