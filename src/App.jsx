import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  asset,
  createInitialState,
  furnitureCatalog,
  gachaPool,
  materialCatalog,
  navItems,
  questTypes,
  spirits,
} from "./gameData";
import { roomItems } from "./data/roomItems";
import { townObjects } from "./data/townObjects";
import { avatarBaseLayers, avatarItems, avatarLayerOrder, leefelAssets } from "./data/items";
import { loadState, saveState } from "./storage";

const rarityWeight = { N: 70, R: 25, SR: 5 };
const subjectOptions = ["英語", "数学", "理科", "社会", "国語"];
const purposeOptions = ["宿題", "テスト勉強", "チャレンジ", "自由学習"];
const roomSlots = [
  { id: "desk", label: "机" },
  { id: "shelf", label: "棚" },
  { id: "rug", label: "ラグ" },
  { id: "window", label: "窓" },
  { id: "smallItem", label: "小物" },
];
const townSpots = [
  { id: "plaza_left", label: "広場 左" },
  { id: "plaza_center", label: "広場 中央" },
  { id: "plaza_right", label: "広場 右" },
  { id: "path_front", label: "小道 前" },
  { id: "garden_back", label: "庭 奥" },
  { id: "sign_corner", label: "看板横" },
  { id: "light_corner", label: "灯り横" },
];
const fallbackRoomItems = {
  wall: [
    { id: "warm", name: "木もれびの壁", value: "warm", theme: "relax" },
    { id: "leaf", name: "若葉の壁", value: "leaf", theme: "flower" },
    { id: "night", name: "星夜の壁", value: "night", theme: "night" },
    { id: "book", name: "本棚の壁", value: "book", theme: "book" },
  ],
  floor: [
    { id: "wood", name: "やわらか木床", value: "wood", theme: "relax" },
    { id: "grass", name: "草花ラグ床", value: "grass", theme: "flower" },
    { id: "tile", name: "月しずくタイル", value: "tile", theme: "night" },
    { id: "study", name: "読書の床", value: "study", theme: "book" },
  ],
};
const fallbackTownObjects = [
  { id: "plant", name: "観葉植物", icon: "furniture-plant.png", theme: "flower" },
  { id: "planter", name: "花だん", icon: "furniture-planter.png", theme: "flower" },
  { id: "lamp", name: "きのこランプ", icon: "furniture-lamp.png", theme: "night" },
  { id: "bench", name: "葉っぱのベンチ", icon: "furniture-bench.png", theme: "relax" },
  { id: "bookshelf", name: "本の屋台", icon: "furniture-bookshelf.png", theme: "book" },
  { id: "fountain", name: "小さな噴水", icon: "furniture-fountain.png", theme: "relax" },
];

function itemKey(item) {
  return item.itemId || item.id;
}

function itemIcon(item) {
  const iconFallbacks = {
    "rug-flower-round": "furniture-bed.png",
    post: "top-mail.png",
    post_red_01: "top-mail.png",
    tree: "furniture-plant.png",
    tree_learning_01: "furniture-plant.png",
    sign: "nav-town.png",
    sign_guide_01: "nav-town.png",
  };
  return iconFallbacks[itemKey(item)] || item.icon;
}

function isWearableOutfit(item) {
  return item?.type === "衣装" || item?.type === "特別コーデ";
}

function activeOutfitItem(state) {
  const owned = new Set(state.inventory?.outfits || []);
  const selected = gachaPool.find((item) => item.id === state.avatar?.outfit && isWearableOutfit(item));
  if (selected && owned.has(selected.id)) return selected;
  return gachaPool.find((item) => owned.has(item.id) && isWearableOutfit(item)) || gachaPool.find((item) => item.id === "outfit-sr-1");
}

function outfitTone(outfitId = "") {
  if (outfitId.includes("sr-2") || outfitId.includes("r-1")) return "aqua";
  if (outfitId.includes("sr-3") || outfitId.includes("n-2")) return "rose";
  if (outfitId.includes("r-2")) return "lavender";
  if (outfitId.includes("r-3")) return "night";
  if (outfitId.includes("n-3")) return "earth";
  if (outfitId.includes("sr-1")) return "forest";
  return "leaf";
}

function avatarLayersForState(state) {
  const outfit = activeOutfitItem(state);
  const layers = [...avatarBaseLayers];
  const outfitLayer = avatarItems.find((item) => item.id === outfit?.id);
  if (outfitLayer) layers.push(outfitLayer);
  const accessoryId = state.avatar?.accessory?.startsWith("accessory-") ? state.avatar.accessory : `accessory-${state.avatar?.accessory || "flower-pin"}`;
  const accessoryLayer = avatarItems.find((item) => item.id === accessoryId);
  if (accessoryLayer) layers.push(accessoryLayer);
  return layers.sort((a, b) => avatarLayerOrder.indexOf(a.slot) - avatarLayerOrder.indexOf(b.slot));
}

function surfaceTone(value, kind) {
  if (!value) return kind === "wall" ? "warm" : "wood";
  if (value.includes("default")) return kind === "wall" ? "leaf" : "wood";
  if (value.includes("leaf")) return "leaf";
  if (value.includes("blue")) return "leaf";
  if (value.includes("night") || value.includes("moon")) return "night";
  if (value.includes("book") || value.includes("study")) return "book";
  if (value.includes("grass") || value.includes("flower")) return "grass";
  if (value.includes("tile")) return "tile";
  if (value.includes("warm") || value.includes("wood")) return "wood";
  return value;
}

function isUnlocked(item, state) {
  const condition = item.unlockCondition;
  if (!condition || condition.type === "default") return true;
  if (condition.type === "level") return state.player.level >= Number(condition.value || 0);
  return true;
}

function roomFurnitureBySlot(room) {
  if (Array.isArray(room?.furniture)) {
    return Object.fromEntries(room.furniture.map((item) => [item.slot, item.itemId]));
  }
  return room?.furniture || {};
}

function normalizedRoomFurniture(room) {
  const bySlot = roomFurnitureBySlot(room);
  return Object.fromEntries(roomSlots.map((slot) => [slot.id, bySlot[slot.id] || null]));
}

function townObjectsBySpot(town) {
  if (!Array.isArray(town?.objects)) return town?.objects || {};
  return Object.fromEntries(town.objects.map((item, index) => [item.spotId || item.spot || townSpots[index % townSpots.length].id, item.itemId]));
}
const scanTaskPresets = {
  英語: {
    宿題: ["ワーク p12〜15", "単語20個", "教科書音読"],
    テスト勉強: ["Unit 1〜3の確認", "単語20個", "本文音読"],
    チャレンジ: ["長文1つ", "知らない単語メモ", "音読チャレンジ"],
    自由学習: ["好きな英文を読む", "単語メモ", "1文だけ英作文"],
  },
  数学: {
    宿題: ["ワーク p12〜15", "計算問題10問", "間違い直し"],
    テスト勉強: ["一次関数の確認", "公式メモ", "類題3問"],
    チャレンジ: ["応用問題2問", "解き方メモ", "別解さがし"],
    自由学習: ["気になる単元を復習", "例題を写す", "1問だけ説明"],
  },
  理科: {
    宿題: ["ノート整理", "実験のまとめ", "用語チェック"],
    テスト勉強: ["重要語句15個", "図の確認", "一問一答"],
    チャレンジ: ["発展問題1つ", "理由を書く", "観察メモ"],
    自由学習: ["身近な現象メモ", "図解を描く", "用語を調べる"],
  },
  社会: {
    宿題: ["ワーク p12〜15", "地図の確認", "用語チェック"],
    テスト勉強: ["重要語句20個", "年表確認", "資料読み取り"],
    チャレンジ: ["記述問題1つ", "理由を書く", "関連語句メモ"],
    自由学習: ["ニュースを1つ読む", "地図を見る", "気づきをメモ"],
  },
  国語: {
    宿題: ["漢字20個", "本文音読", "ワーク p12〜15"],
    テスト勉強: ["漢字確認", "文法チェック", "本文の要点メモ"],
    チャレンジ: ["記述問題1つ", "語句調べ", "要約3行"],
    自由学習: ["好きな本を読む", "気になる言葉メモ", "短い感想"],
  },
};

function daysUntil(dateValue) {
  const today = new Date();
  const test = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(test.getTime())) return 0;
  return Math.max(0, Math.ceil((test - today) / 86400000));
}

function todayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function drivePathFor(draft) {
  const root = draft.driveRootName || "勉強RPG（たま）";
  return `${root}/教材/${draft.subject || subjectOptions[0]}/${draft.purpose || purposeOptions[0]}/`;
}

