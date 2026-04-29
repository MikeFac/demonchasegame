import os
from PIL import Image, ImageDraw

def apply_circular_mask(img_path):
    print(f"Applying circular mask to {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    
    # Create a circular mask
    mask = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(mask)
    # Draw a circle that fills most of the square but leaves a small margin for safety
    # The labels are at the bottom, so we should use a rounded rectangle or just a taller oval
    
    # If it's a labeled icon, the text is at the bottom.
    # We want to preserve the text but clean the corners.
    margin = 5
    draw.ellipse((margin, margin, w - margin, h - margin), fill=255)
    
    # If it's labeled, we need to add the bottom part (rounded rect for text)
    if "labeled" in img_path:
        # Preserve the bottom area where labels usually are
        draw.rectangle((0, h * 0.75, w, h), fill=255)
        # But we still want to clean the very corners of the label area? 
        # Actually, let's just use a rounded rect for the whole thing
        mask = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask)
        radius = 40
        draw.rounded_rectangle((margin, margin, w - margin, h - margin), radius=radius, fill=255)

    result = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    result.paste(img, (0, 0), mask=mask)
    result.save(img_path, "PNG")

def fix_wrench(img_path):
    print(f"Special fix for wrench: {img_path}")
    img = Image.open(img_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # The wrench checkerboard is blue-ish
            if r < 100 and g < 100 and b > 100 and a > 0:
                # If it's more blue than red/green, it's likely the checkerboard
                if b > r + 20 and b > g + 20:
                    pixels[x, y] = (0, 0, 0, 0)
    img.save(img_path, "PNG")

menu_dir = "/home/michael/proj/dcgame/images/menu"
for filename in os.listdir(menu_dir):
    path = os.path.join(menu_dir, filename)
    if "solo_game" in filename or "instructions" in filename or "fun_mode" in filename:
        apply_circular_mask(path)
    if "options" in filename:
        fix_wrench(path)
        apply_circular_mask(path)
