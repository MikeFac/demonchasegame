import os
from PIL import Image, ImageDraw, ImageFont

def restore_logo_text(logo_path):
    print(f"Restoring 'BATTLES.COM' text to {logo_path}...")
    img = Image.open(logo_path).convert("RGBA")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    
    # Text to add
    text = "BATTLES.COM"
    
    try:
        # Use a bold, heavy font
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
        ]
        font = None
        for p in font_paths:
            if os.path.exists(p):
                font = ImageFont.truetype(p, 180) # Large for 2048px logo
                break
        if not font:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    # Position at the bottom
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    x = (w - tw) // 2
    y = h - th - 200 # Leave some space at bottom
    
    # Draw shadow
    for dx, dy in [(-5,-5), (5,-5), (-5,5), (5,5), (0,5), (0,-5)]:
        draw.text((x + dx, y + dy), text, font=font, fill=(0,0,0,255))
        
    # Draw white text (or slightly off-white to match logo style)
    draw.text((x, y), text, font=font, fill=(255, 255, 255, 255))
    
    img.save(logo_path, "PNG")
    print(f"Logo restoration complete.")

def final_surgical_transparency(img_path):
    print(f"Final surgical transparency for {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    # We'll identify the most common "dull" colors near the corners
    # and remove them throughout the image.
    corner_samples = []
    for x in range(20):
        for y in range(20):
            corner_samples.append(pixels[x,y])
            corner_samples.append(pixels[w-x-1, y])
            corner_samples.append(pixels[x, h-y-1])
            corner_samples.append(pixels[w-x-1, h-y-1])
            
    # Filter for opaque and dull
    samples = [p for p in corner_samples if p[3] > 50]
    if not samples: return
    
    from collections import Counter
    common_colors = [c for c, count in Counter(samples).most_common(10)]
    print(f"Found suspect colors: {common_colors}")
    
    purged = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            
            # If color is in common corner colors OR is very close to one
            is_match = False
            for cr, cg, cb, ca in common_colors:
                if abs(r-cr) < 15 and abs(g-cg) < 15 and abs(b-cb) < 15:
                    is_match = True
                    break
            
            if is_match:
                pixels[x, y] = (0,0,0,0)
                purged += 1
    
    img.save(img_path, "PNG")
    print(f"Purged {purged} pixels from {img_path}")

logo_path = "/home/michael/proj/dcgame/images/VerseBattles-logo.png"
restore_logo_text(logo_path)

menu_dir = "/home/michael/proj/dcgame/images/menu"
for name in ["options_labeled_icon.png", "instructions_labeled_icon.png"]:
    final_surgical_transparency(os.path.join(menu_dir, name))
