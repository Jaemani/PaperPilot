#!/usr/bin/env python3
"""
ICO to PNG Converter for PaperPilot
Extracts individual PNG files from the ICO file
"""

from PIL import Image
import os

# Required sizes for Office Add-in
REQUIRED_SIZES = [16, 32, 64, 80]

# Paths
ICO_FILE = "assets/paperpilot.ico"
OUTPUT_DIR = "assets"

def extract_icons_from_ico():
    """Extract PNG files from ICO file"""

    if not os.path.exists(ICO_FILE):
        print(f"❌ Error: ICO file not found at {ICO_FILE}")
        return False

    try:
        # Open the ICO file
        ico = Image.open(ICO_FILE)
        print(f"✓ Loaded ICO file: {ICO_FILE}")

        # ICO files can contain multiple sizes
        # Get all available sizes
        available_sizes = []
        if hasattr(ico, 'size'):
            available_sizes.append(ico.size)

        # Try to get other sizes if ICO contains multiple
        try:
            for i in range(10):  # Try up to 10 sizes
                ico.seek(i)
                if ico.size not in available_sizes:
                    available_sizes.append(ico.size)
        except EOFError:
            pass  # No more sizes

        print(f"✓ Found {len(available_sizes)} size(s) in ICO: {available_sizes}")

        # Extract or resize to required sizes
        for target_size in REQUIRED_SIZES:
            output_path = os.path.join(OUTPUT_DIR, f"icon-{target_size}.png")

            # Try to find exact match first
            exact_match = None
            ico.seek(0)
            try:
                for i in range(len(available_sizes)):
                    ico.seek(i)
                    if ico.size == (target_size, target_size):
                        exact_match = ico.copy()
                        break
            except EOFError:
                pass

            if exact_match:
                # Save exact match
                exact_match.save(output_path, "PNG")
                print(f"✓ Extracted {output_path} ({target_size}x{target_size}) - exact match")
            else:
                # Resize from largest available
                ico.seek(0)
                resized = ico.resize((target_size, target_size), Image.Resampling.LANCZOS)
                resized.save(output_path, "PNG")
                print(f"✓ Created {output_path} ({target_size}x{target_size}) - resized from {ico.size}")

        print(f"\n🎉 Successfully generated all required icon sizes!")
        print(f"Generated files: {', '.join([f'icon-{s}.png' for s in REQUIRED_SIZES])}")
        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("PaperPilot ICO to PNG Converter")
    print("=" * 50)
    extract_icons_from_ico()
