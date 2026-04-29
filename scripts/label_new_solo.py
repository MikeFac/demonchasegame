import os
from PIL import Image, ImageDraw, ImageFont

def label_icon(img_path, label_text, output_path):
    print(f"Labeling {img_path} with '{label_text}' -> {output_path}")
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    
    # Try to find a nice font, fallback to default
    try:
        # Common linux font paths
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
        ]
        font = None
        for p in font_paths:
            if os.path.exists(p):
                font = ImageFont.truetype(p, 64)
                break
        if not font:
            font = ImageFont.load_default()
    except Exception:
        font = ImageFont.load_default()

    # Draw text at the bottom
    # Use a subtle shadow/outline for readability
    text_color = (255, 230, 150, 255) # Golden yellow
    shadow_color = (0, 0, 0, 200)
    
    # Simple centered text at bottom 20%
    # Use textbbox to center
    bbox = draw.textbbox((0, 0), label_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    x = (w - text_w) // 2
    y = h - text_h - 40
    
    # Draw shadow
    for dx, dy in [(-2,-2), (2,-2), (-2,2), (2,2), (0,2), (0,-2), (2,0), (-2,0)]:
        draw.text((x + dx, y + dy), label_text, font=font, fill=shadow_color)
    
    # Draw main text
    draw.text((x, y), label_text, font=font, fill=text_color)
    
    img.save(output_path, "PNG")
    print(f"Saved labeled icon to {output_path}")

new_solo_raw = "/home/michael/.gemini/antigravity/brain/c56e58ff-c185-47d8-a736-bc1a2b2001db/solo_game_happy_warrior_icon_png_1772861924150.png"
new_solo_labeled = "/home/michael/proj/dcgame/images/menu/solo_game_happy_warrior_labeled.png"

label_icon(new_solo_raw, "SOLO", new_solo_labeled)
