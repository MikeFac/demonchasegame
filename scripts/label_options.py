import os
from PIL import Image, ImageDraw, ImageFont

def label_icon(img_path, label_text, output_path):
    print(f"Labeling {img_path} with '{label_text}' -> {output_path}")
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    
    try:
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

    text_color = (255, 230, 150, 255) # Golden yellow
    shadow_color = (0, 0, 0, 200)
    
    bbox = draw.textbbox((0, 0), label_text, font=font)
    text_w = bbox[2] - bbox[0]
    text_h = bbox[3] - bbox[1]
    
    x = (w - text_w) // 2
    y = h - text_h - 40
    
    for dx, dy in [(-2,-2), (2,-2), (-2,2), (2,2), (0,2), (0,-2), (2,0), (-2,0)]:
        draw.text((x + dx, y + dy), label_text, font=font, fill=shadow_color)
    
    draw.text((x, y), label_text, font=font, fill=text_color)
    
    img.save(output_path, "PNG")
    print(f"Saved labeled icon to {output_path}")

options_raw = "/home/michael/proj/dcgame/images/menu/options_icon.png"
options_labeled = "/home/michael/proj/dcgame/images/menu/options_labeled_icon.png"

label_icon(options_raw, "OPTIONS", options_labeled)
