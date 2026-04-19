#!/usr/bin/env node
/**
 * Simple ICO to PNG Extractor for PaperPilot
 * Manually extracts PNG chunks from ICO file
 */

const fs = require('fs');
const path = require('path');

const REQUIRED_SIZES = [16, 32, 64, 80];
const ICO_FILE = path.join(__dirname, 'assets', 'paperpilot.ico');
const OUTPUT_DIR = path.join(__dirname, 'assets');

async function extractIco() {
  console.log('PaperPilot ICO to PNG Extractor (Simple)');
  console.log('='.repeat(50));

  if (!fs.existsSync(ICO_FILE)) {
    console.log(`❌ Error: ICO file not found at ${ICO_FILE}`);
    return false;
  }

  console.log(`✓ Found ICO file: ${ICO_FILE}`);

  try {
    const sharp = require('sharp');
    const buffer = fs.readFileSync(ICO_FILE);

    // ICO file format:
    // Header: 6 bytes (reserved, type, count)
    const count = buffer.readUInt16LE(4);
    console.log(`✓ ICO contains ${count} image(s)`);

    const images = [];

    // Read directory entries (16 bytes each)
    for (let i = 0; i < count; i++) {
      const offset = 6 + (i * 16);
      const width = buffer[offset] === 0 ? 256 : buffer[offset];
      const height = buffer[offset + 1] === 0 ? 256 : buffer[offset + 1];
      const imageSize = buffer.readUInt32LE(offset + 8);
      const imageOffset = buffer.readUInt32LE(offset + 12);

      images.push({ width, height, size: imageSize, offset: imageOffset });
      console.log(`  - ${width}x${height} at offset ${imageOffset} (${imageSize} bytes)`);
    }

    // Extract PNGs
    const extractedPngs = {};
    for (const img of images) {
      const pngBuffer = buffer.slice(img.offset, img.offset + img.size);
      extractedPngs[img.width] = pngBuffer;
    }

    // Generate required sizes
    for (const size of REQUIRED_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

      if (extractedPngs[size]) {
        // Exact size exists
        fs.writeFileSync(outputPath, extractedPngs[size]);
        console.log(`✓ Extracted ${outputPath} (${size}x${size}) - exact match`);
      } else {
        // Find largest available and resize
        const sizes = Object.keys(extractedPngs).map(Number).sort((a, b) => b - a);
        const largestSize = sizes[0];

        await sharp(extractedPngs[largestSize])
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .png()
          .toFile(outputPath);

        console.log(`✓ Created ${outputPath} (${size}x${size}) - resized from ${largestSize}x${largestSize}`);
      }
    }

    console.log(`\n🎉 Successfully generated all required icon sizes!`);
    console.log(`Generated files: ${REQUIRED_SIZES.map(s => `icon-${s}.png`).join(', ')}`);
    return true;

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.error(error.stack);
    return false;
  }
}

extractIco();
