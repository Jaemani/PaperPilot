# Icon Generation Instructions

Your Office Add-in requires icons in multiple sizes: 16x16, 32x32, 64x64, 80x80 pixels (PNG format).

**Current status:** You have `paperpilot.ico` in the `assets/` folder. This needs to be converted to individual PNG files.

## Option 1: Automated (Python Script) - RECOMMENDED

1. **Install Pillow** (Python image library):
   ```bash
   pip install Pillow
   # or
   pip3 install Pillow
   ```

2. **Run the extraction script**:
   ```bash
   cd /home/jaeman/Codes/PaperOps/PaperPilot
   python3 extract_icons_from_ico.py
   ```

This will extract/generate all required PNG files from your ICO file in the `assets/` folder.

## Option 2: Manual (Using Online Tools)

If you prefer not to install Python packages:

1. Visit [ResizeImage.net](https://resizeimage.net/) or [BulkResizePhotos.com](https://bulkresizephotos.com/)

2. Upload `assets/paperpilot.png` (225x225)

3. Resize to each size and save with the corresponding names:
   - **16x16** → `assets/icon-16.png`
   - **32x32** → `assets/icon-32.png`
   - **64x64** → `assets/icon-64.png`
   - **80x80** → `assets/icon-80.png`
   - **128x128** → `assets/icon-128.png`

## Option 3: Using ImageMagick (Command Line)

If you have ImageMagick installed:

```bash
cd assets
convert paperpilot.png -resize 16x16 icon-16.png
convert paperpilot.png -resize 32x32 icon-32.png
convert paperpilot.png -resize 64x64 icon-64.png
convert paperpilot.png -resize 80x80 icon-80.png
convert paperpilot.png -resize 128x128 icon-128.png
```

## Verification

After generating, verify all files exist:

```bash
ls -la assets/icon-*.png
```

You should see:
- icon-16.png
- icon-32.png
- icon-64.png
- icon-80.png
- icon-128.png

## Current Status

✅ Translation system - Complete (KOR/ENG for all UI text)
⏳ Icon files - Pending generation (follow instructions above)
