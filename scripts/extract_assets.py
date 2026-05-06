from collections import deque
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
GEN = ROOT / "public" / "assets" / "generated"
OUT = ROOT / "public" / "assets" / "crops"
OUT.mkdir(parents=True, exist_ok=True)


def crop(source, name, box, transparent=False, tolerance=34):
    image = Image.open(GEN / source).convert("RGBA")
    piece = image.crop(box)
    if transparent:
        piece = remove_paper(piece, tolerance)
    piece.save(OUT / name)


def remove_paper(image, tolerance=34):
    image = image.convert("RGBA")
    pixels = image.load()
    width, height = image.size
    corners = [
        pixels[0, 0],
        pixels[width - 1, 0],
        pixels[0, height - 1],
        pixels[width - 1, height - 1],
    ]
    base = tuple(sum(c[i] for c in corners) // 4 for i in range(3))
    queue = deque()
    seen = set()
    for x in range(width):
        queue.append((x, 0))
        queue.append((x, height - 1))
    for y in range(height):
        queue.append((0, y))
        queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or x < 0 or y < 0 or x >= width or y >= height:
            continue
        seen.add((x, y))
        r, g, b, a = pixels[x, y]
        dist = abs(r - base[0]) + abs(g - base[1]) + abs(b - base[2])
        if dist > tolerance:
            continue
        pixels[x, y] = (r, g, b, 0)
        queue.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))

    # Soften paper-colored edge halos without deleting interior dress highlights.
    for _ in range(3):
        clear = []
        for y in range(height):
            for x in range(width):
                r, g, b, a = pixels[x, y]
                if not a:
                    continue
                dist = abs(r - base[0]) + abs(g - base[1]) + abs(b - base[2])
                if dist > tolerance * 2.15:
                    continue
                touches_alpha = False
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height or pixels[nx, ny][3] == 0:
                        touches_alpha = True
                        break
                if touches_alpha:
                    clear.append((x, y))
        for x, y in clear:
            r, g, b, _ = pixels[x, y]
            pixels[x, y] = (r, g, b, 0)
    return image


def main():
    # Core asset sheet: 1536x1024.
    crop("core-asset-sheet.png", "home-bg.png", (10, 10, 840, 535))
    crop("core-asset-sheet.png", "protagonist.png", (870, 10, 1132, 535), True, 46)
    crop("core-asset-sheet.png", "leefel.png", (1164, 28, 1320, 226), True, 48)
    crop("core-asset-sheet.png", "leefel-cheer.png", (1326, 28, 1514, 226), True, 48)
    crop("core-asset-sheet.png", "leefel-hint.png", (1164, 260, 1320, 500), True, 48)
    crop("core-asset-sheet.png", "leefel-worry.png", (1326, 260, 1514, 500), True, 48)

    town_boxes = [
        ("town-lv1.png", (8, 560, 292, 790)),
        ("town-lv5.png", (296, 560, 584, 790)),
        ("town-lv10.png", (588, 560, 890, 790)),
        ("town-lv20.png", (894, 560, 1190, 790)),
        ("town-lv30.png", (1194, 560, 1528, 790)),
    ]
    for name, box in town_boxes:
        crop("core-asset-sheet.png", name, box, True, 36)

    furniture = [
        ("furniture-desk.png", (0, 810, 170, 1015)),
        ("furniture-bookshelf.png", (185, 810, 324, 1015)),
        ("furniture-bed.png", (330, 810, 512, 1015)),
        ("furniture-bench.png", (520, 810, 708, 1015)),
        ("furniture-plant.png", (708, 810, 862, 1015)),
        ("furniture-planter.png", (872, 810, 1014, 1015)),
        ("furniture-lamp.png", (1052, 810, 1170, 1015)),
        ("furniture-window.png", (1190, 810, 1322, 1015)),
        ("furniture-fountain.png", (1328, 810, 1510, 1015)),
    ]
    for name, box in furniture:
        crop("core-asset-sheet.png", name, box, True, 36)

    # Bonus asset sheet: 1536x1024.
    crop("bonus-asset-sheet.png", "gacha-bg.png", (8, 8, 813, 509))

    outfit_boxes = [
        ("outfit-n-1.png", (868, 29, 1033, 176)),
        ("outfit-r-1.png", (1049, 29, 1221, 176)),
        ("outfit-sr-1.png", (1243, 27, 1432, 176)),
        ("outfit-n-2.png", (868, 187, 1032, 335)),
        ("outfit-r-2.png", (1050, 187, 1221, 335)),
        ("outfit-sr-2.png", (1245, 187, 1432, 335)),
        ("outfit-n-3.png", (870, 347, 1032, 496)),
        ("outfit-r-3.png", (1050, 347, 1221, 496)),
        ("outfit-sr-3.png", (1245, 347, 1432, 496)),
    ]
    for name, box in outfit_boxes:
        crop("bonus-asset-sheet.png", name, box, True, 44)

    spirits = [
        ("spirit-flower.png", (39, 555, 160, 706)),
        ("spirit-book.png", (194, 555, 320, 704)),
        ("spirit-night.png", (362, 550, 482, 705)),
        ("spirit-mushroom.png", (528, 553, 642, 704)),
        ("spirit-cafe.png", (684, 554, 805, 704)),
    ]
    for name, box in spirits:
        crop("bonus-asset-sheet.png", name, box, True, 42)

    quests = [
        ("quest-math.png", (780, 520, 878, 706)),
        ("quest-english.png", (888, 520, 986, 706)),
        ("quest-science.png", (1000, 520, 1098, 706)),
        ("quest-social.png", (1112, 520, 1210, 706)),
        ("quest-japanese.png", (1222, 520, 1322, 706)),
        ("quest-recovery.png", (1338, 520, 1442, 706)),
    ]
    for name, box in quests:
        crop("bonus-asset-sheet.png", name, box, True, 38)

    materials = [
        ("material-leaf.png", (44, 804, 128, 930)),
        ("material-petal.png", (176, 803, 260, 930)),
        ("material-light-drop.png", (304, 801, 388, 930)),
        ("material-book-fragment.png", (435, 798, 525, 934)),
        ("material-seed.png", (565, 803, 647, 930)),
        ("material-moon-dust.png", (697, 801, 777, 930)),
        ("material-ribbon-thread.png", (823, 803, 918, 932)),
        ("material-acorn-token.png", (957, 803, 1047, 930)),
    ]
    for name, box in materials:
        crop("bonus-asset-sheet.png", name, box, True, 42)

    crop("bonus-asset-sheet.png", "exploration-map.png", (780, 735, 1530, 1015))

    icon_boxes = [
        ("nav-home.png", (70, 185, 405, 450)),
        ("nav-quest.png", (465, 142, 780, 450)),
        ("nav-town.png", (820, 150, 1145, 450)),
        ("nav-book.png", (1198, 145, 1510, 448)),
        ("nav-gacha.png", (70, 572, 405, 856)),
        ("nav-shop.png", (450, 565, 765, 858)),
        ("top-mail.png", (824, 610, 1122, 850)),
        ("top-gear.png", (1118, 508, 1492, 858)),
    ]
    for name, box in icon_boxes:
        crop("ui-icon-sheet.png", name, box, True, 62)


if __name__ == "__main__":
    main()
