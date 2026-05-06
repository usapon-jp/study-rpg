# Asset Map

All app-facing crops live in `public/assets/crops/`. Original generated references are preserved in `public/assets/generated/`.

## Reference Images

- `ui-home-reference.png`: pixel/style reference for the main home screen.
- `core-asset-sheet.png`: room background, protagonist, Leefel, town growth strip, furniture.
- `bonus-asset-sheet.png`: gacha background, outfits, spirits, quest icons, materials, outside map.

## Cropped Runtime Assets

- Home: `home-bg.png`, `protagonist.png`, `leefel.png`, `leefel-cheer.png`, `leefel-hint.png`, `leefel-worry.png`
- Town stages: `town-lv1.png`, `town-lv5.png`, `town-lv10.png`, `town-lv20.png`, `town-lv30.png`
- Furniture: `furniture-desk.png`, `furniture-bookshelf.png`, `furniture-bed.png`, `furniture-bench.png`, `furniture-plant.png`, `furniture-planter.png`, `furniture-lamp.png`, `furniture-window.png`, `furniture-fountain.png`
- Gacha: `gacha-bg.png`
- Outfits: `outfit-n-1.png`, `outfit-n-2.png`, `outfit-n-3.png`, `outfit-r-1.png`, `outfit-r-2.png`, `outfit-r-3.png`, `outfit-sr-1.png`, `outfit-sr-2.png`, `outfit-sr-3.png`
- Spirits: `spirit-flower.png`, `spirit-book.png`, `spirit-night.png`, `spirit-mushroom.png`, `spirit-cafe.png`
- Quest icons: `quest-math.png`, `quest-english.png`, `quest-science.png`, `quest-social.png`, `quest-japanese.png`, `quest-recovery.png`
- Materials: `material-leaf.png`, `material-petal.png`, `material-light-drop.png`, `material-book-fragment.png`, `material-seed.png`, `material-moon-dust.png`, `material-ribbon-thread.png`, `material-acorn-token.png`
- Outside map: `exploration-map.png`

## Transparency

`scripts/extract_assets.py` removes the light cream paper background from character, icon, furniture, spirit, quest, and material crops by sampling corner colors and clearing close matches. Background scenes remain opaque.
