import os
import math
import json
import xml.etree.ElementTree as ET

MAP_PATH = "../../src/assets/emoji_map.json"
SVG_PATH = "svg"
PNG_PATH = "png"
ATLAS_COLUMNS = 64
SVG_ICON_SIZE = 36

print("FINDING CODEPOINTS")
with open(MAP_PATH, "r") as f:
    emoji_map = json.load(f)

def emoji_to_codepoint(emoji: str) -> str:
    vs = 0xFE0F
    zwj = 0x200D

    has_zwj = zwj in [ord(c) for c in emoji]

    parts = []
    for char_code in [ord(c) for c in emoji]:
        if not has_zwj and char_code == vs:
            continue
        parts.append(f"{char_code:x}")

    return "-".join(parts)

CODEPOINTS = []
for category in emoji_map:
    for emoji in emoji_map[category]:
        CODEPOINTS.append(emoji_to_codepoint(emoji["symbol"]))
        if "diversityChildren" in emoji:
            for child in emoji["diversityChildren"]:
                CODEPOINTS.append(emoji_to_codepoint(child["symbol"]))

#with open("codepoints.txt", "w") as f:
#   f.write("\n".join(CODEPOINTS))

print("BUILDING SVG ATLAS")
ATLAS_ROWS = math.ceil(len(CODEPOINTS) / ATLAS_COLUMNS)
SVG_NS = 'http://www.w3.org/2000/svg'

ET.register_namespace('', SVG_NS)
root = ET.Element('svg', {
    'width': str(ATLAS_COLUMNS * SVG_ICON_SIZE),
    'height': str(ATLAS_ROWS * SVG_ICON_SIZE)
})

for i, c in enumerate(CODEPOINTS):
  file = os.path.join(SVG_PATH, f'{c}.svg')
  
  row = i // ATLAS_COLUMNS
  col = i % ATLAS_COLUMNS
  x = col * SVG_ICON_SIZE
  y = row * SVG_ICON_SIZE
  
  tree = ET.parse(file)
  file_root = tree.getroot()
  
  group = ET.SubElement(root, 'g', {
    'transform': f'translate({x},{y})'
  })
  
  for child in file_root:
    if child.tag.startswith(f'{{{SVG_NS}}}'):
      group.append(child)

tree = ET.ElementTree(root)
tree.write("atlas.svg", encoding='utf-8', xml_declaration=True)

def render(size):
  file = os.path.join(PNG_PATH, f"{size}x{size}.png")
  print(f"RENDERING {size}x{size} ATLAS")
  os.system(f"inkscape -w {size * ATLAS_COLUMNS} -h {math.ceil(len(CODEPOINTS) / ATLAS_COLUMNS) * size} atlas.svg -o {file}")

  print(f"COMPRESSING {size}x{size} ATLAS")
  os.system(f"pngquant --speed 1 --force --output {file} {file}")

render(80)
render(40)

os.remove("atlas.svg")

print("DONE")