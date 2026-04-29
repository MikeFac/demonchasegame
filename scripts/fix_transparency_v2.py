import os
from PIL import Image, ImageDraw

def flood_fill_transparency(img_path):
    print(f"Processing {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    
    # We'll use a mask to identify background pixels
    # Start flood fill from the four corners
    pixels = img.load()
    
    # Target colors for checkerboard/background (various grays)
    # If a pixel matches a gray profile and is connected to the edge, it's background
    
    def is_background_candidate(x, y):
        r, g, b, a = pixels[x, y]
        # If it's already transparent, skip
        if a < 50: return False
        
        # Check if it's a shade of gray/black/white
        # R, G, B should be close to each other
        diff = max(abs(r-g), abs(g-b), abs(r-b))
        is_gray = diff < 15
        
        # Also check for very dark or very light
        is_dark = r < 50 and g < 50 and b < 50
        is_light = r > 180 and g > 180 and b > 180
        
        return is_gray or is_dark or is_light

    # Use a simpler approach: anything connected to the edge that isn't vibrant is background
    # Actually, let's just use the "is_background_candidate" logic with flood fill
    
    mask = Image.new("L", (w, h), 0)
    # Seed flood fill from corners
    seeds = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]
    # Also seed from all edge points for safety
    for x in range(0, w, 10):
        seeds.append((x, 0))
        seeds.append((x, h-1))
    for y in range(0, h, 10):
        seeds.append((0, y))
        seeds.append((w-1, y))

    visited = set()
    to_fill = []
    
    for seed in seeds:
        if is_background_candidate(seed[0], seed[1]):
            to_fill.append(seed)
            visited.add(seed)

    while to_fill:
        x, y = to_fill.pop()
        pixels[x, y] = (0, 0, 0, 0)
        
        for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                if is_background_candidate(nx, ny):
                    visited.add((nx, ny))
                    to_fill.append((nx, ny))

    img.save(img_path, "PNG")
    print(f"Aggressive transparency fix applied to {img_path}")

menu_dir = "/home/michael/proj/dcgame/images/menu"
for filename in os.listdir(menu_dir):
    if filename.endswith(".png"):
        flood_fill_transparency(os.path.join(menu_dir, filename))
