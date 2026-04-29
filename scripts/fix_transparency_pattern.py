import os
from PIL import Image

def pattern_aware_transparency(img_path):
    print(f"Processing {img_path}...")
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {img_path}: {e}")
        return
        
    w, h = img.size
    pixels = img.load()
    
    # Analyze common grays
    grays = []
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a > 0:
                saturation = max(r, g, b) - min(r, g, b)
                if saturation < 15: # Very neutral grays
                    grays.append((r, g, b))
    
    from collections import Counter
    common_grays = [color for color, count in Counter(grays).most_common(10)]
    print(f"Detected common grays: {common_grays}")

    # Remove neutral grays that are likely background
    # We'll use a more aggressive edge-connected search too
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
        
        # If it's one of the common grays OR very neutral/dark/light
        is_common_gray = (r, g, b) in common_grays
        is_neutral = saturation < 25
        is_extreme = r < 80 or r > 180 # Likely background if connected to edge
        
        if (is_common_gray or is_neutral or is_extreme) and a > 0:
            pixels[x, y] = (0, 0, 0, 0)
            for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    to_check.append((nx, ny))

    img.save(img_path, "PNG")
    print(f"Fixed {img_path}")

menu_dir = "/home/michael/proj/dcgame/images/menu"
for filename in os.listdir(menu_dir):
    if filename.endswith(".png"):
        pattern_aware_transparency(os.path.join(menu_dir, filename))
