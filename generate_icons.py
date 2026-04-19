#!/usr/bin/env python3
"""
Icon Generator for PaperPilot
Resizes the 225x225 logo to multiple sizes required by Office Add-in manifest
"""

from PIL import Image
import os

# Icon sizes required
SIZES = [16, 32, 64, 80, 128]

# Paths
SOURCE_LOGO = "assets/paperpilot.png"
OUTPUT_DIR = "assets"

def generate_icons():
    """Generate all required icon sizes from source logo"""

    if not os.path.exists(SOURCE_LOGO):
        print(f"❌ Error: Source logo not found at {SOURCE_LOGO}")
        return False

    try:
        # Open source image
        img = Image.open(SOURCE_LOGO)
        print(f"✓ Loaded source logo: {img.size[0]}x{img.size[1]} pixels")

        # Generate each size
        for size in SIZES:
            output_path = os.path.join(OUTPUT_DIR, f"icon-{size}.png")

            # Resize with high-quality resampling
            resized = img.resize((size, size), Image.Resampling.LANCZOS)

            # Save
            resized.save(output_path, "PNG")
            print(f"✓ Created {output_path} ({size}x{size})")

        print(f"\n🎉 Successfully generated {len(SIZES)} icon sizes!")
        print(f"Generated files: {', '.join([f'icon-{s}.png' for s in SIZES])}")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("PaperPilot Icon Generator")
    print("=" * 50)
    generate_icons()
