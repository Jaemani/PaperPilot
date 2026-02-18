// Run after dropping your logo file into assets/:
//   node scripts/resize-icons.mjs assets/YOUR_LOGO.png
//
// Generates: assets/icon-16.png, icon-32.png, icon-64.png, icon-80.png, icon-128.png

import { Jimp } from "jimp";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sizes = [16, 32, 64, 80, 128];
const inputFile = process.argv[2];

if (!inputFile) {
  console.error("Usage: node scripts/resize-icons.mjs assets/YOUR_LOGO.png");
  process.exit(1);
}

const src = path.resolve(__dirname, "..", inputFile);
console.log(`Resizing: ${src}`);

const image = await Jimp.read(src);

for (const size of sizes) {
  const out = path.resolve(__dirname, `../assets/icon-${size}.png`);
  await image.clone().resize({ w: size, h: size }).write(out);
  console.log(`  ✓ assets/icon-${size}.png`);
}

console.log("Done. All icons generated.");
