import { OG_CONTENT_TYPE, OG_SIZE, regurgoOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Galeri — REGURGO";

export default function Image() {
  return regurgoOgCard(
    "Regurgo",
    "Galeri",
    "Jelajahi seluruh karya fotografi",
    "Street · Architecture · Nature",
  );
}
