import os
from PIL import Image

def fix_missions_extra_cleanup(img_path):
    print(f"Surgical fix for {img_path} (Missions Icon)...")
    img = Image.open(img_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    # Based on the histogram, the background is dark gray (10-30 range)
    purged = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            
            # The background pixels are very neutral gray
            saturation = max(r, g, b) - min(r, g, b)
            
            # If it's very dark and very neutral, it's likely the background box
            if r < 40 and g < 40 and b < 40 and saturation < 10:
                pixels[x, y] = (0, 0, 0, 0)
                purged += 1
            # Also catch the edges which might be slightly lighter neutral
            elif r < 60 and g < 60 and b < 60 and saturation < 5:
                pixels[x, y] = (0, 0, 0, 0)
                purged += 1

    img.save(img_path, "PNG")
    print(f"Purged {purged} pixels from Missions icon.")

fix_missions_extra_cleanup("/home/michael/proj/dcgame/images/menu/missions_labeled_icon.png")
