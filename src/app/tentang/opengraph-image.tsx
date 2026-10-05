import { OG_CONTENT_TYPE, OG_SIZE, regurgoOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tentang — REGURGO";

export default function Image() {
  return regurgoOgCard(
    "Regurgo",
    "Tentang",
    "Fotografer di balik galeri ini",
    "Perjalanan · Perlengkapan · Kontak",
  );
}
