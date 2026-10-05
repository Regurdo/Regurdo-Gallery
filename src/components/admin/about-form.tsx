"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AboutFormState } from "@/lib/actions/about";
import { updateAboutAction } from "@/lib/actions/about";
import type { AboutView } from "@/lib/queries";

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

type EquipmentRow = { key: number; name: string; role: string };

/**
 * Editor for the public /tentang page: tagline, bio, counters seed
 * (start year), city, contacts, equipment list, and the portrait image.
 * Everything lands in site_settings ("about") via updateAboutAction.
 */
export function AboutForm({ about }: { about: AboutView }) {
  const { toast } = useToast();
  const [state, formActionFn, pending] = useActionState<AboutFormState, FormData>(
    updateAboutAction,
    null,
  );

  /* ---------- portrait pick / preview ---------- */
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(about.portraitUrl);

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    if (!picked) return;
    setFile(picked);
    setPreview((prev) => {
      if (prev && prev !== about.portraitUrl) URL.revokeObjectURL(prev);
      return URL.createObjectURL(picked);
    });
  }

  function resetFile() {
    setFile(null);
    setPreview((prev) => {
      if (prev && prev !== about.portraitUrl) URL.revokeObjectURL(prev);
      return about.portraitUrl;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  /* ---------- equipment rows ---------- */
  const [rows, setRows] = useState<EquipmentRow[]>(() => {
    const initial = about.equipment.length
      ? about.equipment
      : [{ name: "", role: "" }];
    return initial.map((e, i) => ({ key: i, name: e.name, role: e.role }));
  });
  const nextKey = useRef(rows.length);

  function addRow() {
    setRows((prev) => [...prev, { key: nextKey.current++, name: "", role: "" }]);
  }
  function updateRow(key: number, patch: Partial<EquipmentRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }
  function removeRow(key: number) {
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.key !== key)));
  }

  /* ---------- success feedback ---------- */
  useEffect(() => {
    if (state?.ok) {
      toast({ title: "Perubahan tersimpan", description: "Halaman Tentang sudah diperbarui." });
    }
  }, [state?.ok, toast]);

  return (
    <form action={formActionFn} className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
      {/* ---------- portrait ---------- */}
      <div>
        <Label htmlFor="portrait">Foto Potret (opsional)</Label>
        <input
          ref={fileRef}
          id="portrait"
          name="portrait"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={onPickFile}
          className="sr-only"
        />

        {preview ? (
          <div className="overflow-hidden rounded-sm border border-line bg-surface">
            <div className="relative aspect-[4/5] w-full">
              <Image
                src={preview}
                alt={file ? file.name : (about.portrait_caption || "Potret")}
                fill
                unoptimized
                sizes="280px"
                className="object-cover"
              />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
              <span className="truncate font-sans text-[10px] text-muted-2">
                {file ? file.name : "Potret saat ini"}
              </span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-gold hover:text-ink"
              >
                {file ? "Pilih lain" : "Ganti"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-3 rounded-sm border border-dashed border-line-strong bg-surface/50 px-4 text-center transition-colors hover:border-gold/60 hover:bg-surface"
          >
            <ImagePlus className="size-7 text-faint" aria-hidden />
            <span className="font-sans text-xs text-soft">
              Klik untuk memilih potret
              <span className="mt-1 block text-[10px] text-faint">
                JPG, PNG, WebP, AVIF · maks 8 MB
              </span>
            </span>
          </button>
        )}
        <FieldError message={state?.fieldErrors?.portrait} />

        {file && (
          <button
            type="button"
            onClick={resetFile}
            className="mt-2 inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.14em] text-faint transition-colors hover:text-ink"
          >
            <RotateCcw className="size-3" /> Batalkan pilihan
          </button>
        )}

        <div className="mt-4">
          <Label htmlFor="portrait_caption">Keterangan Potret</Label>
          <input
            id="portrait_caption"
            name="portrait_caption"
            type="text"
            maxLength={120}
            defaultValue={about.portrait_caption}
            placeholder="cth. Photographer — Regurdo"
            className={inputCls}
          />
        </div>
      </div>

      {/* ---------- fields ---------- */}
      <div className="min-w-0">
        {state?.error && (
          <p
            role="alert"
            className="mb-5 rounded-sm border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 font-sans text-xs leading-relaxed text-destructive-foreground"
          >
            {state.error}
          </p>
        )}

        <div>
          <Label htmlFor="tagline" required>
            Tagline
          </Label>
          <input
            id="tagline"
            name="tagline"
            type="text"
            required
            maxLength={120}
            defaultValue={about.tagline}
            placeholder="cth. Yang penting moto"
            className={inputCls}
          />
          <FieldError message={state?.fieldErrors?.tagline} />
        </div>

        <div className="mt-4">
          <Label htmlFor="bio" required>
            Bio
          </Label>
          <textarea
            id="bio"
            name="bio"
            rows={5}
            maxLength={1200}
            defaultValue={about.bio}
            placeholder="Ceritakan dirimu sebagai fotografer (maks 1200 karakter)…"
            className="w-full resize-y rounded-sm border border-line bg-surface px-3 py-2.5 font-sans text-xs leading-relaxed text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none"
          />
          <FieldError message={state?.fieldErrors?.bio} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="start_year">Aktif Sejak (tahun)</Label>
            <input
              id="start_year"
              name="start_year"
              type="number"
              min={1900}
              max={2100}
              defaultValue={about.start_year ?? ""}
              placeholder="cth. 2022"
              className={inputCls}
            />
            <FieldError message={state?.fieldErrors?.start_year} />
          </div>
          <div>
            <Label htmlFor="city">Kota / Domisili</Label>
            <input
              id="city"
              name="city"
              type="text"
              maxLength={80}
              defaultValue={about.city}
              placeholder="cth. Probolinggo"
              className={inputCls}
            />
            <FieldError message={state?.fieldErrors?.city} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Email Kontak</Label>
            <input
              id="email"
              name="email"
              type="email"
              maxLength={120}
              defaultValue={about.email}
              placeholder="nama@email.com"
              className={inputCls}
            />
            <FieldError message={state?.fieldErrors?.email} />
          </div>
          <div>
            <Label htmlFor="instagram">Tautan Instagram</Label>
            <input
              id="instagram"
              name="instagram"
              type="url"
              maxLength={200}
              defaultValue={about.instagram}
              placeholder="https://instagram.com/akunmu"
              className={inputCls}
            />
            <FieldError message={state?.fieldErrors?.instagram} />
          </div>
        </div>

        {/* ---------- equipment ---------- */}
        <div className="mt-6 rounded-sm border border-line bg-surface/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="label-caps !text-[9px]">Perlengkapan</p>
            <button
              type="button"
              onClick={addRow}
              className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-line bg-surface px-2.5 font-sans text-[9px] font-semibold uppercase tracking-[0.14em] text-soft transition-colors hover:border-line-strong hover:text-ink"
            >
              <Plus className="size-3" aria-hidden /> Tambah Alat
            </button>
          </div>
          <FieldError message={state?.fieldErrors?.equipment} />

          <div className="mt-3 space-y-2.5">
            {rows.map((row, i) => (
              <div key={row.key} className="flex items-center gap-2">
                <span className="w-5 shrink-0 text-center font-sans text-[10px] tabular-nums text-faint">
                  {i + 1}
                </span>
                <input
                  name="equipment_name"
                  type="text"
                  maxLength={80}
                  value={row.name}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
                  placeholder="Nama alat — cth. Poco X6 Pro"
                  aria-label={`Nama alat ${i + 1}`}
                  className={inputCls}
                />
                <input
                  name="equipment_role"
                  type="text"
                  maxLength={60}
                  value={row.role}
                  onChange={(e) => updateRow(row.key, { role: e.target.value })}
                  placeholder="Peran — cth. Main Camera"
                  aria-label={`Peran alat ${i + 1}`}
                  className={`${inputCls} sm:max-w-44`}
                />
                <button
                  type="button"
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  aria-label={`Hapus alat ${i + 1}`}
                  className="grid size-9 shrink-0 place-items-center rounded-sm border border-line bg-surface text-muted-2 transition-colors hover:border-red-500/50 hover:text-red-400 disabled:pointer-events-none disabled:opacity-40"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            ))}
          </div>
          <p className="mt-3 font-sans text-[10px] leading-relaxed text-faint">
            Baris yang dibiarkan kosong otomatis diabaikan saat disimpan. Maksimal 12 alat.
          </p>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="btn-gold inline-flex h-11 min-w-44 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Menyimpan…
              </>
            ) : (
              "Simpan Perubahan"
            )}
          </button>
          <p className="font-sans text-[10px] leading-relaxed text-faint">
            Perubahan langsung tampil di halaman <span className="text-soft">/tentang</span>.
          </p>
        </div>
      </div>
    </form>
  );
}