function driveOutputPathsFor(draft) {
  const root = draft.driveRootName || "勉強RPG（たま）";
  return {
    submission: `${root}/学習ログ/今日の提出/${draft.subject || subjectOptions[0]}/`,
    analysisJson: `${root}/学習ログ/AI解析JSON/`,
    dailyRecord: `${root}/学習ログ/デイリー記録/`,
    resultCard: `${root}/学習ログ/成果カード/`,
    monthlyLog: `${root}/学習ログ/月別ログ/${todayString().slice(0, 7)}/`,
  };
}

function driveSearchUrl(draft) {
  const root = draft.driveRootName || "勉強RPG（たま）";
  const query = [root, draft.subject || subjectOptions[0], draft.purpose || purposeOptions[0]].filter(Boolean).join(" ");
  return `https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, value));
}

function awardQuest(state, quest, source = "quest") {
  const materialId = quest.material || "leaf";
  const completedEntry = {
    ...quest,
    completedAt: new Date().toISOString(),
    source,
  };
  return {
    ...state,
    player: {
      ...state.player,
      xp: state.player.xp + Number(quest.xp || 0),
      coin: state.player.coin + Number(quest.coin || 0),
    },
    completedLog: [completedEntry, ...state.completedLog].slice(0, 40),
    inventory: {
      ...state.inventory,
      materials: {
        ...state.inventory.materials,
        [materialId]: (state.inventory.materials[materialId] || 0) + 1,
      },
    },
  };
}

function discoverSpirits(state) {
  const found = new Set(state.town.discoveredSpirits);
  const theme = state.town.theme;
  spirits.forEach((spirit) => {
    if ((theme[spirit.theme] || 0) >= 2) found.add(spirit.id);
  });
  return Array.from(found);
}

export default function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState("home");
  const [questFilter, setQuestFilter] = useState("main");
  const [toast, setToast] = useState("");
  const [dialogueOpen, setDialogueOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [importError, setImportError] = useState("");
  const [gachaResults, setGachaResults] = useState([]);
  const [gachaEffect, setGachaEffect] = useState({ active: false, items: [], index: 0 });
  const gachaTimersRef = useRef([]);
  const [roomOpen, setRoomOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [scanDraft, setScanDraft] = useState(null);
  const [progressMode, setProgressMode] = useState("week");
  const [sparkle, setSparkle] = useState(false);

  useEffect(() => saveState(state), [state]);

  useEffect(() => () => clearGachaTimers(), []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!state.timer?.running) return;
    const id = window.setInterval(() => {
      updateState((current) => ({
        ...current,
        timer: {
          running: true,
          elapsedSeconds: (current.timer?.elapsedSeconds || 0) + 1,
        },
      }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [state.timer?.running]);

  const testDays = daysUntil(state.settings.testDate);
  const workProgress = clampPercent((state.settings.workDonePages / state.settings.workTotalPages) * 100);
  const xpProgress = clampPercent((state.player.xp / state.player.nextXp) * 100);
  const totalStudyMinutes = state.player.studyMinutes + Math.floor((state.timer?.elapsedSeconds || 0) / 60);
  const activeQuests = state.quests.filter((quest) => quest.status === "active");
  const visibleQuests = activeQuests.filter((quest) => quest.type === questFilter);
  const selectedQuest = activeQuests.find((quest) => quest.id === state.studySession?.currentQuestId) || null;
  const townStage = state.town.level >= 30 ? "town-lv30.png" : state.town.level >= 20 ? "town-lv20.png" : state.town.level >= 10 ? "town-lv10.png" : state.town.level >= 5 ? "town-lv5.png" : "town-lv1.png";

  const ownedFurniture = useMemo(
    () => furnitureCatalog.filter((item) => state.inventory.furniture.includes(item.id)),
    [state.inventory.furniture]
  );

  const selectedFurniture = furnitureCatalog.find((item) => item.id === state.room.selectedFurniture) || furnitureCatalog[0];
  const roomFurnitureItems = useMemo(
    () => {
      const configuredItems = roomItems.filter((item) => item.category === "furniture" && isUnlocked(item, state));
      if (configuredItems.length) return configuredItems;
      return furnitureCatalog
        .filter((item) => state.inventory.furniture.includes(item.id))
        .map((item) => ({
          ...item,
          itemId: item.id,
          slot: item.id === "bookshelf" ? "shelf" : item.id === "window" ? "window" : item.id === "lamp" || item.id === "plant" ? "smallItem" : item.id === "bench" || item.id === "bed" ? "rug" : "desk",
        }));
    },
    [state]
  );
  const roomSurfaceItems = useMemo(() => ({
    wall: roomItems.filter((item) => item.category === "wall" && isUnlocked(item, state)),
    floor: roomItems.filter((item) => item.category === "floor" && isUnlocked(item, state)),
  }), [state]);
  const townObjectCatalog = useMemo(
    () => {
      const configuredObjects = townObjects.filter((item) => isUnlocked(item, state));
      if (configuredObjects.length) return configuredObjects;
      return fallbackTownObjects.filter((item) => state.inventory.furniture.includes(item.id));
    },
    [state]
  );

  function updateState(next) {
    setState((current) => (typeof next === "function" ? next(current) : next));
  }

  function startQuest(questId) {
    const quest = state.quests.find((item) => item.id === questId);
    if (!quest) return;
    updateState((current) => ({
      ...current,
      timer: { running: false, elapsedSeconds: 0 },
      studySession: {
        currentQuestId: questId,
        startedAt: new Date().toISOString(),
      },
    }));
    setScanDraft(null);
    setTab("timer");
    setToast(`${quest.title}をはじめる準備をしたよ`);
  }

  function completeQuest(questId) {
    updateState((current) => {
      const quest = current.quests.find((item) => item.id === questId);
      if (!quest) return current;
      const updated = awardQuest(
        {
          ...current,
          quests: current.quests.map((item) => (item.id === questId ? { ...item, status: "done" } : item)),
        },
        quest
      );
      return {
        ...updated,
        town: {
          ...updated.town,
          growth: clampPercent(updated.town.growth + 3),
        },
      };
    });
    setSparkle(true);
    window.setTimeout(() => setSparkle(false), 800);
    setToast("世界に小さな芽が増えたよ");
  }

  function importStudyJson() {
    try {
      const data = JSON.parse(jsonText);
      updateState((current) => {
        let next = {
          ...current,
          player: {
            ...current.player,
            studyMinutes: current.player.studyMinutes + Number(data.studyMinutes || 0),
            xp: current.player.xp + Number(data.rewards?.xp || 0),
            coin: current.player.coin + Number(data.rewards?.coin || 0),
          },
          importedDates: data.date ? Array.from(new Set([data.date, ...current.importedDates])) : current.importedDates,
          recoveryLog: [...(data.recoveryQuests || []), ...current.recoveryLog].slice(0, 20),
        };
        (data.completedQuests || []).forEach((quest, index) => {
          next.completedLog = [
            {
              id: `import-${data.date || Date.now()}-${index}`,
              subject: quest.subject || "勉強",
              title: quest.title || "今日の勉強",
              xp: Number(quest.xp || 0),
              coin: Number(quest.coin || 0),
              completedAt: new Date().toISOString(),
              source: "json",
            },
            ...next.completedLog,
          ].slice(0, 40);
        });
        return {
          ...next,
          town: {
            ...next.town,
            growth: clampPercent(next.town.growth + Math.ceil(Number(data.studyMinutes || 0) / 20)),
          },
        };
      });
      setImportError("");
      setToast(data.message || "今日の記録を世界に反映したよ");
      setJsonText("");
    } catch {
      setImportError("JSONの形をもう一度だけ見てみよう。かっこやカンマが抜けているかも。");
    }
  }

  function rollOne() {
    const roll = Math.random() * 100;
    const rarity = roll < rarityWeight.SR ? "SR" : roll < rarityWeight.SR + rarityWeight.R ? "R" : "N";
    const pool = gachaPool.filter((item) => item.rarity === rarity);
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function clearGachaTimers() {
    gachaTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    gachaTimersRef.current = [];
  }

  function finishGacha(results) {
    clearGachaTimers();
    setGachaEffect({ active: false, items: [], index: 0 });
    setGachaResults(results);
    setSparkle(false);
  }

  function skipGachaEffect() {
    if (!gachaEffect.active) return;
    finishGacha(gachaEffect.items);
  }

  function runGacha(count) {
    const cost = count === 10 ? 900 : 100;
    if (state.player.coin < cost) {
      setToast("コインが少し足りないみたい");
      return;
    }
    const results = Array.from({ length: count }, rollOne);
    clearGachaTimers();
    setGachaResults([]);
    setGachaEffect({ active: true, items: results, index: 0 });
    updateState((current) => ({
      ...current,
      player: { ...current.player, coin: current.player.coin - cost },
      inventory: {
        ...current.inventory,
        outfits: Array.from(new Set([...current.inventory.outfits, ...results.map((item) => item.id)])),
      },
      gachaHistory: [...results, ...current.gachaHistory].slice(0, 40),
    }));
    setSparkle(true);
    const stepMs = count === 10 ? 760 : 1280;
    gachaTimersRef.current = results.map((_, index) => window.setTimeout(() => {
      setGachaEffect((current) => (current.active ? { ...current, index } : current));
    }, index * stepMs));
    gachaTimersRef.current.push(window.setTimeout(() => finishGacha(results), results.length * stepMs + 950));
  }

  function equipOutfit(item) {
    if (!isWearableOutfit(item)) {
      setToast("服は衣装カードから着替えられるよ");
      return;
    }
    updateState((current) => ({
      ...current,
      avatar: { ...current.avatar, outfit: item.id },
    }));
    setToast(`${item.name}に着替えたよ`);
  }

  function buyFurniture(item) {
    if (state.player.coin < item.price) {
      setToast("コインが少し足りないみたい");
      return;
    }
    updateState((current) => {
      const furniture = Array.from(new Set([...current.inventory.furniture, item.id]));
      return {
        ...current,
        player: { ...current.player, coin: current.player.coin - item.price },
        inventory: { ...current.inventory, furniture },
        room: { ...current.room, selectedFurniture: item.id },
      };
    });
    setToast(`${item.name}をお迎えしたよ`);
  }

  function placeFurniture(cell) {
    updateState((current) => {
      const existing = current.room.placed.find((item) => item.cell === cell);
      const selected = furnitureCatalog.find((item) => item.id === current.room.selectedFurniture) || furnitureCatalog[0];
      const theme = { ...current.town.theme };
      theme[selected.theme] = (theme[selected.theme] || 0) + 1;
      const placed = existing
        ? current.room.placed.filter((item) => item.cell !== cell)
        : [
            ...current.room.placed,
            {
              id: `${selected.id}-${Date.now()}`,
              furnitureId: selected.id,
              cell,
              rotation: 0,
            },
          ];
      const discovered = discoverSpirits({ ...current, town: { ...current.town, theme } });
      return {
        ...current,
        room: { ...current.room, placed },
        town: {
          ...current.town,
          theme,
          discoveredSpirits: discovered,
          growth: clampPercent(current.town.growth + (existing ? 0 : 2)),
        },
      };
    });
  }

  function rotatePlaced(id) {
    updateState((current) => ({
      ...current,
      room: {
        ...current.room,
        placed: current.room.placed.map((item) => (item.id === id ? { ...item, rotation: (item.rotation + 90) % 360 } : item)),
      },
    }));
  }

  function deletePlaced(id) {
    updateState((current) => ({
      ...current,
      room: { ...current.room, placed: current.room.placed.filter((item) => item.id !== id) },
    }));
  }

  function updateRoomSurface(kind, value) {
    updateState((current) => ({
      ...current,
      room: { ...current.room, [kind]: value },
    }));
    setToast(kind === "wall" ? "壁紙を変えたよ" : "床を変えたよ");
  }

  function placeRoomSlot(slot, item) {
    updateState((current) => {
      const furniture = { ...normalizedRoomFurniture(current.room), [slot]: itemKey(item) };
      const theme = { ...current.town.theme };
      theme[item.theme] = (theme[item.theme] || 0) + 1;
      const discovered = discoverSpirits({ ...current, town: { ...current.town, theme } });
      return {
        ...current,
        room: { ...current.room, furniture },
        town: {
          ...current.town,
          theme,
          discoveredSpirits: discovered,
          growth: clampPercent(current.town.growth + 1),
        },
      };
    });
    setToast(`${item.name}を置いたよ`);
  }

  function removeRoomSlot(slot) {
    updateState((current) => {
      const furniture = { ...normalizedRoomFurniture(current.room), [slot]: null };
      return {
        ...current,
        room: { ...current.room, furniture },
      };
    });
    setToast("家具をはずしたよ");
  }

  function placeTownObject(spot, item) {
    updateState((current) => {
      const nextItem = { itemId: itemKey(item), spotId: spot, rotation: 0 };
      const objects = Array.isArray(current.town?.objects)
        ? [...current.town.objects.filter((placed) => (placed.spotId || placed.spot || townSpots[placed.cell % townSpots.length]?.id) !== spot), nextItem]
        : { ...(current.town?.objects || {}), [spot]: itemKey(item) };
      const theme = { ...current.town.theme };
      theme[item.theme] = (theme[item.theme] || 0) + 1;
      const discovered = discoverSpirits({ ...current, town: { ...current.town, theme } });
      return {
        ...current,
        town: {
          ...current.town,
          objects,
          theme,
          discoveredSpirits: discovered,
          growth: clampPercent(current.town.growth + 2),
        },
      };
    });
    setToast(`${item.name}を町に置いたよ`);
  }

  function removeTownObject(spot) {
    updateState((current) => {
      const objects = Array.isArray(current.town?.objects)
        ? current.town.objects.filter((placed) => (placed.spotId || placed.spot || townSpots[placed.cell % townSpots.length]?.id) !== spot)
        : { ...(current.town?.objects || {}) };
      if (!Array.isArray(objects)) delete objects[spot];
      return {
        ...current,
        town: { ...current.town, objects },
      };
    });
    setToast("町のオブジェクトをはずしたよ");
  }

  function resetGame() {
    const next = createInitialState();
    updateState(next);
    setToast("最初の小さな広場に戻したよ");
  }

  function setTimerRunning(running) {
    updateState((current) => ({
      ...current,
      timer: {
        running,
        elapsedSeconds: current.timer?.elapsedSeconds || 0,
      },
    }));
  }

  function recordTimer() {
    const quest = selectedQuest || state.quests.find((item) => item.id === state.studySession?.currentQuestId) || null;
    updateState((current) => {
      const minutes = Math.floor((current.timer?.elapsedSeconds || 0) / 60);
      return {
        ...current,
        player: { ...current.player, studyMinutes: current.player.studyMinutes + minutes },
        timer: { running: false, elapsedSeconds: 0 },
      };
    });
    setScanDraft(createScanDraft(state, quest));
    setResultOpen(true);
    setToast("成果を写真やDriveで残せるよ");
  }

  function resetTimer() {
    updateState((current) => ({ ...current, timer: { running: false, elapsedSeconds: 0 } }));
  }

  function updateProfileIcon(icon) {
    updateState((current) => ({
      ...current,
      avatar: { ...current.avatar, profileIcon: icon },
    }));
    setAvatarOpen(false);
  }

  function updateScanDraft(patch) {
    setScanDraft((current) => {
      const base = current || createScanDraft(state);
      const shouldReset = "subject" in patch || "purpose" in patch || "memo" in patch || "weakPoint" in patch || "driveUrl" in patch;
      return {
        ...base,
        ...patch,
        ...(shouldReset ? { analysis: null, generated: null, saved: false } : {}),
      };
    });
  }

  function updateScanFiles(fileList) {
    const files = Array.from(fileList || []).map((file) => ({
      name: file.name,
      type: file.type || "unknown",
      size: file.size,
      source: "upload",
    }));
    updateScanDraft({ files });
  }

  function scanStudyResult() {
    const draft = scanDraft || createScanDraft(state);
    setScanDraft({ ...draft, scanning: true, analysis: null, generated: null, saved: false });
    window.setTimeout(() => {
      setScanDraft((current) => {
        const latest = current || draft;
        const analysis = createScanAnalysis(latest);
        return { ...latest, analysis, generated: buildScanJson(latest, analysis), scanning: false, saved: false };
      });
      setToast("教材から今日の成果カードを作ったよ");
    }, 650);
  }

  function openDriveFolder() {
    const draft = scanDraft || createScanDraft(state);
    window.open(draft.driveUrl || driveSearchUrl(draft), "_blank", "noopener,noreferrer");
  }

  function saveScanResult() {
    const draft = scanDraft || createScanDraft(state);
    if (draft.saved) {
      setToast("この成果はもう保存済みだよ");
      return;
    }
    const analysis = draft.analysis || createScanAnalysis(draft);
    const generated = draft.generated || buildScanJson(draft, analysis);
    const xp = generated.rewards.xp;
    const coin = generated.rewards.coin;

    updateState((current) => ({
      ...current,
      player: {
        ...current.player,
        xp: current.player.xp + xp,
        coin: current.player.coin + coin,
      },
      completedLog: [
        ...generated.completedQuests.map((quest, index) => ({
          id: `scan-${Date.now()}-${index}`,
          subject: draft.subject,
          title: quest.title,
          xp: index === 0 ? xp : 0,
          coin: index === 0 ? coin : 0,
          completedAt: new Date().toISOString(),
          source: "scan",
        })),
        ...current.completedLog,
      ].slice(0, 40),
      recoveryLog: [...generated.recoveryQuests, ...current.recoveryLog].slice(0, 20),
      scanLogs: [{ ...draft, analysis, generated, savedAt: new Date().toISOString() }, ...(current.scanLogs || [])].slice(0, 20),
      quests: current.quests.map((quest) => (draft.questId && draft.questType !== "free" && quest.id === draft.questId ? { ...quest, status: "done" } : quest)),
      studySession: {
        ...current.studySession,
        currentQuestId: null,
        startedAt: null,
      },
      town: {
        ...current.town,
        growth: clampPercent(current.town.growth + 2),
      },
    }));
    setScanDraft({ ...draft, analysis, generated, saved: true, scanning: false });
    setSparkle(true);
    window.setTimeout(() => setSparkle(false), 900);
    setToast("今日の成果を世界に保存したよ");
  }

  function openLeefelProject() {
    const draft = scanDraft || createScanDraft(state);
    const text = JSON.stringify(draft.generated || buildPreviewScanJson(draft), null, 2);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    window.open(state.settings.leefelProjectUrl || "https://chatgpt.com/", "_blank", "noopener,noreferrer");
  }

  return (
    <div className={`app ${sparkle ? "is-sparkling" : ""}`}>
      <div className="game-frame">
        <TopBar state={state} xpProgress={xpProgress} setTab={setTab} onAvatarEdit={() => setAvatarOpen(true)} />
        <section className={`screen screen-${tab}`}>
          {tab === "home" && (
            <HomeScreen
              state={state}
              activeQuests={activeQuests}
              completeQuest={completeQuest}
              testDays={testDays}
              workProgress={workProgress}
              totalStudyMinutes={totalStudyMinutes}
              timerSeconds={state.timer?.elapsedSeconds || 0}
              timerRunning={Boolean(state.timer?.running)}
              setTimerRunning={setTimerRunning}
              recordTimer={recordTimer}
              resetTimer={resetTimer}
              selectedQuest={selectedQuest}
              startQuest={startQuest}
              progressMode={progressMode}
              setProgressMode={setProgressMode}
              townStage={townStage}
              setTab={setTab}
              setDialogueOpen={setDialogueOpen}
            />
          )}
          {tab === "quests" && (
            <QuestScreen
              quests={visibleQuests}
              questFilter={questFilter}
              setQuestFilter={setQuestFilter}
              startQuest={startQuest}
              jsonText={jsonText}
              setJsonText={setJsonText}
              importStudyJson={importStudyJson}
              importError={importError}
            />
          )}
          {tab === "timer" && (
            <TimerScreen
              selectedQuest={selectedQuest}
              timerSeconds={state.timer?.elapsedSeconds || 0}
              timerRunning={Boolean(state.timer?.running)}
              setTimerRunning={setTimerRunning}
              recordTimer={recordTimer}
              resetTimer={resetTimer}
              setTab={setTab}
            />
          )}
          {tab === "room" && (
            <RoomScreen
              state={state}
              roomItems={roomSurfaceItems.wall.length && roomSurfaceItems.floor.length ? roomSurfaceItems : fallbackRoomItems}
              roomFurnitureItems={roomFurnitureItems}
              updateRoomSurface={updateRoomSurface}
              placeRoomSlot={placeRoomSlot}
              removeRoomSlot={removeRoomSlot}
            />
          )}
          {tab === "town" && (
            <TownScreen
              state={state}
              townStage={townStage}
              townObjects={townObjectCatalog}
              placeTownObject={placeTownObject}
              removeTownObject={removeTownObject}
            />
          )}
          {tab === "encyclopedia" && <EncyclopediaScreen state={state} />}
          {tab === "gacha" && <GachaScreen state={state} runGacha={runGacha} gachaResults={gachaResults} gachaEffect={gachaEffect} onSkipGacha={skipGachaEffect} />}
          {tab === "wardrobe" && <WardrobeScreen state={state} equipOutfit={equipOutfit} />}
          {tab === "shop" && <ShopScreen state={state} buyFurniture={buyFurniture} />}
          {tab === "settings" && <SettingsScreen state={state} updateState={updateState} resetGame={resetGame} />}
        </section>
        <BottomNav tab={tab} setTab={setTab} />
      </div>
      {toast && <div className="toast">{toast}</div>}
      {dialogueOpen && <DialogueModal state={state} onClose={() => setDialogueOpen(false)} />}
      {resultOpen && (
        <ResultModal
          draft={scanDraft || createScanDraft(state)}
          leefelDebugBackdrop={state.settings.leefelDebugBackdrop}
          onChange={updateScanDraft}
          onFiles={updateScanFiles}
          onScan={scanStudyResult}
          onOpenDrive={openDriveFolder}
          onSave={saveScanResult}
          onAskLeefel={openLeefelProject}
          onClose={() => setResultOpen(false)}
        />
      )}
      {avatarOpen && <AvatarModal state={state} onSelect={updateProfileIcon} onClose={() => setAvatarOpen(false)} />}
      {roomOpen && (
        <RoomModal
          state={state}
          ownedFurniture={ownedFurniture}
          selectedFurniture={selectedFurniture}
          setState={updateState}
          placeFurniture={placeFurniture}
          rotatePlaced={rotatePlaced}
          deletePlaced={deletePlaced}
          onClose={() => setRoomOpen(false)}
        />
      )}
    </div>
  );
}

function formatTimer(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function purposeForQuest(quest) {
  if (!quest) return "宿題";
  if (quest.type === "recovery") return "テスト勉強";
  if (quest.type === "free") return "自由学習";
  if (quest.type === "sub") return "チャレンジ";
  return "宿題";
}

function createScanDraft(state, quest = null) {
  const timerMinutes = Math.floor((state.timer?.elapsedSeconds || 0) / 60);
  const isFree = quest?.type === "free";
  return {
    questId: quest?.id || null,
    questTitle: quest?.title || "",
    questType: quest?.type || "free",
    subject: quest && !isFree ? quest.subject : "英語",
    purpose: purposeForQuest(quest),
    studyMinutes: Math.max(5, timerMinutes),
    driveUrl: "",
    driveRootName: state.settings.driveRootName || "勉強RPG（たま）",
    driveRootUrl: state.settings.driveRootUrl || "",
    files: [],
    memo: "",
    weakPoint: "",
    analysis: null,
    generated: null,
    scanning: false,
    saved: false,
  };
}

function createScanAnalysis(draft) {
  const tasks = scanTaskPresets[draft.subject]?.[draft.purpose] || scanTaskPresets.英語.宿題;
  const memoTasks = draft.memo
    .split(/[、,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2);
  return {
    subject: draft.subject,
    purpose: draft.purpose,
    tasks: Array.from(new Set([draft.questTitle, ...tasks, ...memoTasks].filter(Boolean))).slice(0, 5),
    weakPoint: draft.weakPoint || (draft.purpose === "テスト勉強" ? `${draft.subject}の復習ポイント` : ""),
    summary: `${draft.subject}の${draft.purpose}を、今日のクエストに変えました。`,
  };
}

function buildScanJson(draft, analysis = createScanAnalysis(draft)) {
  const minutes = Math.max(5, Number(draft.studyMinutes || 0));
  const xp = Math.max(20, Math.round(minutes * 0.6) + analysis.tasks.length * 12);
  const coin = Math.max(8, Math.round(minutes * 0.12) + analysis.tasks.length * 4);
  return {
    date: todayString(),
    studyMinutes: minutes,
    completedQuests: analysis.tasks.map((task) => ({
      subject: draft.subject,
      purpose: draft.purpose,
      title: task,
      xp: Math.max(6, Math.round(xp / analysis.tasks.length)),
      coin: Math.max(2, Math.round(coin / analysis.tasks.length)),
    })),
    recoveryQuests: analysis.weakPoint ? [{ subject: draft.subject, title: `${analysis.weakPoint} リカバリー`, xp: 35, coin: 25 }] : [],
    rewards: { xp, coin },
    drive: {
      path: drivePathFor(draft),
      outputPaths: driveOutputPathsFor(draft),
      rootUrl: draft.driveRootUrl || "",
      url: draft.driveUrl || driveSearchUrl(draft),
    },
    evidence: {
      driveUrl: draft.driveUrl,
      files: draft.files,
      memo: draft.memo,
    },
    aiAnalysisRequest: {
      subject: draft.subject,
      purpose: draft.purpose,
      question: "教材・写真・PDF・メモから、完了した内容、苦手ポイント、次の小さな1問をやさしく分析してください。",
      outputFormat: "study-rpg-daily-json",
    },
  };
}

function buildPreviewScanJson(draft) {
  return buildScanJson(draft, draft.analysis || createScanAnalysis(draft));
}

function TopBar({ state, xpProgress, setTab, onAvatarEdit }) {
  return (
    <header className="top-bar">
      <div className="profile-card">
        <button className="profile-avatar-button" type="button" onClick={onAvatarEdit} aria-label="アイコンを編集">
          <img src={asset(state.avatar?.profileIcon || "protagonist.png")} alt="" className="profile-avatar" />
          <span className="profile-edit-mark" aria-hidden="true">✎</span>
        </button>
        <div>
          <p className="eyebrow">たまのマイルーム</p>
          <strong>Lv.{state.player.level}</strong>
          <div className="mini-progress"><span style={{ width: `${xpProgress}%` }} /></div>
        </div>
      </div>
      <div className="currency-row">
        <Badge icon="coin" value={state.player.coin.toLocaleString()} />
        <Badge icon="gem" value={state.player.gems.toLocaleString()} />
        <button className="icon-button" type="button" aria-label="お知らせ"><img src={asset("top-mail.png")} alt="" /></button>
        <button className="icon-button wardrobe-button" type="button" aria-label="お着替えルーム" onClick={() => setTab("wardrobe")}><img src={asset("outfit-sr-1.png")} alt="" /></button>
        <button className="icon-button" type="button" aria-label="設定" onClick={() => setTab("settings")}><img src={asset("top-gear.png")} alt="" /></button>
      </div>
    </header>
  );
}

function Badge({ icon, value }) {
  return (
    <div className="currency-badge">
      <span className={`currency-icon currency-${icon}`} />
      <strong>{value}</strong>
      <span className="plus-chip">＋</span>
    </div>
  );
}

function HomeScreen({
  state,
  activeQuests,
  testDays,
  workProgress,
  totalStudyMinutes,
  timerSeconds,
  timerRunning,
  setTimerRunning,
  recordTimer,
  resetTimer,
  selectedQuest,
  startQuest,
  progressMode,
  setProgressMode,
  townStage,
  setTab,
  setDialogueOpen,
}) {
  const [leefelTipOpen, setLeefelTipOpen] = useState(false);
  const freeQuest = activeQuests.find((quest) => quest.type === "free");
  const dailyBase = activeQuests.filter((quest) => quest.type !== "recovery" && quest.type !== "free").slice(0, 2);
  const daily = freeQuest ? [...dailyBase, freeQuest] : dailyBase;
  const recovery = activeQuests.find((quest) => quest.type === "recovery");
  const weekGoalMinutes = 420;
  const weekProgress = clampPercent((totalStudyMinutes / weekGoalMinutes) * 100);
  const testProgress = workProgress;
  const shownProgress = progressMode === "test" ? testProgress : weekProgress;
  const shownValue = progressMode === "test" ? `${state.settings.workDonePages} / ${state.settings.workTotalPages}` : `${totalStudyMinutes} / ${weekGoalMinutes}分`;
  const shownLabel = progressMode === "test" ? "テストまでの進捗" : "今週の進捗";
  useEffect(() => {
    if (!leefelTipOpen) return undefined;
    const timerId = window.setTimeout(() => setLeefelTipOpen(false), 4200);
    return () => window.clearTimeout(timerId);
  }, [leefelTipOpen]);
  return (
    <div
      className="home-scene"
      data-room-wall={surfaceTone(state.room?.wall || (state.town.theme?.book >= 2 ? "book" : "warm"), "wall")}
      data-room-floor={surfaceTone(state.room?.floor || (state.town.theme?.flower >= 2 ? "grass" : "wood"), "floor")}
      data-town-theme={Object.entries(state.town.theme || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "relax"}
    >
      <img src={asset("home-bg.png")} alt="" className="home-bg" />
      <aside className="left-stack">
        <Panel className="quest-panel ribbon-panel">
          <h2>今日のクエスト</h2>
          {daily.map((quest) => (
            <button className="quest-row" type="button" key={quest.id} onClick={() => startQuest(quest.id)}>
              <img src={asset(quest.icon)} alt="" />
              <span className="quest-copy">
                <strong>{quest.title}</strong>
                <small>XP {quest.xp}　🪙 {quest.coin}</small>
              </span>
              <b>▶</b>
            </button>
          ))}
        </Panel>
        {recovery && (
          <Panel className="recovery-card">
            <h3>リカバリークエスト</h3>
            <button type="button" onClick={() => startQuest(recovery.id)}>
              <span>🔥</span>
              <strong>{recovery.title}</strong>
              <small>+{recovery.xp} XP　+{recovery.coin} 🪙</small>
            </button>
          </Panel>
        )}
        <Panel className="week-card">
          <div className="panel-head"><h3>今週の予定</h3><button>詳細</button></div>
          <div className="week-row">{["月", "火", "水", "木", "金", "土", "日"].map((d, i) => <span key={d} className={i === 0 ? "done" : i === 6 ? "today" : ""}>{d}<b>{i + 5}</b></span>)}</div>
        </Panel>
        <div className="mini-stats">
          <Panel className="timer-card">
            <b>{totalStudyMinutes}<small>分</small></b>
            <span>今日の勉強時間</span>
            <small className="active-session-label">{selectedQuest ? `選択中: ${selectedQuest.title}` : "クエストを選ぶとタイマーへ進めます"}</small>
            <strong className="timer-display">{formatTimer(timerSeconds)}</strong>
            <div className="timer-actions">
              <button type="button" onClick={() => selectedQuest ? setTimerRunning(!timerRunning) : startQuest("free-study")}>{timerRunning ? "一時停止" : "スタート"}</button>
              <button type="button" onClick={recordTimer}>終了して成果スキャン</button>
              <button type="button" onClick={resetTimer}>リセット</button>
              <button type="button" onClick={() => setTab("quests")}>クエストを選ぶ</button>
            </div>
          </Panel>
          <Panel className="progress-mode-card">
            <div className="mode-tabs">
              <button className={progressMode === "week" ? "active" : ""} type="button" onClick={() => setProgressMode("week")}>今週</button>
              <button className={progressMode === "test" ? "active" : ""} type="button" onClick={() => setProgressMode("test")}>テストモード</button>
            </div>
            <b>{shownValue}</b>
            <span>{shownLabel}</span>
            <Progress value={shownProgress} />
          </Panel>
        </div>
      </aside>
      <div className="hero-stage">
        <AvatarFigure state={state} className="protagonist" />
        <button type="button" className="leefel-button" onClick={() => setLeefelTipOpen((open) => !open)} onDoubleClick={() => setDialogueOpen(true)} aria-label="リーフェルに話しかける">
          <span className={`speech ${leefelTipOpen ? "is-visible" : ""}`}>今日もがんばったね！<br />一緒に町を育てていこう♪</span>
          <LeefelFigure className="leefel" debugMode={state.settings.leefelDebugBackdrop} />
        </button>
      </div>
      <aside className="right-stack">
        <Panel className="room-card">
          <div className="panel-head"><h2>マイルーム Lv.{state.player.level}</h2><button>i</button></div>
          <RoomPreview state={state} compact />
          <div className="metric"><span>成長度</span><b>{state.town.growth}%</b></div>
          <Progress value={state.town.growth} />
          <button className="primary-button" type="button" onClick={() => setTab("room")}>🪴 マイルームをカスタマイズ</button>
        </Panel>
        <Panel className="town-card">
          <h3>町の発展度</h3>
          <p>Lv.{state.town.level}　森の広場</p>
          <img src={asset(townStage)} alt="" />
          <Progress value={state.town.growth} />
        </Panel>
        <button className="book-link" type="button" onClick={() => setTab("encyclopedia")}>
          <img src={asset("nav-book.png")} alt="" />
          精霊図鑑を見る
          <img src={asset("material-leaf.png")} alt="" />
        </button>
      </aside>
      <div className="test-chip">
        <span>{state.settings.testName}</span>
        <strong>あと {testDays} 日</strong>
      </div>
    </div>
  );
}

function AvatarFigure({ state, className = "", showOutfitName = false }) {
  const outfit = activeOutfitItem(state);
  const tone = outfitTone(outfit?.id);
  const layers = avatarLayersForState(state);
  return (
    <figure className={`avatar-figure outfit-${tone} ${className}`} data-rarity={outfit?.rarity || "N"}>
      <span className="avatar-aura" />
      {layers.map((layer) => (
        <img
          key={layer.id}
          src={asset(layer.src)}
          alt={layer.slot === "body" ? "主人公" : ""}
          className={`avatar-layer avatar-slot-${layer.slot}`}
          style={{ "--offset-x": `${layer.offsetX || 0}px`, "--offset-y": `${layer.offsetY || 0}px` }}
        />
      ))}
      {showOutfitName && outfit && <figcaption>{outfit.name}</figcaption>}
    </figure>
  );
}

function LeefelFigure({ className = "", variant = "default", debugMode = "off" }) {
  const leefel = leefelAssets[variant] || leefelAssets.default;
  return (
    <figure className={`leefel-figure ${className}`} data-debug={debugMode}>
      <span className="leefel-center-guide" />
      <span className="leefel-foot-guide" />
      <img src={asset(leefel.src)} alt="リーフェル" className="leefel-layer" />
    </figure>
  );
}

function QuestScreen({ quests, questFilter, setQuestFilter, startQuest, jsonText, setJsonText, importStudyJson, importError }) {
  return (
    <div className="content-grid two-col">
      <Panel className="list-panel">
        <div className="tabs">{questTypes.map((type) => <button key={type.id} className={questFilter === type.id ? "active" : ""} onClick={() => setQuestFilter(type.id)}>{type.label}</button>)}</div>
        {quests.map((quest) => (
          <article className="quest-detail-row" key={quest.id}>
            <img src={asset(quest.icon)} alt="" />
            <div><h3>{quest.title}</h3><p>{quest.subject}　XP {quest.xp}　🪙 {quest.coin}</p></div>
            <button className="primary-button" onClick={() => startQuest(quest.id)}>選んでタイマーへ</button>
          </article>
        ))}
        {!quests.length && <p className="empty-note">この棚のクエストは今は空だよ。フリーから好きな勉強を記録できます。</p>}
      </Panel>
      <Panel className="import-panel">
        <h2>ChatGPT Project から記録を貼る</h2>
        <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} placeholder='{"date":"2026-05-06","studyMinutes":75,...}' />
        {importError && <p className="error-text">{importError}</p>}
        <button className="primary-button" onClick={importStudyJson}>記録を世界に反映</button>
      </Panel>
    </div>
  );
}

function TimerScreen({ selectedQuest, timerSeconds, timerRunning, setTimerRunning, recordTimer, resetTimer, setTab }) {
  return (
    <div className="content-grid timer-screen-grid">
      <Panel className="timer-focus-panel">
        <p className="eyebrow">勉強タイマー</p>
        <h1>{selectedQuest ? selectedQuest.title : "クエストを選んで始めよう"}</h1>
        {selectedQuest ? (
          <div className="timer-quest-summary">
            <img src={asset(selectedQuest.icon)} alt="" />
            <div>
              <span>{selectedQuest.type === "free" ? "フリー記録" : `${selectedQuest.subject} / ${questTypes.find((type) => type.id === selectedQuest.type)?.label || "クエスト"}`}</span>
              <strong>XP {selectedQuest.xp}　🪙 {selectedQuest.coin}</strong>
            </div>
          </div>
        ) : (
          <p>おすすめクエストか「フリー」を選ぶと、タイマーと成果スキャンに進めます。</p>
        )}
        <div className="timer-orb" aria-label="タイマー">{formatTimer(timerSeconds)}</div>
        <div className="timer-main-actions">
          <button className="primary-button" type="button" onClick={() => setTimerRunning(!timerRunning)} disabled={!selectedQuest}>
            {timerRunning ? "少し休む" : "タイマー開始"}
          </button>
          <button className="primary-button pink" type="button" onClick={recordTimer} disabled={!selectedQuest}>
            終了して成果を写真にとる
          </button>
          <button className="danger-button subtle" type="button" onClick={resetTimer} disabled={!selectedQuest && !timerSeconds}>
            リセット
          </button>
        </div>
      </Panel>
      <Panel className="study-flow-panel">
        <h2>今日の流れ</h2>
        <ol className="study-flow-list">
          <li className={selectedQuest ? "done" : ""}><b>1</b><span>クエストを選ぶ</span></li>
          <li className={timerRunning || timerSeconds > 0 ? "done" : ""}><b>2</b><span>タイマーで勉強する</span></li>
          <li><b>3</b><span>成果を写真/PDFで残す</span></li>
          <li><b>4</b><span>AI解析JSONを保存する</span></li>
          <li><b>5</b><span>解説をリーフェルGPTに聞く</span></li>
        </ol>
        <div className="flow-note-card">
          <strong>フリー記録もOK</strong>
          <p>おすすめ以外の勉強は、クエスト画面の「フリー」から始めて、スキャン画面で教科と目的を選べます。</p>
        </div>
        <button className="book-link" type="button" onClick={() => setTab("quests")}>クエストを選び直す</button>
      </Panel>
    </div>
  );
}

function RoomPreview({ state, compact = false }) {
  const furnitureBySlot = roomFurnitureBySlot(state.room);
  const shouldShowLegacy = !Object.values(furnitureBySlot).some(Boolean);
  const legacyPlaced = shouldShowLegacy ? state.room?.placed || [] : [];
  return (
    <div
      className={`room-preview-scene ${compact ? "is-compact" : ""}`}
      data-room-wall={surfaceTone(state.room?.wall || "warm", "wall")}
      data-room-floor={surfaceTone(state.room?.floor || "wood", "floor")}
      data-town-theme={Object.entries(state.town.theme || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || "relax"}
    >
      <div className="room-wall-band" />
      <div className="room-floor-band" />
      {roomSlots.map((slot) => {
        const furnitureId = furnitureBySlot[slot.id];
        const item = roomItems.find((furniture) => itemKey(furniture) === furnitureId) || furnitureCatalog.find((furniture) => furniture.id === furnitureId);
        return (
          <div className={`room-slot-preview slot-${slot.id}`} key={slot.id}>
            {item && <img src={asset(itemIcon(item))} alt="" />}
          </div>
        );
      })}
      {legacyPlaced.slice(0, compact ? 3 : 6).map((placed) => {
        const item = furnitureCatalog.find((furniture) => furniture.id === placed.furnitureId);
        return item ? (
          <img
            className="legacy-room-item"
            key={placed.id}
            src={asset(item.icon)}
            alt=""
            style={{
              "--legacy-x": `${12 + ((placed.cell || 0) % 5) * 17}%`,
              "--legacy-y": `${24 + Math.floor((placed.cell || 0) / 5) * 12}%`,
              transform: `rotate(${placed.rotation || 0}deg)`,
            }}
          />
        ) : null;
      })}
    </div>
  );
}

function RoomScreen({ state, roomItems, roomFurnitureItems, updateRoomSurface, placeRoomSlot, removeRoomSlot }) {
  const [activeSlot, setActiveSlot] = useState(roomSlots[0].id);
  const selectedId = roomFurnitureBySlot(state.room)[activeSlot];
  const slotItems = roomFurnitureItems.filter((item) => item.slot === activeSlot);
  return (
    <div className="content-grid room-screen-grid">
      <Panel className="room-preview-panel">
        <div className="panel-head"><h2>マイルーム</h2><span>壁紙・床・家具でホームの雰囲気が変わるよ</span></div>
        <RoomPreview state={state} />
      </Panel>
      <Panel className="room-control-panel">
        <section className="surface-section">
          <h3>壁紙</h3>
          <div className="surface-options">
            {roomItems.wall.map((item) => (
              <button
                className={(state.room?.wall || "warm") === itemKey(item) ? "active" : ""}
                type="button"
                key={itemKey(item)}
                data-swatch={surfaceTone(itemKey(item), "wall")}
                onClick={() => updateRoomSurface("wall", itemKey(item))}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>
        <section className="surface-section">
          <h3>床</h3>
          <div className="surface-options">
            {roomItems.floor.map((item) => (
              <button
                className={(state.room?.floor || "wood") === itemKey(item) ? "active" : ""}
                type="button"
                key={itemKey(item)}
                data-swatch={surfaceTone(itemKey(item), "floor")}
                onClick={() => updateRoomSurface("floor", itemKey(item))}
              >
                {item.name}
              </button>
            ))}
          </div>
        </section>
        <section className="slot-section">
          <h3>家具スロット</h3>
          <div className="room-slot-tabs">
            {roomSlots.map((slot) => (
              <button className={activeSlot === slot.id ? "active" : ""} type="button" key={slot.id} onClick={() => setActiveSlot(slot.id)}>
                {slot.label}
              </button>
            ))}
          </div>
          <div className="slot-item-grid">
            {slotItems.map((item) => (
              <button className={selectedId === itemKey(item) ? "active" : ""} type="button" key={itemKey(item)} onClick={() => placeRoomSlot(activeSlot, item)}>
                <img src={asset(itemIcon(item))} alt="" />
                <span>{item.name}</span>
                <b>置く</b>
              </button>
            ))}
            {!slotItems.length && <p className="empty-note">このスロットに置ける家具は、ショップで増やせるよ。</p>}
          </div>
          <button className="danger-button subtle" type="button" onClick={() => removeRoomSlot(activeSlot)} disabled={!selectedId}>はずす</button>
        </section>
      </Panel>
    </div>
  );
}

function TownScreen({ state, townStage, townObjects, placeTownObject, removeTownObject }) {
  const [activeSpot, setActiveSpot] = useState(townSpots[0].id);
  const discovered = spirits.filter((spirit) => state.town.discoveredSpirits.includes(spirit.id));
  const objects = townObjectsBySpot(state.town);
  const selectedObjectId = objects[activeSpot];
  return (
    <div className="content-grid town-build-grid">
      <Panel className="town-main">
        <div className="panel-head"><h2>森の広場 Lv.{state.town.level}</h2><span>成長度 {state.town.growth}%</span></div>
        <div className="town-spot-stage">
          <img src={asset(townStage)} alt="" />
          {townSpots.map((spot) => {
            const item = townObjects.find((object) => itemKey(object) === objects[spot.id]) || fallbackTownObjects.find((object) => itemKey(object) === objects[spot.id]);
            return (
              <button className={`town-spot spot-${spot.id} ${activeSpot === spot.id ? "active" : ""}`} type="button" key={spot.id} onClick={() => setActiveSpot(spot.id)} aria-label={spot.label}>
                {item ? <img src={asset(itemIcon(item))} alt="" /> : <span>{spot.label}</span>}
              </button>
            );
          })}
        </div>
        <Progress value={state.town.growth} />
        <div className="theme-grid">{Object.entries(state.town.theme).map(([key, value]) => <span key={key}>{key}<b>{value}</b></span>)}</div>
      </Panel>
      <Panel className="town-control-panel">
        <h2>スポット編集</h2>
        <div className="town-spot-tabs">
          {townSpots.map((spot) => (
            <button className={activeSpot === spot.id ? "active" : ""} type="button" key={spot.id} onClick={() => setActiveSpot(spot.id)}>
              {spot.label}
            </button>
          ))}
        </div>
        <div className="town-object-grid">
          {townObjects.map((item) => (
            <button className={selectedObjectId === itemKey(item) ? "active" : ""} type="button" key={itemKey(item)} onClick={() => placeTownObject(activeSpot, item)}>
              <img src={asset(itemIcon(item))} alt="" />
              <span>{item.name}</span>
              <b>置く</b>
            </button>
          ))}
        </div>
        <button className="danger-button subtle" type="button" onClick={() => removeTownObject(activeSpot)} disabled={!selectedObjectId}>はずす</button>
      </Panel>
      <Panel className="spirit-panel">
        <h2>遊びに来た精霊</h2>
        <div className="spirit-grid">{discovered.map((spirit) => <SpiritCard key={spirit.id} spirit={spirit} />)}</div>
      </Panel>
    </div>
  );
}

function EncyclopediaScreen({ state }) {
  const discovered = new Set(state.town.discoveredSpirits);
  return (
    <div className="content-grid encyclopedia">
      <Panel><h2>精霊</h2><div className="item-grid">{spirits.map((spirit) => <SpiritCard key={spirit.id} spirit={spirit} locked={!discovered.has(spirit.id)} />)}</div></Panel>
      <Panel><h2>家具</h2><IconGrid items={furnitureCatalog} owned={state.inventory.furniture} /></Panel>
      <Panel><h2>衣装</h2><IconGrid items={gachaPool} owned={state.inventory.outfits} /></Panel>
      <Panel><h2>素材</h2><IconGrid items={materialCatalog} counts={state.inventory.materials} /></Panel>
    </div>
  );
}

function GachaScreen({ state, runGacha, gachaResults, gachaEffect, onSkipGacha }) {
  return (
    <div className="gacha-screen">
      <img src={asset("gacha-bg.png")} alt="" className="gacha-bg" />
      <Panel className="gacha-panel">
        <p className="eyebrow">ごほうびクローゼット</p>
        <h1>森の祝福をまとって</h1>
        <p>衣装・髪型・アクセサリーだけが出るよ。精霊は町づくりで自然に遊びに来ます。</p>
        <div className="button-row"><button className="primary-button" onClick={() => runGacha(1)} disabled={gachaEffect.active}>1回 100</button><button className="primary-button pink" onClick={() => runGacha(10)} disabled={gachaEffect.active}>10回 900</button></div>
      </Panel>
      {gachaEffect.active && <GachaEffect items={gachaEffect.items} index={gachaEffect.index} onSkip={onSkipGacha} />}
      <div className="gacha-results">{gachaResults.map((item, index) => <RewardCard key={`${item.id}-${index}`} item={item} index={index} />)}</div>
    </div>
  );
}

function WardrobeScreen({ state, equipOutfit }) {
  const ownedItems = gachaPool.filter((item) => state.inventory.outfits.includes(item.id));
  const wearableItems = ownedItems.filter(isWearableOutfit);
  const activeItem = activeOutfitItem(state);
  const activeOutfit = activeItem?.id;
  return (
    <div className="content-grid two-col wardrobe-screen">
      <Panel className="wardrobe-preview-panel">
        <p className="eyebrow">お着替えルーム</p>
        <h2>今日のコーデ</h2>
        <div className="wardrobe-preview">
          <AvatarFigure state={state} className="wardrobe-protagonist" showOutfitName />
          {activeItem && (
            <div className="wardrobe-current">
              <img src={asset(activeItem.icon)} alt="" />
              <span>{activeItem.rarity}</span>
              <strong>{activeItem.name}</strong>
            </div>
          )}
        </div>
      </Panel>
      <Panel className="wardrobe-list-panel">
        <div className="panel-head"><h2>服を選ぶ</h2><span>{wearableItems.length}点</span></div>
        <div className="wardrobe-grid">
          {wearableItems.map((item) => (
            <article className={`wardrobe-card rarity-${item.rarity.toLowerCase()} ${item.id === activeOutfit ? "active" : ""}`} key={item.id}>
              <img src={asset(item.icon)} alt="" />
              <span>{item.rarity}</span>
              <strong>{item.name}</strong>
              <small>{item.type}</small>
              <button type="button" onClick={() => equipOutfit(item)}>{item.id === activeOutfit ? "着用中" : "着る"}</button>
            </article>
          ))}
          {!wearableItems.length && <p className="empty-note">ごほうびクローゼットで服を集めると、ここで着替えられるよ。</p>}
        </div>
      </Panel>
    </div>
  );
}

function ShopScreen({ state, buyFurniture }) {
  return (
    <Panel className="shop-panel">
      <h2>小さな家具屋さん</h2>
      <div className="shop-grid">{furnitureCatalog.map((item) => <article className="shop-card" key={item.id}><img src={asset(item.icon)} alt="" /><h3>{item.name}</h3><p>🪙 {item.price}</p><button onClick={() => buyFurniture(item)}>{state.inventory.furniture.includes(item.id) ? "所持中" : "買う"}</button></article>)}</div>
    </Panel>
  );
}

function SettingsScreen({ state, updateState, resetGame }) {
  const settings = state.settings;
  const setSetting = (key, value) => updateState((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  return (
    <div className="content-grid two-col">
      <Panel className="settings-panel">
        <h2>テスト設定</h2>
        <label>テスト名<input value={settings.testName} onChange={(e) => setSetting("testName", e.target.value)} /></label>
        <label>テスト日<input type="date" value={settings.testDate} onChange={(e) => setSetting("testDate", e.target.value)} /></label>
        <label>完了ページ<input type="number" value={settings.workDonePages} onChange={(e) => setSetting("workDonePages", Number(e.target.value))} /></label>
        <label>総ページ<input type="number" value={settings.workTotalPages} onChange={(e) => setSetting("workTotalPages", Number(e.target.value))} /></label>
        <label>リーフェルGPT URL<input value={settings.leefelProjectUrl || ""} onChange={(e) => setSetting("leefelProjectUrl", e.target.value)} placeholder="https://chatgpt.com/g/..." /></label>
        <label>リーフェル輪郭確認
          <select value={settings.leefelDebugBackdrop || "off"} onChange={(e) => setSetting("leefelDebugBackdrop", e.target.value)}>
            <option value="off">通常表示</option>
            <option value="black">黒背景</option>
            <option value="white">白背景</option>
            <option value="checker">市松背景</option>
          </select>
        </label>
        <label>Driveルート名<input value={settings.driveRootName || ""} onChange={(e) => setSetting("driveRootName", e.target.value)} placeholder="勉強RPG（たま）" /></label>
        <label>Drive共有フォルダURL<input value={settings.driveRootUrl || ""} onChange={(e) => setSetting("driveRootUrl", e.target.value)} placeholder="https://drive.google.com/drive/folders/..." /></label>
      </Panel>
      <Panel>
        <h2>保存</h2>
        <p>記録はこのiPadのSafariに保存されます。</p>
        <button className="danger-button" onClick={resetGame}>データを初期化</button>
      </Panel>
    </div>
  );
}

function ResultModal({ draft, leefelDebugBackdrop = "off", onChange, onFiles, onScan, onOpenDrive, onSave, onAskLeefel, onClose }) {
  const preview = draft.generated || buildPreviewScanJson(draft);
  const analysis = draft.analysis || createScanAnalysis(draft);
  const drivePath = drivePathFor(draft);
  const outputPaths = driveOutputPathsFor(draft);
  return (
    <div className="modal-backdrop">
      <section className="modal result-modal">
        <div className="panel-head">
          <div>
            <p className="eyebrow">タイマー終了</p>
            <h2>📚 今日の成果をスキャン！</h2>
            {draft.questTitle && <small className="result-quest-label">選んだクエスト: {draft.questTitle}</small>}
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="result-layout">
          <div className="scan-form">
            <div>
              <span className="scan-label">教科</span>
              <div className="scan-choice-row">
                {subjectOptions.map((subject) => (
                  <button className={draft.subject === subject ? "active" : ""} type="button" key={subject} onClick={() => onChange({ subject })}>{subject}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="scan-label">目的</span>
              <div className="scan-choice-grid">
                {purposeOptions.map((purpose) => (
                  <button className={draft.purpose === purpose ? "active" : ""} type="button" key={purpose} onClick={() => onChange({ purpose })}>{purpose}</button>
                ))}
              </div>
            </div>
            <div className="drive-folder-card">
              <span>スキャン前に選択</span>
              <strong>{drivePath}</strong>
              <small>保存先: {outputPaths.submission}</small>
              <button type="button" onClick={onOpenDrive}>教科/目的でDriveを開く</button>
            </div>
            <label>今日の分数
              <input type="number" min="0" value={draft.studyMinutes} onChange={(event) => onChange({ studyMinutes: Number(event.target.value) })} />
            </label>
            <label>Google Drive 教材URL
              <input value={draft.driveUrl} onChange={(event) => onChange({ driveUrl: event.target.value })} placeholder="共有リンクを貼る" />
            </label>
            <label>成果写真 / PDF
              <input type="file" accept="image/*,.pdf" multiple onChange={(event) => onFiles(event.target.files)} />
            </label>
            <label>メモ
              <textarea value={draft.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="間違えた問題、ページ、先生に聞きたいことなど" />
            </label>
            <label>苦手かも
              <input value={draft.weakPoint} onChange={(event) => onChange({ weakPoint: event.target.value })} placeholder="一次関数、英単語、化学変化など" />
            </label>
            <button className="scan-main-button" type="button" onClick={onScan} disabled={draft.scanning}>{draft.scanning ? "AIが教材解析中..." : "今日の成果をスキャン！"}</button>
          </div>
          <div className="scan-preview">
            <LeefelFigure className="scan-leefel" debugMode={leefelDebugBackdrop} />
            <div className="scan-flow">
              {["タイマー終了", "成果スキャン", "AIが教材解析", "クエスト化"].map((step, index) => <span key={step}>{index + 1}. {step}</span>)}
            </div>
            <article className="scan-result-card">
              <p>📘 {analysis.subject} / {analysis.purpose}</p>
              <ul>{analysis.tasks.map((task) => <li key={task}>✔ {task}</li>)}</ul>
              <div><strong>✨ +{preview.rewards.xp}XP</strong><strong>🪙 +{preview.rewards.coin}コイン</strong></div>
            </article>
            <h3>AI解析用JSON</h3>
            <pre>{JSON.stringify(preview, null, 2)}</pre>
            <div className="scan-actions">
              <button className="primary-button" type="button" onClick={onSave} disabled={draft.saved}>{draft.saved ? "保存済み" : "XP・コインに保存"}</button>
              <button className="primary-button pink" type="button" onClick={onAskLeefel}>解説を聞く</button>
            </div>
            <p>ボタンを押すとJSONをコピーして、設定したChatGPT Projectへ移動します。</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function RoomModal({ state, ownedFurniture, selectedFurniture, setState, placeFurniture, rotatePlaced, deletePlaced, onClose }) {
  return (
    <div className="modal-backdrop">
      <section className="modal room-modal">
        <div className="panel-head"><h2>マイルームをカスタマイズ</h2><button onClick={onClose}>×</button></div>
        <div className="room-editor">
          <div className="furniture-picker">
            {ownedFurniture.map((item) => <button className={state.room.selectedFurniture === item.id ? "active" : ""} key={item.id} onClick={() => setState((current) => ({ ...current, room: { ...current.room, selectedFurniture: item.id } }))}><img src={asset(item.icon)} alt="" />{item.name}</button>)}
          </div>
          <div className="room-grid" aria-label="家具配置グリッド">
            {Array.from({ length: 25 }).map((_, cell) => {
              const placed = state.room.placed.find((item) => item.cell === cell);
              const item = placed && furnitureCatalog.find((f) => f.id === placed.furnitureId);
              return (
                <button className="room-cell" key={cell} onClick={() => placeFurniture(cell)}>
                  {item && <img style={{ transform: `rotate(${placed.rotation}deg)` }} src={asset(item.icon)} alt="" />}
                </button>
              );
            })}
          </div>
          <div className="placed-list">
            <h3>配置中</h3>
            {state.room.placed.map((placed) => {
              const item = furnitureCatalog.find((f) => f.id === placed.furnitureId);
              return <div key={placed.id}><span>{item?.name}</span><button onClick={() => rotatePlaced(placed.id)}>回転</button><button onClick={() => deletePlaced(placed.id)}>削除</button></div>;
            })}
            <p>選択中: {selectedFurniture.name}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

function DialogueModal({ state, onClose }) {
  const line = state.recoveryLog[0]?.title ? `${state.recoveryLog[0].title}、少しずつで大丈夫だよ。` : "毎日コツコツが、未来の魔法になるよ。あなたのペースで大丈夫だよ。";
  return (
    <div className="modal-backdrop">
      <section className="modal dialogue-modal">
        <LeefelFigure className="dialogue-leefel" debugMode={state.settings.leefelDebugBackdrop} />
        <div><h2>リーフェル</h2><p>{line}</p><button className="primary-button" onClick={onClose}>ありがとう</button></div>
      </section>
    </div>
  );
}

function AvatarModal({ state, onSelect, onClose }) {
  const choices = [
    { icon: activeOutfitItem(state)?.icon || "protagonist.png", label: "今のコーデ" },
    { icon: "protagonist.png", label: "主人公" },
    ...gachaPool.slice(0, 6).map((item) => ({ icon: item.icon, label: item.name })),
    { icon: "avatar/leefel-default.png", label: "リーフェル" },
  ];
  return (
    <div className="modal-backdrop">
      <section className="modal avatar-modal">
        <div className="panel-head"><h2>プロフィールアイコン</h2><button onClick={onClose}>×</button></div>
        <div className="avatar-choice-grid">
          {choices.map((choice) => (
            <button
              className={state.avatar?.profileIcon === choice.icon ? "active" : ""}
              key={choice.icon}
              type="button"
              onClick={() => onSelect(choice.icon)}
            >
              <img src={asset(choice.icon)} alt="" />
              <span>{choice.label}</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => <button key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}><img src={asset(item.icon)} alt="" className="nav-icon" />{item.label}</button>)}
    </nav>
  );
}

function Panel({ children, className = "" }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function Progress({ value }) {
  return <div className="progress"><span style={{ width: `${clampPercent(value)}%` }} /></div>;
}

function GachaEffect({ items, index, onSkip }) {
  const current = items[index] || items[0];
  return (
    <div className="gacha-effect" aria-live="polite">
      <div className="closet-aura">
        <span />
        <span />
        <span />
      </div>
      <button className="gacha-skip" type="button" onClick={onSkip}>スキップ</button>
      {current && (
        <article className={`gacha-effect-card rarity-${current.rarity.toLowerCase()}`} key={`${current.id}-${index}`}>
          <img src={asset(current.icon)} alt="" className="gacha-effect-item" />
          <span>{index + 1} / {items.length}</span>
          <strong>{current.rarity} {current.name}</strong>
          <small>{current.type}</small>
        </article>
      )}
      <div className="gacha-reveal-strip">
        {items.map((item, itemIndex) => (
          <span key={`${item.id}-${itemIndex}`} className={itemIndex <= index ? `revealed rarity-${item.rarity.toLowerCase()}` : ""}>
            {itemIndex <= index && <img src={asset(item.icon)} alt="" />}
          </span>
        ))}
      </div>
      <p>森のクローゼットがひらいたよ</p>
    </div>
  );
}

function SpiritCard({ spirit, locked = false }) {
  return <article className={`spirit-card ${locked ? "locked" : ""}`}><img src={asset(spirit.icon)} alt="" /><h3>{locked ? "？？？" : spirit.name}</h3><p>{locked ? "町を育てると会えるよ" : spirit.line}</p></article>;
}

function IconGrid({ items, owned = [], counts = null }) {
  return <div className="item-grid">{items.map((item) => <article className={`icon-card ${owned.length && !owned.includes(item.id) ? "locked" : ""}`} key={item.id}><img src={asset(item.icon)} alt="" /><span>{item.name}</span>{counts && <b>×{counts[item.id] || 0}</b>}</article>)}</div>;
}

function RewardCard({ item, index = 0 }) {
  return <article className={`reward-card rarity-${item.rarity.toLowerCase()}`} style={{ animationDelay: `${index * 70}ms` }}><img src={asset(item.icon)} alt="" /><span>{item.rarity}</span><strong>{item.name}</strong><small>{item.type}</small></article>;
}
