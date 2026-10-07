/*
 * Generates PWA icons from public/logo.svg using sharp (already a dependency).
 *
 *   public/icons/icon-192.png            any
 *   public/icons/icon-512.png            any
 *   public/icons/icon-maskable-512.png   maskable (full-bleed bg + mark at 90%,
 *                                            inside the 80% safe-zone circle)
 *   public/icons/apple-touch-icon.png    180x180, flattened (iOS hates alpha)
 *   src/app/icon.png                     favicon source for Next (512)
 *
 * Run: node scripts/generate-pwa-icons.mjs
 */
import { readFile, mkdir } from "node:fs/promises";
import sharp from "sharp";
import path from "node:path";

const root = path.resolve(process.cwd());
const logo = await readFile(path.join(root, "public", "logo.svg"));

// logo.svg viewBox is 30x30 with no width/height — density scales the raster.
const VB = 30;
const density = (target) => Math.round(72 * (target / VB));

await mkdir(path.join(root, "public", "icons"), { recursive: true });

// Plain icons: the logo is already a full-bleed rounded square.
for (const size of [192, 512]) {
  await sharp(logo, { density: density(size) })
    .resize(size, size)
    .png()
    .toFile(path.join(root, "public", "icons", `icon-${size}.png`));
  console.log(`icon-${size}.png`);
}

// Maskable: Android crops to a circle/rounded-square — keep the white mark
// inside the 80% safe-zone (scale 0.9 around the center) on a solid tile.
const MARK = `
  <path d="M15.47,7.1l-1.3,1.85c-0.2,0.29-0.54,0.47-0.9,0.47h-7.1V7.09C6.16,7.1,15.47,7.1,15.47,7.1z"/>
  <polygon points="24.3,7.1 13.14,22.91 5.7,22.91 16.86,7.1"/>
  <path d="M14.53,22.91l1.31-1.86c0.2-0.29,0.54-0.47,0.9-0.47h7.09v2.33H14.53z"/>`;
const maskableSvg = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30">
     <rect width="30" height="30" fill="#2D2D2D"/>
     <g fill="#FFFFFF" transform="translate(1.5,1.5) scale(0.9)">${MARK}</g>
   </svg>`
);
await sharp(maskableSvg, { density: density(512) })
  .resize(512, 512)
  .png()
  .toFile(path.join(root, "public", "icons", "icon-maskable-512.png"));
console.log("icon-maskable-512.png");

// apple-touch-icon: iOS fills transparent corners with black — flatten onto
// the theme background so the tile blends in cleanly.
await sharp(logo, { density: density(180) })
  .resize(180, 180)
  .flatten({ background: "#0b0b0b" })
  .png()
  .toFile(path.join(root, "public", "icons", "apple-touch-icon.png"));
console.log("apple-touch-icon.png");

// src/app/icon.png — Next picks this up as the browser-tab favicon.
await sharp(logo, { density: density(512) })
  .resize(512, 512)
  .png()
  .toFile(path.join(root, "src", "app", "icon.png"));
console.log("src/app/icon.png");
