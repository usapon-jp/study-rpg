export const avatarLayerOrder = [
  "body",
  "hairBack",
  "face",
  "tops",
  "bottoms",
  "shoes",
  "hairFront",
  "accessory",
];

export const avatarCanvas = {
  width: 1024,
  height: 1024,
  centerX: 512,
  footY: 982,
};

export const avatarBaseLayers = [
  {
    id: "body-default",
    slot: "body",
    src: "avatar/body-default.png",
    rarity: "N",
    offsetX: 0,
    offsetY: 0,
  },
];

export const avatarItems = [
  { id: "outfit-n-1", slot: "tops", src: "avatar/outfit-n-1.png", rarity: "N", offsetX: 0, offsetY: 0 },
  { id: "outfit-n-2", slot: "tops", src: "avatar/outfit-n-2.png", rarity: "N", offsetX: 0, offsetY: 0 },
  { id: "outfit-n-3", slot: "tops", src: "avatar/outfit-n-3.png", rarity: "N", offsetX: 0, offsetY: 0 },
  { id: "outfit-r-1", slot: "tops", src: "avatar/outfit-r-1.png", rarity: "R", offsetX: 0, offsetY: -2 },
  { id: "outfit-r-2", slot: "tops", src: "avatar/outfit-r-2.png", rarity: "R", offsetX: 0, offsetY: -2 },
  { id: "outfit-r-3", slot: "tops", src: "avatar/outfit-r-3.png", rarity: "R", offsetX: 0, offsetY: -2 },
  { id: "outfit-sr-1", slot: "tops", src: "avatar/outfit-sr-1.png", rarity: "SR", offsetX: 0, offsetY: -4 },
  { id: "outfit-sr-2", slot: "tops", src: "avatar/outfit-sr-2.png", rarity: "SR", offsetX: 0, offsetY: -4 },
  { id: "outfit-sr-3", slot: "tops", src: "avatar/outfit-sr-3.png", rarity: "SR", offsetX: 0, offsetY: -4 },
  { id: "accessory-flower-pin", slot: "accessory", src: "avatar/accessory-flower-pin.png", rarity: "N", offsetX: 0, offsetY: 0 },
  { id: "accessory-moon-ribbon", slot: "accessory", src: "avatar/accessory-moon-ribbon.png", rarity: "SR", offsetX: 0, offsetY: 0 },
];

export const leefelAssets = {
  default: { id: "leefel-default", src: "avatar/leefel-default.png" },
  cheer: { id: "leefel-cheer", src: "avatar/leefel-cheer.png" },
  hint: { id: "leefel-hint", src: "avatar/leefel-hint.png" },
  worry: { id: "leefel-worry", src: "avatar/leefel-worry.png" },
};
