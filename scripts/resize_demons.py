#!/usr/bin/env python3
"""
Resize new demon images to 48x48 to match existing demons
"""
from PIL import Image
import os

# Target size (matching existing demons)
TARGET_SIZE = (48, 48)

# New demon images to resize
new_demons = [
    'images/monsters/DECEPTION_SPIRIT1.png',
    'images/monsters/DEMON-OF-POVERTY.png',
    'images/monsters/DEMON-SWARM.png',
    'images/monsters/DISCOURAGEMENT.png',
    'images/monsters/JEZEBEL.png',
    'images/monsters/SHAME-ACCUSATION.png',
    'images/monsters/SPIRITUALBLINDNESS.png',
    'images/monsters/PRIDE.png'
]

for img_path in new_demons:
    if not os.path.exists(img_path):
        print(f"⚠️  Skipping {img_path} - file not found")
        continue
    
    print(f"Resizing {img_path}...")
    
    # Open image
    img = Image.open(img_path)
    original_size = img.size
    
    # Resize using LANCZOS (high quality)
    resized = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    
    # Save back
    resized.save(img_path)
    
    print(f"  ✅ {original_size} -> {TARGET_SIZE}")

print("\n✅ All images resized!")
