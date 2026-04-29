import os
from PIL import Image

def final_flood_cleanup(img_path):
    print(f"Flood cleanup for {img_path}...")
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {img_path}: {e}")
        return
        
    pixels = img.load()
    w, h = img.size
    
    # Flood fill from ALL edge pixels
    visited = set()
    to_check = []
    
    for x in range(w):
        to_check.append((x, 0)); to_check.append((x, h-1))
        visited.add((x, 0)); visited.add((x, h-1))
    for y in range(h):
        to_check.append((0, y)); to_check.append((w-1, y))
        visited.add((0, y)); visited.add((w-1, y))

    purged = 0
    while to_check:
        x, y = to_check.pop()
        r, g, b, a = pixels[x, y]
        
        # If it's a background pixel (dull, extreme, or similar to edge)
        saturation = max(r, g, b) - min(r, g, b)
        is_gray = saturation < 50
        is_extreme = r > 200 or r < 100 # Near white or dark background
        
        # If it's NOT transparent, and it looks like background
        if a > 0 and (is_gray or is_extreme):
            pixels[x, y] = (0, 0, 0, 0)
            purged += 1
            for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    to_check.append((nx, ny))

    img.save(img_path, "PNG")
    print(f"Flood purged {purged} pixels from {img_path}")

# Run on logo and problem icons
final_flood_cleanup("/home/michael/proj/dcgame/images/VerseBattles-logo.png")
menu_dir = "/home/michael/proj/dcgame/images/menu"
for name in ["options_labeled_icon.png", "instructions_labeled_icon.png", "custom_game_labeled_icon.png", "missions_labeled_icon.png"]:
    path = os.path.join(menu_dir, name)
    if os.path.exists(path):
        final_flood_cleanup(path)
