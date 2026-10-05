"use client";

import { useActionState } from "react";
import { Loader2, Plus } from "lucide-react";
import { createCategoryAction, type CategoryFormState } from "@/lib/actions/categories";

const inputCls =
  "h-10 w-full rounded-sm border border-line bg-surface px-3 font-sans text-xs text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 font-sans text-[10px] text-destructive-foreground">{message}</p>;
}

/**
 * Inline "add category" form shown at the top of the category manager.
 * On success the server action redirects back to /admin/kategori?created=1,
 * so the form resets and the page notice appears.
 */
export function CategoryForm() {
  const [state, formActionFn, pending] = useActionState<CategoryFormState, FormData>(
    createCategoryAction,
    null,
  );

  return (
    <form action={formActionFn} className="rounded-sm border border-line bg-surface p-5">
      <h2 className="label-caps !text-[9px] !text-faint">Tambah Kategori Baru</h2>
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-1">
          <label htmlFor="name" className="sr-only">
            Nama kategori
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={60}
            placeholder="cth. Lanskap, Potret, Street…"
            className={inputCls}
          />
          <FieldError message={state?.fieldErrors?.name} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="btn-gold inline-flex h-10 shrink-0 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden /> Menyimpan…
            </>
          ) : (
            <>
              <Plus className="size-4" aria-hidden /> Tambah Kategori
            </>
          )}
        </button>
      </div>

      {state?.error && !state.fieldErrors && (
        <p
          role="alert"
          className="mt-3 rounded-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 font-sans text-xs leading-relaxed text-destructive-foreground"
        >
          {state.error}
        </p>
      )}

      <p className="mt-3 font-sans text-[10px] leading-relaxed text-faint">
        Nama tampil di chip KOLEKSI dan label foto. Slug untuk tautan filter dibuat otomatis dari
        nama dan tidak berubah setelahnya.
      </p>
    </form>
  );
}
