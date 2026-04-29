import os
from PIL import Image

def ultra_aggressive_fix(img_path, target_profiles):
    print(f"Ultra-aggressive fix for {img_path}...")
    try:
        img = Image.open(img_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening {img_path}: {e}")
        return
        
    pixels = img.load()
    w, h = img.size
    
    purged = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            
            should_purge = False
            for profile in target_profiles:
                if profile == "nearly_white":
                    if r > 240 and g > 240 and b > 240:
                        should_purge = True
                elif profile == "blue_tinted_gray":
                    # Focus on (80-90, 85-95, 100-110)
                    if 70 < r < 100 and 70 < g < 105 and 90 < b < 120:
                        should_purge = True
                elif profile == "dark_gray":
                    if r < 110 and g < 110 and b < 110 and (max(r,g,b)-min(r,g,b)) < 20:
                        should_purge = True
            
            if should_purge:
                pixels[x, y] = (0, 0, 0, 0)
                purged += 1

    img.save(img_path, "PNG")
    print(f"Purged {purged} pixels from {img_path}")

# Fix Logo
logo_path = "/home/michael/proj/dcgame/images/VerseBattles-logo.png"
ultra_aggressive_fix(logo_path, ["nearly_white"])

# Fix Options and Help
menu_dir = "/home/michael/proj/dcgame/images/menu"
for name in ["options_labeled_icon.png", "instructions_labeled_icon.png", "custom_game_labeled_icon.png", "missions_labeled_icon.png"]:
    path = os.path.join(menu_dir, name)
    if os.path.exists(path):
        ultra_aggressive_fix(path, ["blue_tinted_gray", "dark_gray"])
