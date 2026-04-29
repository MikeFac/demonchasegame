import os
from PIL import Image

def surgical_options_fix(img_path):
    print(f"Surgical fix for {img_path} (Options Icon)...")
    img = Image.open(img_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    # The Options icon checkerboard is blue-tinted (85, 92, 102 range)
    purged = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            
            # Check for the specific blue-gray profiles
            # Checkerboard colors from previous histogram: 
            # (85, 92, 102), (83, 90, 100), etc.
            if 70 < r < 100 and 70 < g < 105 and 90 < b < 120:
                saturation = max(r, g, b) - min(r, g, b)
                if saturation < 40: # Not the bright blue wrench
                    pixels[x, y] = (0, 0, 0, 0)
                    purged += 1
            
            # Also catch very dull grays
            elif abs(r-g) < 10 and abs(g-b) < 10 and (r < 60 or r > 200):
                pixels[x, y] = (0, 0, 0, 0)
                purged += 1

    img.save(img_path, "PNG")
    print(f"Purged {purged} pixels from Options icon.")

surgical_options_fix("/home/michael/proj/dcgame/images/menu/options_labeled_icon.png")
