import { OG_CONTENT_TYPE, OG_SIZE, regurgoOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "REGURDO — Galeri Fotografi";

export default function Image() {
  return regurgoOgCard(
    "Galeri Fotografi · Probolinggo",
    "Regurdo",
    "Street · Architecture · Nature",
    "Kumpulan Karya Fotografi",
  );
}
