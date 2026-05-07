import { createInitialState } from "./gameData";

export const STORAGE_KEY = "tama-study-rpg-state-v1";

export function loadState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return createInitialState();
    return mergeState(createInitialState(), JSON.parse(stored));
  } catch {
    return createInitialState();
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeRoomFurniture(baseFurniture, savedFurniture) {
  const normalized = { ...baseFurniture };
  if (Array.isArray(savedFurniture)) {
    savedFurniture.forEach((item) => {
      if (item?.slot) normalized[item.slot] = item.itemId || null;
    });
    return normalized;
  }
  return { ...normalized, ...(savedFurniture || {}) };
}

const TOWN_SPOTS = ["plaza_left", "plaza_center", "plaza_right", "path_front", "garden_back", "sign_corner", "light_corner"];

function normalizeTownObjects(baseObjects, savedObjects) {
  const source = Array.isArray(savedObjects) ? savedObjects : baseObjects;
  if (!Array.isArray(source)) {
    return Object.entries(source || {}).map(([spotId, itemId]) => ({ itemId, spotId, rotation: 0 })).filter((item) => item.itemId);
  }
  return source.map((item, index) => ({
    itemId: item.itemId,
    spotId: item.spotId || item.spot || TOWN_SPOTS[(item.cell ?? index) % TOWN_SPOTS.length],
    rotation: item.rotation || 0,
  })).filter((item) => item.itemId);
}

function mergeState(base, saved) {
  const savedSettings = saved.settings || {};
  const settings = {
    ...base.settings,
    ...savedSettings,
  };

  if (!savedSettings.leefelProjectUrl || savedSettings.leefelProjectUrl === "https://chatgpt.com/") {
    settings.leefelProjectUrl = base.settings.leefelProjectUrl;
  }

  if (!savedSettings.driveRootName) {
    settings.driveRootName = base.settings.driveRootName;
  }

  if (!savedSettings.driveRootUrl) {
    settings.driveRootUrl = base.settings.driveRootUrl;
  }

  return {
    ...base,
    ...saved,
    player: { ...base.player, ...saved.player },
    settings,
    avatar: { ...base.avatar, ...saved.avatar },
    inventory: {
      ...base.inventory,
      ...saved.inventory,
      materials: { ...base.inventory.materials, ...(saved.inventory?.materials || {}) },
    },
    room: {
      ...base.room,
      ...saved.room,
      wall: saved.room?.wall || base.room.wall,
      floor: saved.room?.floor || base.room.floor,
      furniture: normalizeRoomFurniture(base.room.furniture, saved.room?.furniture),
      placed: saved.room?.placed || base.room.placed,
      selectedFurniture: saved.room?.selectedFurniture || base.room.selectedFurniture,
    },
    town: {
      ...base.town,
      ...saved.town,
      theme: { ...base.town.theme, ...(saved.town?.theme || {}) },
      objects: normalizeTownObjects(base.town.objects, saved.town?.objects),
    },
  };
}
