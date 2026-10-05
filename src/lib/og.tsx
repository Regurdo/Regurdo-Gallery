import { ImageResponse } from "next/og";

/**
 * Shared Open Graph card renderer (1200x630 PNG) for REGURDO.
 *
 * Used by the file-based metadata conventions (opengraph-image.tsx) of the
 * root layout, /galeri, /tentang and as the fallback for /album/[slug].
 *
 * Design matches the site: near-black background, thin gold frame, cream
 * display type. ImageResponse renders with its bundled default font, so no
 * network font fetch is needed.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

const INK = "#ece7df";
const GOLD = "#d4a95f";
const MUTED = "#9b958a";
const FAINT = "#6f6a61";

export function regurgoOgCard(
  kicker: string,
  title: string,
  subtitle: string,
  footer: string,
): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          position: "relative",
          backgroundColor: "#0b0b0b",
        }}
      >
        {/* thin gold frame */}
        <div
          style={{
            position: "absolute",
            top: 28,
            left: 28,
            right: 28,
            bottom: 28,
            display: "flex",
            border: "2px solid rgba(212, 169, 95, 0.4)",
          }}
        />

        {/* header: kicker — brand */}
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
            {kicker}
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
            REGURDO
          </div>
        </div>

        {/* middle: title + subtitle */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              color: INK,
              fontSize: 108,
              fontWeight: 700,
              letterSpacing: 6,
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              color: MUTED,
              fontSize: 28,
              letterSpacing: 2,
              marginTop: 28,
              textAlign: "center",
            }}
          >
            {subtitle}
          </div>
        </div>

        {/* footer: gold line + caption */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
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
              color: FAINT,
              fontSize: 20,
              letterSpacing: 4,
              textTransform: "uppercase",
            }}
          >
            {footer}
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
