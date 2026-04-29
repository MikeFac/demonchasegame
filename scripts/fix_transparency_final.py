import os
from PIL import Image

def aggressive_transparency(img_path):
    print(f"Processing {img_path}...")
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {img_path}: {e}")
        return
        
    w, h = img.size
    pixels = img.load()
    
    visited = set()
    to_check = []
    
    # Add all edge pixels to start
    for x in range(w):
        to_check.append((x, 0))
        to_check.append((x, h-1))
        visited.add((x, 0))
        visited.add((x, h-1))
    for y in range(h):
        to_check.append((0, y))
        to_check.append((w-1, y))
        visited.add((0, y))
        visited.add((w-1, y))

    while to_check:
        x, y = to_check.pop()
        r, g, b, a = pixels[x, y]
        
        saturation = max(r, g, b) - min(r, g, b)
        # Background Detection Logic:
        # Dull grays, very dark, or very light colors connected to the edge.
        is_dull = saturation < 40 # Increased threshold for checkerboard
        is_dark = r < 60 and g < 60 and b < 60
        is_light = r > 200 and g > 200 and b > 200
        
        if (is_dull or is_dark or is_light) and a > 0:
            pixels[x, y] = (0, 0, 0, 0)
            
            for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    to_check.append((nx, ny))

    img.save(img_path, "PNG")
    print(f"Fixed {img_path}")

# Target files
new_solo = "/home/michael/.gemini/antigravity/brain/c56e58ff-c185-47d8-a736-bc1a2b2001db/solo_game_happy_warrior_icon_png_1772861924150.png"
options_icon = "/home/michael/proj/dcgame/images/menu/options_icon.png"

aggressive_transparency(new_solo)
aggressive_transparency(options_icon)
