"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";
import { ImagePlus, Loader2, RotateCcw } from "lucide-react";
import type { PhotoFormState } from "@/lib/actions/photos";
import { compressImage } from "@/lib/image-compress";
import {
  CAMERA_PRESETS,
  LENS_PRESETS,
  exifNumber,
  formatAperture,
  formatCameraName,
  formatBytes,
  formatShutter,
  mergeOptions,
} from "@/lib/photo-utils";
import type { AdminPhoto, CategoryOption } from "@/lib/photo-utils";

const inputCls =
  "h-10 w-full rounded-sm border border-line bg-surface px-3 font-sans text-xs text-ink placeholder:text-faint focus:border-gold/50 focus:outline-none";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 font-sans text-[10px] text-destructive-foreground">{message}</p>;
}

/** One-click suggestion chips (max 4) under the camera/lens inputs. */
function QuickPicks({ options, onPick }: { options: string[]; onPick: (value: string) => void }) {
  if (options.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {options.slice(0, 4).map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onPick(v)}
          className="max-w-full truncate rounded-full border border-line bg-surface px-2 py-0.5 font-sans text-[10px] text-muted-2 transition-colors hover:border-gold/50 hover:text-gold"
        >
          {v}
        </button>
      ))}
    </div>
  );
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
 * Shared photo form for upload ("baru") and edit ("[id]") pages.
 * The server action is passed from the page; it validates again server-side.
 */
