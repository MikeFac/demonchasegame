import os
from PIL import Image

def remove_background(img_path, target_color=None, threshold=30):
    print(f"Removing background from {img_path}...")
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {img_path}: {e}")
        return
        
    pixels = img.load()
    w, h = img.size
    
    if target_color is None:
        # Sample corners to find background color
        target_color = pixels[0, 0]
        print(f"Sampled background color: {target_color}")

    # Aggressive removal of colors matching target_color
    purged = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            
            diff = abs(r - target_color[0]) + abs(g - target_color[1]) + abs(b - target_color[2])
            if diff < threshold:
                # Also check for noise and high light/low dark near edges
                pixels[x, y] = (0, 0, 0, 0)
                purged += 1
                
    # Connectivity cleanup (flood fill from edges)
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
        # Any opaque pixel near the edge that is similar to the sampled background 
        # or just "dull" (likely background)
        diff = abs(r - target_color[0]) + abs(g - target_color[1]) + abs(b - target_color[2])
        sat = max(r,g,b) - min(r,g,b)
        
        if a > 0 and (diff < 100 or sat < 30 or (r > 200 and g > 200 and b > 200)):
            pixels[x, y] = (0, 0, 0, 0)
            purged += 1
            for dx, dy in [(0,1), (0,-1), (1,0), (-1,0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                    visited.add((nx, ny))
                    to_check.append((nx, ny))

    img.save(img_path, "PNG")
    print(f"Purged {purged} pixels from {img_path}")

# Fix logo
remove_background("/home/michael/proj/dcgame/images/VerseBattles-logo.png")

# Re-fix problem icons with broader thresholds
menu_dir = "/home/michael/proj/dcgame/images/menu"
for name in ["options_labeled_icon.png", "instructions_labeled_icon.png", "custom_game_labeled_icon.png", "missions_labeled_icon.png"]:
    path = os.path.join(menu_dir, name)
    if os.path.exists(path):
        remove_background(path, threshold=50)
