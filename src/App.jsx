import React, { useEffect, useMemo, useState } from "react";
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
import { loadState, saveState } from "./storage";

const rarityWeight = { N: 70, R: 25, SR: 5 };
const subjectOptions = ["数学", "英語", "理科", "社会", "国語"];
const purposeOptions = ["ワーク確認", "丸つけ後の復習", "苦手分析", "テスト対策", "暗記チェック"];

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
  const [roomOpen, setRoomOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [resultOpen, setResultOpen] = useState(false);
  const [scanDraft, setScanDraft] = useState(null);
  const [progressMode, setProgressMode] = useState("week");
  const [sparkle, setSparkle] = useState(false);

  useEffect(() => saveState(state), [state]);

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
  const townStage = state.town.level >= 30 ? "town-lv30.png" : state.town.level >= 20 ? "town-lv20.png" : state.town.level >= 10 ? "town-lv10.png" : state.town.level >= 5 ? "town-lv5.png" : "town-lv1.png";

  const ownedFurniture = useMemo(
    () => furnitureCatalog.filter((item) => state.inventory.furniture.includes(item.id)),
    [state.inventory.furniture]
  );

  const selectedFurniture = furnitureCatalog.find((item) => item.id === state.room.selectedFurniture) || furnitureCatalog[0];

  function updateState(next) {
    setState((current) => (typeof next === "function" ? next(current) : next));
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

  function runGacha(count) {
    const cost = count === 10 ? 900 : 100;
    if (state.player.coin < cost) {
      setToast("コインが少し足りないみたい");
      return;
    }
    const results = Array.from({ length: count }, rollOne);
    updateState((current) => ({
      ...current,
      player: { ...current.player, coin: current.player.coin - cost },
      inventory: {
        ...current.inventory,
        outfits: Array.from(new Set([...current.inventory.outfits, ...results.map((item) => item.id)])),
      },
      gachaHistory: [...results, ...current.gachaHistory].slice(0, 40),
    }));
    setGachaResults(results);
    setSparkle(true);
    window.setTimeout(() => setSparkle(false), 1000);
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
    updateState((current) => {
      const minutes = Math.floor((current.timer?.elapsedSeconds || 0) / 60);
      return {
        ...current,
        player: { ...current.player, studyMinutes: current.player.studyMinutes + minutes },
        timer: { running: false, elapsedSeconds: 0 },
      };
    });
    setScanDraft(createScanDraft(state));
    setResultOpen(true);
    setToast("タイマーの分を今日の勉強時間に足したよ");
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
    setScanDraft((current) => ({ ...(current || createScanDraft(state)), ...patch }));
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

  function saveScanResult() {
    const draft = scanDraft || createScanDraft(state);
    if (draft.saved) {
      setToast("この成果はもう保存済みだよ");
      return;
    }
    const minutes = Math.max(5, Number(draft.studyMinutes || 0));
    const xp = Math.max(10, Math.round(minutes * 0.8));
    const coin = Math.max(8, Math.round(minutes * 0.55));
    const generated = {
      date: todayString(),
      studyMinutes: minutes,
      completedQuests: [
        {
          subject: draft.subject,
          title: `${draft.subject} ${draft.purpose}`,
          xp,
          coin,
          evidence: {
            driveUrl: draft.driveUrl,
            files: draft.files,
            memo: draft.memo,
          },
        },
      ],
      recoveryQuests: draft.weakPoint
        ? [
            {
              subject: draft.subject,
              title: `${draft.weakPoint} リカバリー`,
              xp: 35,
              coin: 25,
            },
          ]
        : [],
      rewards: { xp, coin },
      aiAnalysisRequest: {
        subject: draft.subject,
        purpose: draft.purpose,
        question: "添付教材やメモから、正答/誤答/苦手単元/次の1問をやさしく分析してください。",
        outputFormat: "study-rpg-daily-json",
      },
    };

    updateState((current) => ({
      ...current,
      player: {
        ...current.player,
        xp: current.player.xp + xp,
        coin: current.player.coin + coin,
      },
      completedLog: [
        {
          id: `scan-${Date.now()}`,
          subject: draft.subject,
          title: `${draft.subject} ${draft.purpose}`,
          xp,
          coin,
          completedAt: new Date().toISOString(),
          source: "scan",
        },
        ...current.completedLog,
      ].slice(0, 40),
      recoveryLog: [...generated.recoveryQuests, ...current.recoveryLog].slice(0, 20),
      scanLogs: [{ ...draft, generated, savedAt: new Date().toISOString() }, ...(current.scanLogs || [])].slice(0, 20),
      town: {
        ...current.town,
        growth: clampPercent(current.town.growth + 2),
      },
    }));
    setScanDraft({ ...draft, generated, saved: true });
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
              progressMode={progressMode}
              setProgressMode={setProgressMode}
              townStage={townStage}
              setTab={setTab}
              setDialogueOpen={setDialogueOpen}
              setRoomOpen={setRoomOpen}
            />
          )}
          {tab === "quests" && (
            <QuestScreen
              quests={visibleQuests}
              questFilter={questFilter}
              setQuestFilter={setQuestFilter}
              completeQuest={completeQuest}
              jsonText={jsonText}
              setJsonText={setJsonText}
              importStudyJson={importStudyJson}
              importError={importError}
            />
          )}
          {tab === "town" && <TownScreen state={state} townStage={townStage} placeFurniture={placeFurniture} />}
          {tab === "encyclopedia" && <EncyclopediaScreen state={state} />}
          {tab === "gacha" && <GachaScreen state={state} runGacha={runGacha} gachaResults={gachaResults} />}
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
          onChange={updateScanDraft}
          onFiles={updateScanFiles}
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

function createScanDraft(state) {
  const timerMinutes = Math.floor((state.timer?.elapsedSeconds || 0) / 60);
  return {
    subject: "数学",
    purpose: "ワーク確認",
    studyMinutes: Math.max(5, timerMinutes),
    driveUrl: "",
    files: [],
    memo: "",
    weakPoint: "",
    generated: null,
  };
}

function buildPreviewScanJson(draft) {
  const xp = Math.max(10, Math.round(Number(draft.studyMinutes || 0) * 0.8));
  const coin = Math.max(8, Math.round(Number(draft.studyMinutes || 0) * 0.55));
  return {
    date: todayString(),
    studyMinutes: Number(draft.studyMinutes || 0),
    completedQuests: [
      {
        subject: draft.subject,
        title: `${draft.subject} ${draft.purpose}`,
        xp,
        coin,
      },
    ],
    recoveryQuests: draft.weakPoint ? [{ subject: draft.subject, title: `${draft.weakPoint} リカバリー`, xp: 35, coin: 25 }] : [],
    rewards: { xp, coin },
    evidence: {
      driveUrl: draft.driveUrl,
      files: draft.files,
      memo: draft.memo,
    },
  };
}

function TopBar({ state, xpProgress, setTab, onAvatarEdit }) {
  return (
    <header className="top-bar">
      <div className="profile-card">
        <button className="profile-avatar-button" type="button" onClick={onAvatarEdit} aria-label="アイコンを編集">
          <img src={asset(state.avatar?.profileIcon || "protagonist.png")} alt="" className="profile-avatar" />
          <span>編集</span>
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
        <button className="icon-button has-dot" type="button" aria-label="ごほうび" onClick={() => setTab("gacha")}><img src={asset("top-gift.png")} alt="" /></button>
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
  completeQuest,
  testDays,
  workProgress,
  totalStudyMinutes,
  timerSeconds,
  timerRunning,
  setTimerRunning,
  recordTimer,
  resetTimer,
  progressMode,
  setProgressMode,
  townStage,
  setTab,
  setDialogueOpen,
  setRoomOpen,
}) {
  const daily = activeQuests.slice(0, 3);
  const recovery = activeQuests.find((quest) => quest.type === "recovery");
  const weekGoalMinutes = 420;
  const weekProgress = clampPercent((totalStudyMinutes / weekGoalMinutes) * 100);
  const testProgress = workProgress;
  const shownProgress = progressMode === "test" ? testProgress : weekProgress;
  const shownValue = progressMode === "test" ? `${state.settings.workDonePages} / ${state.settings.workTotalPages}` : `${totalStudyMinutes} / ${weekGoalMinutes}分`;
  const shownLabel = progressMode === "test" ? "テストまでの進捗" : "今週の進捗";
  return (
    <div className="home-scene">
      <img src={asset("home-bg.png")} alt="" className="home-bg" />
      <aside className="left-stack">
        <Panel className="quest-panel ribbon-panel">
          <h2>今日のクエスト</h2>
          {daily.map((quest) => (
            <button className="quest-row" type="button" key={quest.id} onClick={() => completeQuest(quest.id)}>
              <img src={asset(quest.icon)} alt="" />
              <span className="quest-copy">
                <strong>{quest.title}</strong>
                <small>XP {quest.xp}　🪙 {quest.coin}</small>
              </span>
              <b>✓</b>
            </button>
          ))}
        </Panel>
        {recovery && (
          <Panel className="recovery-card">
            <h3>リカバリークエスト</h3>
            <button type="button" onClick={() => completeQuest(recovery.id)}>
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
            <strong className="timer-display">{formatTimer(timerSeconds)}</strong>
            <div className="timer-actions">
              <button type="button" onClick={() => setTimerRunning(!timerRunning)}>{timerRunning ? "一時停止" : "スタート"}</button>
              <button type="button" onClick={recordTimer}>終了して成果スキャン</button>
              <button type="button" onClick={resetTimer}>リセット</button>
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
        <img src={asset("protagonist.png")} alt="主人公" className="protagonist" />
        <button type="button" className="leefel-button" onClick={() => setDialogueOpen(true)} aria-label="リーフェルに話しかける">
          <span className="speech">今日もがんばったね！<br />一緒に町を育てていこう♪</span>
          <img src={asset("leefel.png")} alt="リーフェル" className="leefel" />
        </button>
      </div>
      <aside className="right-stack">
        <Panel className="room-card">
          <div className="panel-head"><h2>マイルーム Lv.{state.player.level}</h2><button>i</button></div>
          <img src={asset("town-lv30.png")} alt="" className="room-preview" />
          <div className="metric"><span>成長度</span><b>{state.town.growth}%</b></div>
          <Progress value={state.town.growth} />
          <button className="primary-button" type="button" onClick={() => setRoomOpen(true)}>🪴 マイルームをカスタマイズ</button>
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

function QuestScreen({ quests, questFilter, setQuestFilter, completeQuest, jsonText, setJsonText, importStudyJson, importError }) {
  return (
    <div className="content-grid two-col">
      <Panel className="list-panel">
        <div className="tabs">{questTypes.map((type) => <button key={type.id} className={questFilter === type.id ? "active" : ""} onClick={() => setQuestFilter(type.id)}>{type.label}</button>)}</div>
        {quests.map((quest) => (
          <article className="quest-detail-row" key={quest.id}>
            <img src={asset(quest.icon)} alt="" />
            <div><h3>{quest.title}</h3><p>{quest.subject}　XP {quest.xp}　🪙 {quest.coin}</p></div>
            <button className="primary-button" onClick={() => completeQuest(quest.id)}>完了</button>
          </article>
        ))}
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

function TownScreen({ state, townStage, placeFurniture }) {
  const discovered = spirits.filter((spirit) => state.town.discoveredSpirits.includes(spirit.id));
  return (
    <div className="content-grid two-col">
      <Panel className="town-main">
        <h2>森の広場 Lv.{state.town.level}</h2>
        <img src={asset(townStage)} alt="" />
        <Progress value={state.town.growth} />
        <div className="theme-grid">{Object.entries(state.town.theme).map(([key, value]) => <span key={key}>{key}<b>{value}</b></span>)}</div>
      </Panel>
      <Panel>
        <h2>遊びに来た精霊</h2>
        <div className="spirit-grid">{discovered.map((spirit) => <SpiritCard key={spirit.id} spirit={spirit} />)}</div>
        <button className="primary-button" onClick={() => placeFurniture(Math.floor(Math.random() * 25))}>家具を置いて町を育てる</button>
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

function GachaScreen({ state, runGacha, gachaResults }) {
  return (
    <div className="gacha-screen">
      <img src={asset("gacha-bg.png")} alt="" className="gacha-bg" />
      <Panel className="gacha-panel">
        <p className="eyebrow">ごほうびクローゼット</p>
        <h1>森の祝福をまとって</h1>
        <p>衣装・髪型・アクセサリーだけが出るよ。精霊は町づくりで自然に遊びに来ます。</p>
        <div className="button-row"><button className="primary-button" onClick={() => runGacha(1)}>1回 100</button><button className="primary-button pink" onClick={() => runGacha(10)}>10回 900</button></div>
      </Panel>
      <div className="gacha-results">{gachaResults.map((item, index) => <RewardCard key={`${item.id}-${index}`} item={item} />)}</div>
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
      </Panel>
      <Panel>
        <h2>保存</h2>
        <p>記録はこのiPadのSafariに保存されます。</p>
        <button className="danger-button" onClick={resetGame}>データを初期化</button>
      </Panel>
    </div>
  );
}

function ResultModal({ draft, onChange, onFiles, onSave, onAskLeefel, onClose }) {
  const preview = draft.generated || buildPreviewScanJson(draft);
  return (
    <div className="modal-backdrop">
      <section className="modal result-modal">
        <div className="panel-head">
          <div>
            <p className="eyebrow">今日もおつかれさま！</p>
            <h2>今日の成果をスキャンしよう</h2>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="result-layout">
          <div className="scan-form">
            <label>教科
              <select value={draft.subject} onChange={(event) => onChange({ subject: event.target.value })}>
                {subjectOptions.map((subject) => <option key={subject} value={subject}>{subject}</option>)}
              </select>
            </label>
            <label>目的
              <select value={draft.purpose} onChange={(event) => onChange({ purpose: event.target.value })}>
                {purposeOptions.map((purpose) => <option key={purpose} value={purpose}>{purpose}</option>)}
              </select>
            </label>
            <label>今日の分数
              <input type="number" min="0" value={draft.studyMinutes} onChange={(event) => onChange({ studyMinutes: Number(event.target.value) })} />
            </label>
            <label>Google Drive 教材URL
              <input value={draft.driveUrl} onChange={(event) => onChange({ driveUrl: event.target.value })} placeholder="共有リンクを貼る" />
            </label>
            <label>写真 / PDF
              <input type="file" accept="image/*,.pdf" multiple onChange={(event) => onFiles(event.target.files)} />
            </label>
            <label>メモ
              <textarea value={draft.memo} onChange={(event) => onChange({ memo: event.target.value })} placeholder="間違えた問題、ページ、先生に聞きたいことなど" />
            </label>
            <label>苦手かも
              <input value={draft.weakPoint} onChange={(event) => onChange({ weakPoint: event.target.value })} placeholder="一次関数、英単語、化学変化など" />
            </label>
          </div>
          <div className="scan-preview">
            <img src={asset("leefel.png")} alt="" />
            <h3>AI解析用JSON</h3>
            <pre>{JSON.stringify(preview, null, 2)}</pre>
            <div className="scan-actions">
              <button className="primary-button" type="button" onClick={onSave} disabled={draft.saved}>{draft.saved ? "保存済み" : "XP・コインに保存"}</button>
              <button className="primary-button pink" type="button" onClick={onAskLeefel}>リーフェルに聞く</button>
            </div>
            <p>「リーフェルに聞く」はJSONをコピーして、設定したChatGPT Projectへ移動します。</p>
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
        <img src={asset("leefel.png")} alt="" />
        <div><h2>リーフェル</h2><p>{line}</p><button className="primary-button" onClick={onClose}>ありがとう</button></div>
      </section>
    </div>
  );
}

function AvatarModal({ state, onSelect, onClose }) {
  const choices = [
    { icon: "protagonist.png", label: "主人公" },
    ...gachaPool.slice(0, 6).map((item) => ({ icon: item.icon, label: item.name })),
    { icon: "leefel.png", label: "リーフェル" },
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

function SpiritCard({ spirit, locked = false }) {
  return <article className={`spirit-card ${locked ? "locked" : ""}`}><img src={asset(spirit.icon)} alt="" /><h3>{locked ? "？？？" : spirit.name}</h3><p>{locked ? "町を育てると会えるよ" : spirit.line}</p></article>;
}

function IconGrid({ items, owned = [], counts = null }) {
  return <div className="item-grid">{items.map((item) => <article className={`icon-card ${owned.length && !owned.includes(item.id) ? "locked" : ""}`} key={item.id}><img src={asset(item.icon)} alt="" /><span>{item.name}</span>{counts && <b>×{counts[item.id] || 0}</b>}</article>)}</div>;
}

function RewardCard({ item }) {
  return <article className={`reward-card rarity-${item.rarity.toLowerCase()}`}><img src={asset(item.icon)} alt="" /><span>{item.rarity}</span><strong>{item.name}</strong><small>{item.type}</small></article>;
}
