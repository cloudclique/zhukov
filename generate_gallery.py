import os
import json
from PIL import Image
from PIL.ExifTags import TAGS

PICTURES_DIR = 'pictures'
OUTPUT_FILE = 'images.json'

def get_exif_date(filepath):
    try:
        image = Image.open(filepath)
        exifdata = image.getexif()
        # EXIF DateTime format is "YYYY:MM:DD HH:MM:SS"
        # We can also check Exif IFD for DateTimeOriginal
        if hasattr(image, '_getexif') and image._getexif() is not None:
            for tag_id, value in image._getexif().items():
                tag = TAGS.get(tag_id, tag_id)
                if tag in ['DateTimeOriginal', 'DateTimeDigitized', 'DateTime']:
                    return str(value)
    except Exception as e:
        print(f"Could not read EXIF for {filepath}: {e}")
        pass
    
    # Fallback to file name if no EXIF is found, which helps if named sequentially
    return filepath

images = []
if os.path.exists(PICTURES_DIR):
    for filename in os.listdir(PICTURES_DIR):
        if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
            filepath = os.path.join(PICTURES_DIR, filename)
            date = get_exif_date(filepath)
            images.append({'filename': filename, 'date': date})

# Sort newest to oldest (descending order)
images.sort(key=lambda x: str(x['date']), reverse=True)

# Format the final output to only include filename
output = [{'filename': img['filename']} for img in images]

with open(OUTPUT_FILE, 'w') as f:
    json.dump(output, f, indent=2)

print(f"Successfully generated {OUTPUT_FILE} with {len(output)} images, sorted chronologically.")
