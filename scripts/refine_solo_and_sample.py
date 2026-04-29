import os
from PIL import Image, ImageDraw, ImageFont

def label_icon_solo(img_path, label_text, sub_text, output_path):
    print(f"Labeling {img_path} with '{label_text}' and '{sub_text}' -> {output_path}")
    img = Image.open(img_path).convert("RGBA")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    
    try:
        font_paths = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
            "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf"
        ]
        font_main = None
        font_sub = None
        for p in font_paths:
            if os.path.exists(p):
                font_main = ImageFont.truetype(p, 64)
                font_sub = ImageFont.truetype(p, 36)
                break
        if not font_main:
            font_main = ImageFont.load_default()
            font_sub = ImageFont.load_default()
    except Exception:
        font_main = ImageFont.load_default()
        font_sub = ImageFont.load_default()

    text_color = (255, 230, 150, 255) # Golden yellow
    shadow_color = (0, 0, 0, 220)
    
    # "SOLO"
    bbox_main = draw.textbbox((0, 0), label_text, font=font_main)
    w_main = bbox_main[2] - bbox_main[0]
    h_main = bbox_main[3] - bbox_main[1]
    
    # "Play Now!"
    bbox_sub = draw.textbbox((0, 0), sub_text, font=font_sub)
    w_sub = bbox_sub[2] - bbox_sub[0]
    h_sub = bbox_sub[3] - bbox_sub[1]
    
    x_main = (w - w_main) // 2
    y_main = h - h_main - 70
    
    x_sub = (w - w_sub) // 2
    y_sub = h - h_sub - 30
    
    # Draw shadows
    for dx, dy in [(-2,-2), (2,-2), (-2,2), (2,2), (0,2), (0,-2), (2,0), (-2,0)]:
        draw.text((x_main + dx, y_main + dy), label_text, font=font_main, fill=shadow_color)
        draw.text((x_sub + dx, y_sub + dy), sub_text, font=font_sub, fill=shadow_color)
    
    # Draw main text
    draw.text((x_main, y_main), label_text, font=font_main, fill=text_color)
    draw.text((x_sub, y_sub), sub_text, font=font_sub, fill=text_color)
    
    img.save(output_path, "PNG")
    print(f"Saved re-labeled icon to {output_path}")

new_solo_raw = "/home/michael/.gemini/antigravity/brain/c56e58ff-c185-47d8-a736-bc1a2b2001db/solo_game_happy_warrior_icon_png_1772861924150.png"
new_solo_labeled = "/home/michael/proj/dcgame/images/menu/solo_game_labeled_icon.png"

label_icon_solo(new_solo_raw, "SOLO", "Play Now!", new_solo_labeled)

def sample_problem_icons():
    icons = ["options_labeled_icon.png", "instructions_labeled_icon.png"]
    menu_dir = "/home/michael/proj/dcgame/images/menu"
    for name in icons:
        path = os.path.join(menu_dir, name)
        if os.path.exists(path):
            img = Image.open(path).convert("RGBA")
            # Sample 0,0 and 10,10 to find checkerboard colors
            c1 = img.getpixel((0,0))
            c2 = img.getpixel((10,10))
            print(f"Icon {name} samples: (0,0)={c1}, (10,10)={c2}")

sample_problem_icons()
