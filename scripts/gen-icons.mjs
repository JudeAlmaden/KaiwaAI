// Renders the PWA icons from the source SVG into public/icons/.
// Run: node scripts/gen-icons.mjs
import sharp from "sharp";
import { mkdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

const svg = readFileSync(join(here, "icon-source.svg"));

// Maskable: same art, but inset on a full-bleed background so the safe zone
// (center ~80%) holds the mark when the OS clips to a circle/squircle.
const maskableSvg = (size) => Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#f3edff"/>
  <g transform="translate(${size * 0.12} ${size * 0.12}) scale(0.76)">
    ${svg.toString().replace(/<\?xml.*?\?>/, "")}
  </g>
</svg>`);

async function run() {
  for (const size of [192, 512]) {
    await sharp(svg, { density: 384 })
      .resize(size, size)
      .png()
      .toFile(join(outDir, `icon-${size}.png`));

    await sharp(maskableSvg(size), { density: 384 })
      .resize(size, size)
      .png()
      .toFile(join(outDir, `icon-maskable-${size}.png`));
  }
  // Apple touch icon (no transparency, rounded handled by iOS)
  await sharp(svg, { density: 384 })
    .resize(180, 180)
    .png()
    .toFile(join(outDir, "apple-touch-icon.png"));

  console.log("Icons written to public/icons/");
}

run();
