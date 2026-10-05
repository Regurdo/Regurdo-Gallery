import { ImageResponse } from "next/og";
import { OG_CONTENT_TYPE, OG_SIZE, regurgoOgCard } from "@/lib/og";
import { getAlbumBySlug } from "@/lib/queries";

/**
 * Per-album OG image: the album's real cover photo as a full-bleed 1200x630
 * card with a dark scrim and the album title — exactly what you want when an
 * album link is shared to WhatsApp / Instagram / X. Falls back to the shared
 * typographic card when the album has no cover (or does not exist).
 */
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Sampul album — REGURGO";
export const revalidate = 3600;

const GOLD = "#d4a95f";
const INK = "#ece7df";
const FAINT = "rgba(236, 231, 223, 0.75)";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getAlbumBySlug(slug);

  if (!data) {
    return regurgoOgCard(
      "Album Regurgo",
      "Album",
      "Kumpulan karya fotografi",
      "Street · Architecture · Nature",
    );
  }

  const { album, photos } = data;
  const cover = album.coverUrl;

  if (!cover) {
    return regurgoOgCard(
      "Album Regurgo",
      album.title,
      `${photos.length} foto — klik untuk melihat`,
      "Street · Architecture · Nature",
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#0b0b0b",
        }}
      >
        {/* full-bleed cover photo */}
        <img
          src={cover}
          alt=""
          width={1200}
          height={630}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            objectFit: "cover",
          }}
        />

        {/* dark scrim + text */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 56,
            background:
              "linear-gradient(180deg, rgba(11,11,11,0.62) 0%, rgba(11,11,11,0.18) 42%, rgba(11,11,11,0.88) 100%)",
          }}
        >
          {/* header row */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                color: GOLD,
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: 8,
                textTransform: "uppercase",
              }}
            >
              Album
            </div>
            <div
              style={{
                display: "flex",
                color: INK,
                fontSize: 24,
                fontWeight: 700,
                letterSpacing: 12,
              }}
            >
              REGURGO
            </div>
          </div>

          {/* footer: album title + photo count */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                width: 72,
                height: 2,
                backgroundColor: GOLD,
              }}
            />
            <div
              style={{
                display: "flex",
                color: INK,
                fontSize: 72,
                fontWeight: 700,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              {album.title}
            </div>
            <div
              style={{
                display: "flex",
                color: FAINT,
                fontSize: 26,
                letterSpacing: 4,
                textTransform: "uppercase",
              }}
            >
              {photos.length} Foto · Regurgo — Galeri Fotografi
            </div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
