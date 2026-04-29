import os
from PIL import Image

def aggressive_transparency(img_path):
    print(f"Processing {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    pixels = img.load()
    
    # Flood fill starting from all edges
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
        
        # Background Detection Logic:
        # 1. Nearly Gray: max(r,g,b) - min(r,g,b) < 25
        # 2. Or very dark: r,g,b < 40
        # 3. Or very light: r,g,b > 210
        saturation = max(r, g, b) - min(r, g, b)
        is_dull = saturation < 30
        is_dark = r < 50 and g < 50 and b < 50
        is_light = r > 210 and g > 210 and b > 210
        
        if (is_dull or is_dark or is_light) and a > 0:
            # It's background!
            pixels[x, y] = (0, 0, 0, 0)
            
            # Check neighbors
            for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    to_check.append((nx, ny))

    img.save(img_path, "PNG")
    print(f"Fixed {img_path}")

# Process Menu Icons
menu_dir = "/home/michael/proj/dcgame/images/menu"
for filename in os.listdir(menu_dir):
    if filename.endswith(".png"):
        aggressive_transparency(os.path.join(menu_dir, filename))

# Process Logo
aggressive_transparency("/home/michael/proj/dcgame/images/VerseBattles-logo.png")
aggressive_transparency("/home/michael/proj/dcgame/images/demon-frown.png") # Just in case it's used elsewhere
