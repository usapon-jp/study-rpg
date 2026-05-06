export const asset = (name) => `${import.meta.env.BASE_URL}assets/crops/${name}`;

export const questTypes = [
  { id: "main", label: "メイン" },
  { id: "sub", label: "サブ" },
  { id: "recovery", label: "リカバリー" },
];

export const initialQuests = [
  {
    id: "math-work-12",
    type: "main",
    subject: "数学",
    title: "数学ワーク p.12〜13を解く",
    xp: 30,
    coin: 20,
    icon: "quest-math.png",
    material: "book-fragment",
  },
  {
    id: "english-words-30",
    type: "sub",
    subject: "英語",
    title: "英単語を30個覚える",
    xp: 20,
    coin: 15,
    icon: "quest-english.png",
    material: "leaf",
  },
  {
    id: "function-recovery",
    type: "recovery",
    subject: "数学",
    title: "一次関数の問題 3問リカバリー",
    xp: 40,
    coin: 30,
    icon: "quest-recovery.png",
    material: "light-drop",
  },
  {
    id: "science-note",
    type: "sub",
    subject: "理科",
    title: "理科ノートを5分だけ整える",
    xp: 15,
    coin: 10,
    icon: "quest-science.png",
    material: "petal",
  },
];

export const gachaPool = [
  { id: "outfit-n-1", name: "若葉の通学ワンピ", rarity: "N", type: "衣装", icon: "outfit-n-1.png" },
  { id: "outfit-n-2", name: "花色カーデコーデ", rarity: "N", type: "衣装", icon: "outfit-n-2.png" },
  { id: "outfit-n-3", name: "小さな庭仕事服", rarity: "N", type: "衣装", icon: "outfit-n-3.png" },
  { id: "outfit-r-1", name: "青空リボンドレス", rarity: "R", type: "衣装", icon: "outfit-r-1.png" },
  { id: "outfit-r-2", name: "星待ちラベンダー", rarity: "R", type: "衣装", icon: "outfit-r-2.png" },
  { id: "outfit-r-3", name: "夜色の魔法使い", rarity: "R", type: "衣装", icon: "outfit-r-3.png" },
  { id: "outfit-sr-1", name: "森の祝福ドレス", rarity: "SR", type: "特別コーデ", icon: "outfit-sr-1.png" },
  { id: "outfit-sr-2", name: "水色星花ドレス", rarity: "SR", type: "特別コーデ", icon: "outfit-sr-2.png" },
  { id: "outfit-sr-3", name: "春霞の花冠ドレス", rarity: "SR", type: "特別コーデ", icon: "outfit-sr-3.png" },
  { id: "hair-leaf-braid", name: "リーフ三つ編み", rarity: "R", type: "髪型", icon: "outfit-r-1.png" },
  { id: "accessory-flower-pin", name: "小花の髪飾り", rarity: "N", type: "アクセサリー", icon: "material-petal.png" },
  { id: "accessory-moon-ribbon", name: "月しずくリボン", rarity: "SR", type: "アクセサリー", icon: "material-moon-dust.png" },
];

export const furnitureCatalog = [
  { id: "desk", name: "小さな机", price: 400, theme: "book", icon: "furniture-desk.png" },
  { id: "bookshelf", name: "本棚", price: 500, theme: "book", icon: "furniture-bookshelf.png" },
  { id: "bed", name: "草花のベッド", price: 650, theme: "relax", icon: "furniture-bed.png" },
  { id: "bench", name: "葉っぱのベンチ", price: 300, theme: "relax", icon: "furniture-bench.png" },
  { id: "plant", name: "観葉植物", price: 180, theme: "flower", icon: "furniture-plant.png" },
  { id: "planter", name: "花だん", price: 200, theme: "flower", icon: "furniture-planter.png" },
  { id: "lamp", name: "きのこランプ", price: 250, theme: "night", icon: "furniture-lamp.png" },
  { id: "window", name: "蔦の窓", price: 600, theme: "flower", icon: "furniture-window.png" },
  { id: "fountain", name: "小さな噴水", price: 800, theme: "relax", icon: "furniture-fountain.png" },
];

