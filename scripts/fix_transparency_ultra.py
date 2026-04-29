import os
from PIL import Image

def ultra_aggressive_transparency(img_path):
    print(f"Processing {img_path}...")
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {img_path}: {e}")
        return
        
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
        
        # In a 512x512 icon, anything connected to the edge that isn't vibrant is background.
        # AI-generated checkerboards are usually neutral grays.
        saturation = max(r, g, b) - min(r, g, b)
        
        # More aggressive thresholds
        is_neutral = saturation < 60 
        is_dark = r < 100 and g < 100 and b < 100
        is_light = r > 150 and g > 150 and b > 150
        
        if (is_neutral or is_dark or is_light) and a > 0:
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
        ultra_aggressive_transparency(os.path.join(menu_dir, filename))
