import os
from PIL import Image

def global_purge(img_path):
    print(f"Global purge for {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    removed_count = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            
            # Checkerboard Detection:
            # Most checkerboards in these AI images are:
            # 1. Neutral grays (R~G~B)
            # 2. Dark blues/grays (low saturation)
            # 3. Specific patterns
            
            saturation = max(r, g, b) - min(r, g, b)
            
            # If it's very dull and not a highlight
            is_dull = saturation < 40
            is_dark = r < 100 and g < 100 and b < 100
            
            # Specific check for the dark blue detected in histogram: (26, 34, 53)
            is_suspect_blue = (20 < r < 40 and 20 < g < 50 and 40 < b < 70)
            
            # We must be careful not to remove the wrench itself which is blue.
            # However, the wrench is VIBRANT blue.
            
            if (is_dull and is_dark) or is_suspect_blue:
                # If it's NOT vibrant blue (wrench) 
                if saturation < 50: 
                    pixels[x, y] = (0, 0, 0, 0)
                    removed_count += 1

    img.save(img_path, "PNG")
    print(f"Purged {removed_count} pixels from {img_path}")

menu_dir = "/home/michael/proj/dcgame/images/menu"
targets = ["options_labeled_icon.png", "instructions_labeled_icon.png", "custom_game_labeled_icon.png", "missions_labeled_icon.png"]

for name in targets:
    path = os.path.join(menu_dir, name)
    if os.path.exists(path):
        global_purge(path)
