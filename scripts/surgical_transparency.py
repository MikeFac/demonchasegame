import os
from PIL import Image

def surgical_fix(img_path, colors_to_remove):
    print(f"Surgical fix for {img_path}...")
    img = Image.open(img_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if a == 0: continue
            
            # Check if it matches any of the target "checkerboard" colors
            # We use a small threshold
            is_match = False
            for target_c in colors_to_remove:
                if abs(r - target_c[0]) < 15 and abs(g - target_c[1]) < 15 and abs(b - target_c[2]) < 15:
                    is_match = True
                    break
            
            if is_match:
                pixels[x, y] = (0, 0, 0, 0)

    img.save(img_path, "PNG")

# Let's get "common colors" that are likely checkerboard grays/blues
def get_suspected_checkerboard_colors(path):
    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    colors = []
    # Sample corners more broadly
    for x in [5, 10, 20]:
        for y in [5, 10, 20]:
            colors.append(pixels[x, y])
            colors.append(pixels[w-x-1, y])
            colors.append(pixels[x, h-y-1])
            colors.append(pixels[w-x-1, h-y-1])
    
    # Filter for opaque colors that are dull (low saturation) or specific blue-gray
    suspects = []
    for r, g, b, a in colors:
        if a > 100:
            sat = max(r,g,b) - min(r,g,b)
            if sat < 40 or (b > r + 10 and b > g + 10): # gray or blue-gray
                suspects.append((r, g, b))
    return list(set(suspects))

menu_dir = "/home/michael/proj/dcgame/images/menu"
targets = ["options_labeled_icon.png", "instructions_labeled_icon.png", "custom_game_labeled_icon.png"]

for name in targets:
    path = os.path.join(menu_dir, name)
    if os.path.exists(path):
        suspects = get_suspected_checkerboard_colors(path)
        print(f"Target {name} suspects: {suspects}")
        surgical_fix(path, suspects)
