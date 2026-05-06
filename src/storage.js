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
    room: { ...base.room, ...saved.room },
    town: {
      ...base.town,
      ...saved.town,
      theme: { ...base.town.theme, ...(saved.town?.theme || {}) },
    },
  };
}
