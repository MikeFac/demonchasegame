import os
from PIL import Image

def exhaustive_fix(img_path):
    print(f"Exhaustive fix for {img_path}...")
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
            
            # Checkerboards are usually dull colors
            saturation = max(r, g, b) - min(r, g, b)
            
            # If it's grayish/dull and not part of a colorful graphic
            is_dull = saturation < 60
            
            # For the Options icon (blue wrench), we can be very aggressive because the wrench is bright blue
            if is_dull:
                pixels[x, y] = (0, 0, 0, 0)
                purged += 1
            # Also catch very dark or very light pixels that might be artifacts
            elif r < 60 and g < 60 and b < 60:
                pixels[x, y] = (0, 0, 0, 0)
                purged += 1
            elif r > 200 and g > 200 and b > 200:
                pixels[x, y] = (0, 0, 0, 0)
                purged += 1

    img.save(img_path, "PNG")
    print(f"Exhaustive purged {purged} pixels from {img_path}")

# Run on problem icons
menu_dir = "/home/michael/proj/dcgame/images/menu"
for name in ["options_labeled_icon.png", "instructions_labeled_icon.png", "custom_game_labeled_icon.png", "missions_labeled_icon.png", "fun_mode_labeled_icon.png", "groups_labeled_icon.png"]:
    path = os.path.join(menu_dir, name)
    if os.path.exists(path):
        exhaustive_fix(path)
        
# Logo cleanup - specifically remove white outer area
def logo_cleanup(img_path):
    print(f"Logo final cleanup {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    purged = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            # If it's nearly white or very dull gray background
            if (r > 220 and g > 220 and b > 220) or (r < 50 and g < 50 and b < 50):
                # Check for logo content: the logo is colorful (red/gold) or black lines.
                # However, if it's connected to the edge, it's definitely background.
                # Actually, just purging all near-white/gray that isn't vibrant.
                saturation = max(r, g, b) - min(r, g, b)
                if saturation < 40:
                    pixels[x, y] = (0, 0, 0, 0)
                    purged += 1
    img.save(img_path, "PNG")
    print(f"Logo purged {purged} pixels")

logo_cleanup("/home/michael/proj/dcgame/images/VerseBattles-logo.png")
