/**
 * Renders the PWA icons in public/icons from src/app/icon.svg.
 * Run after changing the logo: npx tsx scripts/generate-pwa-icons.mts
 */
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const outDir = path.join(root, "public", "icons");
const logo = await readFile(path.join(root, "src", "app", "icon.svg"), "utf8");

// The bars without the rounded tile, so they can be placed on other backgrounds.
const glyph = logo.replace(/<svg[^>]*>/, "").replace("</svg>", "").replace(/<rect width="64" height="64"[^>]*\/>/, "");

// Maskable icons are cropped to a circle or squircle: full-bleed colour, glyph inside the central 80%.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#4F46E5"/>
  <g transform="translate(6.4 6.4) scale(0.8)">${glyph}</g>
</svg>`;

// Android shows notification badges as a white silhouette, so only the shape matters.
const badge = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g transform="translate(-2 2)">${glyph.replace(/(stroke|fill)="#[0-9A-Fa-f]+"/g, '$1="#FFFFFF"')}</g>
</svg>`;

await mkdir(outDir, { recursive: true });

const render = (svg: string, size: number, file: string) =>
  sharp(Buffer.from(svg), { density: 72 * (size / 64) * 2 })
    .resize(size, size)
    .png()
    .toFile(path.join(outDir, file));

await Promise.all([
  render(logo, 192, "icon-192.png"),
  render(logo, 512, "icon-512.png"),
  render(maskable, 512, "icon-maskable-512.png"),
  render(badge, 96, "badge-96.png"),
]);

console.log(`Icons written to ${path.relative(root, outDir)}`);
