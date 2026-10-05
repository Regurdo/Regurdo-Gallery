import { OG_CONTENT_TYPE, OG_SIZE, regurgoOgCard } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Gallery — REGURDO";

export default function Image() {
  return regurgoOgCard(
    "Regurdo",
    "Gallery",
    "Explore my collection",
    "Street · Architecture · Nature",
  );
}