export const materialCatalog = [
  { id: "leaf", name: "葉っぱ", icon: "material-leaf.png" },
  { id: "petal", name: "花びら", icon: "material-petal.png" },
  { id: "light-drop", name: "光のしずく", icon: "material-light-drop.png" },
  { id: "book-fragment", name: "本のかけら", icon: "material-book-fragment.png" },
  { id: "seed", name: "小さな種", icon: "material-seed.png" },
  { id: "moon-dust", name: "月の粉", icon: "material-moon-dust.png" },
  { id: "ribbon-thread", name: "リボン糸", icon: "material-ribbon-thread.png" },
  { id: "acorn-token", name: "どんぐりメダル", icon: "material-acorn-token.png" },
];

export const spirits = [
  { id: "flower", name: "花の精霊", theme: "flower", line: "花が増えると、町がふわっと明るくなるよ。", icon: "spirit-flower.png" },
  { id: "book", name: "本の精霊", theme: "book", line: "ノートの端っこに、今日の小さな発見を残そう。", icon: "spirit-book.png" },
  { id: "night", name: "夜の精霊", theme: "night", line: "夜の灯りは、がんばった日のしるしだよ。", icon: "spirit-night.png" },
  { id: "mushroom", name: "きのこの精霊", theme: "night", line: "休む時間も、冒険の一部だよ。", icon: "spirit-mushroom.png" },
  { id: "cafe", name: "くつろぎ精霊", theme: "relax", line: "一息ついたら、また少し進めばいいよ。", icon: "spirit-cafe.png" },
];

export const navItems = [
  { id: "home", label: "ホーム", icon: "nav-home.png" },
  { id: "quests", label: "クエスト", icon: "nav-quest.png" },
  { id: "town", label: "町づくり", icon: "nav-town.png" },
  { id: "encyclopedia", label: "図鑑", icon: "nav-book.png" },
  { id: "gacha", label: "ガチャ", icon: "nav-gacha.png" },
  { id: "shop", label: "ショップ", icon: "nav-shop.png" },
  { id: "settings", label: "設定", icon: "top-gear.png" },
];

export function createInitialState() {
  return {
    player: {
      name: "たま",
      level: 12,
      xp: 1250,
      nextXp: 2000,
      coin: 2350,
      gems: 120,
      studyMinutes: 75,
      streak: 7,
    },
    settings: {
      testName: "中間テスト",
      testDate: "2026-06-12",
      workDonePages: 48,
      workTotalPages: 77,
      leefelProjectUrl: "https://chatgpt.com/",
    },
    avatar: {
      outfit: "outfit-sr-1",
      hair: "leaf-brown",
      eye: "warm-brown",
      accessory: "flower-pin",
      profileIcon: "protagonist.png",
    },
    timer: {
      running: false,
      elapsedSeconds: 0,
    },
    quests: initialQuests.map((quest) => ({ ...quest, status: "active" })),
    completedLog: [],
    recoveryLog: [],
    inventory: {
      outfits: ["outfit-n-1", "outfit-sr-1"],
      furniture: ["desk", "bookshelf", "plant", "lamp"],
      materials: { leaf: 3, petal: 2, "book-fragment": 1, "light-drop": 1 },
    },
    room: {
      selectedFurniture: "desk",
      placed: [
        { id: "desk-1", furnitureId: "desk", cell: 12, rotation: 0 },
        { id: "bookshelf-1", furnitureId: "bookshelf", cell: 4, rotation: 0 },
        { id: "plant-1", furnitureId: "plant", cell: 20, rotation: 0 },
      ],
    },
    town: {
      level: 6,
      growth: 62,
      discoveredSpirits: ["flower"],
      theme: { flower: 2, book: 2, night: 1, relax: 1 },
    },
    gachaHistory: [],
    importedDates: [],
    scanLogs: [],
  };
}
