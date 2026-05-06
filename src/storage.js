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
  return {
    ...base,
    ...saved,
    player: { ...base.player, ...saved.player },
    settings: { ...base.settings, ...saved.settings },
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
