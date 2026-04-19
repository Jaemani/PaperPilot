# Scripts

Utility scripts for development, maintenance, and asset management.

## Available Scripts

- **`resize-icons.mjs`**: A Node.js utility script that uses `sharp` or similar libraries (if available) to generate the multiple icon sizes required by the Word Add-in manifest.
  - Generates: 16x16, 32x32, 64x64, and 80x80 PNG files.
  - Ensures compatibility with high-DPI displays across Windows, Mac, and Web versions of Office.

## Usage

```bash
# Example usage (depending on implementation)
node scripts/resize-icons.mjs assets/paperpilot.png
```