export function PhotoForm({
  mode,
  action,
  categories,
  photo,
  cameraOptions = [],
  lensOptions = [],
}: {
  mode: "upload" | "edit";
  action: (state: PhotoFormState, formData: FormData) => Promise<PhotoFormState>;
  categories: CategoryOption[];
  photo?: AdminPhoto;
  cameraOptions?: string[];
  lensOptions?: string[];
}) {
  const [state, formActionFn, pending] = useActionState<PhotoFormState, FormData>(action, null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(photo?.url ?? null);
  const [exifNote, setExifNote] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [compressNote, setCompressNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const compressSeq = useRef(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const lensRef = useRef<HTMLInputElement>(null);
  const isoRef = useRef<HTMLInputElement>(null);
  const apertureRef = useRef<HTMLInputElement>(null);
  const shutterRef = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  /* Suggestion lists: nilai yang pernah dipakai dulu, dilengkapi preset bawaan. */
  const cameraList = mergeOptions(cameraOptions, CAMERA_PRESETS);
  const lensList = mergeOptions(lensOptions, LENS_PRESETS);

  /*
   * Preview lives in event handlers (no effect): picking a file revokes the
   * previous object URL (unless it is the stored photo URL) and mints a new one.
   *
   * Compression flow: the ORIGINAL file is shown + EXIF-read immediately,
   * then compressImage runs in the background. When it succeeds, the file
   * input is SWAPPED to the compressed file via DataTransfer (the input —
   * not React state — is what the form actually submits) and the preview
   * is refreshed so size/name always match what will be uploaded.
   */
  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    setCompressNote(null);
    if (!picked) {
      compressSeq.current += 1; // cancel any in-flight compression
      setCompressing(false);
      setFile(null);
      setPreview((prev) => {
        if (prev && prev !== photo?.url) URL.revokeObjectURL(prev);
        return photo?.url ?? null;
      });
      return;
    }
    setFile(picked);
    setPreview((prev) => {
      if (prev && prev !== photo?.url) URL.revokeObjectURL(prev);
      return URL.createObjectURL(picked);
    });
    if (picked) void autofillFromExif(picked); // EXIF lives in the ORIGINAL
    void compressPicked(picked);
  }

  async function compressPicked(original: File) {
    const seq = ++compressSeq.current;
    setCompressing(true);
    try {
      const res = await compressImage(original);
      if (seq !== compressSeq.current) return; // user picked another file
      if (res.compressed) {
        const input = fileRef.current;
        if (input) {
          const dt = new DataTransfer();
          dt.items.add(res.file);
          input.files = dt.files; // the form now submits the compressed file
        }
        setFile(res.file);
        setPreview((prev) => {
          if (prev && prev !== photo?.url) URL.revokeObjectURL(prev);
          return URL.createObjectURL(res.file);
        });
      }
      setCompressNote(res.note);
    } finally {
      if (seq === compressSeq.current) setCompressing(false);
    }
  }

  /*
   * Baca EXIF foto yang dipilih lalu isi kolom yang MASIH KOSONG
   * (kamera, lensa, ISO, bukaan, rana, tahun). Nilai yang sudah diketik
   * tidak pernah ditimpa. Kegagalan pembacaan diabaikan diam-diam
   * (screenshot PNG/WebP memang tidak punya EXIF).
   */
  async function autofillFromExif(f: File) {
    let d: Record<string, unknown> | undefined;
    try {
      const exifr = await import("exifr");
      d = (await exifr.parse(f, {
        tiff: true,
        exif: true,
        gps: false,
        xmp: false,
        icc: false,
        iptc: false,
      })) as Record<string, unknown> | undefined;
    } catch {
      return;
    }
    if (!d) return;

    const filled: string[] = [];
    const trySet = (ref: React.RefObject<HTMLInputElement | null>, value: string | null) => {
      if (!value) return;
      const el = ref.current;
      if (el && el.value.trim() === "") {
        el.value = value;
        filled.push(value);
      }
    };

    trySet(cameraRef, formatCameraName(d.Model as string | undefined));
    trySet(lensRef, (d.LensModel as string | undefined)?.trim() || null);
    const iso = exifNumber(d.ISO ?? d.Iso ?? d.ISOSpeedRatings);
    trySet(isoRef, iso !== null && iso > 0 ? String(Math.round(iso)) : null);
    const fNumber = exifNumber(d.FNumber);
    trySet(apertureRef, fNumber !== null ? formatAperture(fNumber) : null);
    const exposure = exifNumber(d.ExposureTime);
    trySet(shutterRef, exposure !== null ? formatShutter(exposure) : null);
    if (
      yearRef.current &&
      yearRef.current.value.trim() === "" &&
      d.DateTimeOriginal instanceof Date &&
      !Number.isNaN(d.DateTimeOriginal.valueOf())
    ) {
      const y = d.DateTimeOriginal.getFullYear();
      if (y >= 1900 && y <= 2100) yearRef.current.value = String(y);
    }

    if (filled.length > 0) {
      setExifNote(`Terisi otomatis dari EXIF: ${filled.join(" · ")}`);
    }
  }

  function resetFile() {
    compressSeq.current += 1; // cancel any in-flight compression
    setCompressing(false);
    setCompressNote(null);
    setFile(null);
    setPreview((prev) => {
      if (prev && prev !== photo?.url) URL.revokeObjectURL(prev);
      return photo?.url ?? null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form action={formActionFn} className="mt-8 grid gap-8 lg:grid-cols-[300px_1fr]">
      {photo && <input type="hidden" name="id" value={photo.id} />}

      {/* ---------- preview / dropzone ---------- */}
      <div>
        <Label htmlFor="file">{mode === "upload" ? "File Foto" : "Ganti Foto (opsional)"}</Label>
        <input
          ref={fileRef}
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={onPickFile}
          className="sr-only"
        />

        {preview ? (
          <div className="group relative overflow-hidden rounded-sm border border-line bg-surface">
            <div className="relative aspect-[4/5] w-full">
              <Image src={preview} alt={file ? file.name : (photo?.title ?? "Pratinjau")} fill unoptimized sizes="300px" className="object-contain" />
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
              <span className="truncate font-sans text-[10px] text-muted-2">
                {file ? `${file.name} · ${formatBytes(file.size)}` : (photo ? `${photo.width} × ${photo.height} px` : "—")}
              </span>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-gold hover:text-ink"
              >
                {photo && !file ? "Ganti" : "Pilih lain"}
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
              Klik untuk memilih foto
              <span className="mt-1 block text-[10px] text-faint">
                JPG, PNG, WebP, AVIF · foto besar otomatis dikompres ≤ 1 MB
              </span>
            </span>
          </button>
        )}
        <FieldError message={state?.fieldErrors?.file} />

        {file && (
          <button
            type="button"
            onClick={resetFile}
            className="mt-2 inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-[0.14em] text-faint transition-colors hover:text-ink"
          >
            <RotateCcw className="size-3" /> Batalkan pilihan
          </button>
        )}

        {compressing && (
          <p className="mt-1.5 flex items-center gap-1.5 font-sans text-[10px] leading-relaxed text-gold">
            <Loader2 className="size-3 animate-spin" aria-hidden /> Mengompres foto…
          </p>
        )}
        {!compressing && compressNote && (
          <p className="mt-1.5 font-sans text-[10px] leading-relaxed text-gold">{compressNote}</p>
        )}
      </div>

      {/* ---------- metadata ---------- */}
      <div>
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
            Judul Foto
          </Label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={120}
            defaultValue={photo?.title ?? ""}
            placeholder="cth. Senja di Kota Tua"
            className={inputCls}
          />
          <FieldError message={state?.fieldErrors?.title} />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="category_id">Kategori</Label>
            <select
              id="category_id"
              name="category_id"
              defaultValue={photo?.category_id ?? ""}
              className={`${inputCls} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[position:right_0.75rem_center] bg-no-repeat pr-9`}
            >
              <option value="">— Tanpa Kategori —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="year">Tahun</Label>
            <input
              ref={yearRef}
              id="year"
              name="year"
              type="number"
              inputMode="numeric"
              min={1900}
              max={2100}
              defaultValue={photo?.year ?? ""}
              placeholder="cth. 2024"
              className={inputCls}
            />
            <FieldError message={state?.fieldErrors?.year} />
          </div>
        </div>

        <p className="label-caps mt-6 !text-[9px] !text-faint">Data Kamera (opsional)</p>
        <p className="mt-1 font-sans text-[10px] leading-relaxed text-faint">
          Saran bisa diklik langsung, atau ketik manual. EXIF foto juga dibaca otomatis.
        </p>
        {exifNote && (
          <p className="mt-1.5 font-sans text-[10px] leading-relaxed text-gold">{exifNote}</p>
        )}
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="camera">Kamera</Label>
            <input
              ref={cameraRef}
              id="camera"
              name="camera"
              type="text"
              maxLength={80}
              list="datalist-kamera"
              defaultValue={photo?.camera ?? ""}
              placeholder="cth. Poco X6 Pro"
              className={inputCls}
            />
            <datalist id="datalist-kamera">
              {cameraList.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <QuickPicks
              options={cameraList}
              onPick={(v) => {
                if (cameraRef.current) cameraRef.current.value = v;
              }}
            />
            <FieldError message={state?.fieldErrors?.camera} />
          </div>
          <div>
            <Label htmlFor="lens">Lensa</Label>
            <input
              ref={lensRef}
              id="lens"
              name="lens"
              type="text"
              maxLength={80}
              list="datalist-lensa"
              defaultValue={photo?.lens ?? ""}
              placeholder="cth. 23mm f/1.7"
              className={inputCls}
            />
            <datalist id="datalist-lensa">
              {lensList.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <QuickPicks
              options={lensList}
              onPick={(v) => {
                if (lensRef.current) lensRef.current.value = v;
              }}
            />
            <FieldError message={state?.fieldErrors?.lens} />
          </div>
          <div>
            <Label htmlFor="iso">ISO</Label>
            <input ref={isoRef} id="iso" name="iso" type="text" maxLength={20} defaultValue={photo?.iso ?? ""} placeholder="cth. 100" className={inputCls} />
            <FieldError message={state?.fieldErrors?.iso} />
          </div>
          <div>
            <Label htmlFor="aperture">Bukaan</Label>
            <input ref={apertureRef} id="aperture" name="aperture" type="text" maxLength={20} defaultValue={photo?.aperture ?? ""} placeholder="cth. f/2.0" className={inputCls} />
            <FieldError message={state?.fieldErrors?.aperture} />
          </div>
          <div>
            <Label htmlFor="shutter">Rana</Label>
            <input ref={shutterRef} id="shutter" name="shutter" type="text" maxLength={40} defaultValue={photo?.shutter ?? ""} placeholder="cth. 1/500s" className={inputCls} />
            <FieldError message={state?.fieldErrors?.shutter} />
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || compressing}
            className="btn-gold inline-flex h-11 min-w-40 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {compressing || pending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {compressing ? "Mengompres…" : mode === "upload" ? "Mengunggah…" : "Menyimpan…"}
              </>
            ) : mode === "upload" ? (
              "Unggah Foto"
            ) : (
              "Simpan Perubahan"
            )}
          </button>
          <p className="font-sans text-[10px] leading-relaxed text-faint">
            {mode === "upload"
              ? "Foto dikompres otomatis di browser sebelum dikirim."
              : "Perubahan langsung terlihat di galeri."}
          </p>
        </div>
      </div>
    </form>
  );
}
