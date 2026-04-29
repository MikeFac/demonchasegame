import os
from PIL import Image

def fix_problem_icon(img_path):
    print(f"Applying island-aware fix to {img_path}...")
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {img_path}: {e}")
        return
        
    w, h = img.size
    pixels = img.load()
    
    # 1. Identify the checkerboard colors by looking at corner samples
    corner_colors = []
    for x, y in [(0,0), (w-1,0), (0,h-1), (w-1,h-1), (5,5), (w-6,5)]:
        corner_colors.append(pixels[x, y])
    
    # 2. Aggressive global removal of these specific colors if they are grays
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            saturation = max(r, g, b) - min(r, g, b)
            is_gray = saturation < 20
            
            # If it matches any corner color exactly OR is a nearby gray
            match_corner = any(abs(r-cr) < 10 and abs(g-cg) < 10 and abs(b-cb) < 10 for cr, cg, cb, ca in corner_colors)
            
            if is_gray and match_corner and a > 0:
                pixels[x, y] = (0, 0, 0, 0)

    # 3. Flood fill cleanup for edge noise
    visited = set()
    to_check = []
    for x in range(w):
        to_check.append((x, 0)); to_check.append((x, h-1))
        visited.add((x, 0)); visited.add((x, h-1))
    for y in range(h):
        to_check.append((0, y)); to_check.append((w-1, y))
        visited.add((0, y)); visited.add((w-1, y))

    while to_check:
        x, y = to_check.pop()
        r, g, b, a = pixels[x, y]
        saturation = max(r, g, b) - min(r, g, b)
        if (saturation < 40 or r < 80 or r > 180) and a > 0:
            pixels[x, y] = (0, 0, 0, 0)
            for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    to_check.append((nx, ny))

    img.save(img_path, "PNG")

menu_dir = "/home/michael/proj/dcgame/images/menu"
target_icons = [
    "options_labeled_icon.png", "instructions_labeled_icon.png", 
    "custom_game_labeled_icon.png", "missions_labeled_icon.png",
    "solo_game_labeled_icon.png"
]

for name in target_icons:
    fix_problem_icon(os.path.join(menu_dir, name))
