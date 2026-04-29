import os
from PIL import Image, ImageDraw, ImageFont

def relabel_learn_verses(img_path, output_path):
    print(f"Re-labeling {img_path} with pure white text...")
    # Open the standard unlabeled version if available
    base_path = img_path.replace("_labeled", "")
    if not os.path.exists(base_path):
        # Fallback to current and we'll surgically fix it
        img = Image.open(img_path).convert("RGBA")
        pixels = img.load()
        w, h = img.size
        purged = 0
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                # If it's yellowish/off-white (r,g high, b low)
                if r > 200 and g > 200 and b < 200 and a > 0:
                    pixels[x, y] = (255, 255, 255, a)
                    purged += 1
        img.save(output_path, "PNG")
        print(f"Surgically fixed {purged} pixels in {output_path}")
        return

    # If base exists, re-draw label properly
    img = Image.open(base_path).convert("RGBA")
    w, h = img.size
    
    # Square aspect ratio for button fitting
    size = max(w, h)
    new_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    new_img.paste(img, ((size - w) // 2, (size - h) // 2))
    
    draw = ImageDraw.Draw(new_img)
    text = "LEARN\nVERSES"
    
    font_paths = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    ]
    font = None
    for p in font_paths:
        if os.path.exists(p):
            font = ImageFont.truetype(p, 100)
            break
    if not font:
        font = ImageFont.load_default()

    # Draw centered multi-line text
    # We use a slight drop shadow for readability
    bbox = draw.multiline_textbbox((0, 0), text, font=font, align="center")
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    
    x = (size - tw) // 2
    y = size - th - 80 # Position near bottom
    
    # Shadow
    for dx, dy in [(-3,-3), (3,-3), (-3,3), (3,3), (0,3)]:
        draw.multiline_text((x+dx, y+dy), text, font=font, fill=(0,0,0,255), align="center")
        
    # Pure white text
    draw.multiline_text((x, y), text, font=font, fill=(255,255,255,255), align="center")
    
    new_img.save(output_path, "PNG")
    print(f"Re-labeled icon saved to {output_path}")

img_path = "/home/michael/proj/dcgame/images/menu/learn_verses_labeled_icon.png"
relabel_learn_verses(img_path, img_path)
