import os
from PIL import Image

def total_transparency_purge(img_path):
    print(f"Total purge for {img_path}...")
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {img_path}: {e}")
        return
        
    pixels = img.load()
    w, h = img.size
    
    # Identify the background box color by looking at the very first pixel
    # and also sampling the four corners.
    bg_candidates = [pixels[0,0], pixels[w-1, 0], pixels[0, h-1], pixels[w-1, h-1]]
    
    purged = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            
            # If it's very close to any of the corner colors
            is_bg = False
            for cr, cg, cb, ca in bg_candidates:
                if abs(r-cr) < 30 and abs(g-cg) < 30 and abs(b-cb) < 30:
                    is_bg = True
                    break
            
            # Also catch the dark neutral gray seen in missions
            saturation = max(r, g, b) - min(r, g, b)
            if (is_bg or (r < 50 and g < 50 and b < 50 and saturation < 10)):
                pixels[x, y] = (0, 0, 0, 0)
                purged += 1

    img.save(img_path, "PNG")
    print(f"Total purged {purged} pixels from {img_path}")

targets = [
    "/home/michael/proj/dcgame/images/menu/missions_labeled_icon.png",
    "/home/michael/proj/dcgame/images/menu/options_labeled_icon.png",
    "/home/michael/proj/dcgame/images/menu/instructions_labeled_icon.png"
]

for t in targets:
    if os.path.exists(t):
        total_transparency_purge(t)
