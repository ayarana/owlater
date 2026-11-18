const COLUMNS = [
  { id: "now", name: "Now", hint: "Reading today", limit: 3 },
  { id: "next", name: "Next", hint: "This week's queue", limit: 10 },
  { id: "later", name: "Later", hint: "No rush", limit: null },
  { id: "read", name: "Read", hint: "Done", limit: null },
];

const LEGACY_COLUMN_IDS = { agora: "now", proximos: "next", depois: "later", lido: "read", expirado: "later" };
const LEGACY_THEME_IDS = { ameixa: "plum", noite: "night", crepusculo: "twilight" };
const normalizeColumn = (id) => LEGACY_COLUMN_IDS[id] || id;

const DEFAULT_SETTINGS = {
  autoExpire: false,
  expireDays: 30,
  notify: false,
  notifyTime: "09:00",
  autoAdvance: false,
  theme: "auto",
  strict: false,
};

const THEMES = [
  { id: "auto", name: "Auto", colors: ["#f6f5fa", "#6d5bd0", "#14151c"] },
  { id: "plum", name: "Plum", colors: ["#171821", "#a887ce", "#c8688c"] },
  { id: "night", name: "Violet night", colors: ["#0e1033", "#f58b9b", "#8e66c8"] },
  { id: "twilight", name: "Twilight", colors: ["#1a2238", "#f4a98a", "#e0516a"] },
  { id: "aurora", name: "Aurora", colors: ["#2a3460", "#3cc0c9", "#ee6aa5"] },
];

function applyTheme(id) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = THEMES.some((t) => t.id === id) ? id : "auto";
}

const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage && chrome.storage.local;

async function kvGet(key, fallback) {
  if (hasChromeStorage) {
    const r = await chrome.storage.local.get(key);
    return r[key] === undefined ? fallback : r[key];
  }
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
}

async function kvSet(key, value) {
  if (hasChromeStorage) return chrome.storage.local.set({ [key]: value });
  localStorage.setItem(key, JSON.stringify(value));
}

async function loadCards() {
  const cards = await kvGet("cards", []);
  let changed = false;
  for (const c of cards) {
    const to = LEGACY_COLUMN_IDS[c.col];
    if (!to) continue;
    if (c.col === "expirado") c.movedAt = Date.now();
    c.col = to;
    changed = true;
  }
  if (changed) await saveCards(cards);
  return cards;
}
const saveCards = (cards) => kvSet("cards", cards);

async function loadSettings() {
  const s = { ...DEFAULT_SETTINGS, ...(await kvGet("settings", {})) };
  if (LEGACY_THEME_IDS[s.theme]) s.theme = LEGACY_THEME_IDS[s.theme];
  return s;
}
const saveSettings = (s) => kvSet("settings", s);

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

async function addCard(url, title, note, col = "later") {
  const cards = await loadCards();
  if (cards.some((c) => c.url === url && c.col !== "read")) {
    return { ok: false, duplicate: true };
  }
  const colDef = COLUMNS.find((c) => c.id === col);
  if (!colDef) return { ok: false };
  if (colDef.limit !== null && cards.filter((c) => c.col === col).length >= colDef.limit) {
    return { ok: false, full: true };
  }
  const now = Date.now();
  cards.push({
    id: newId(), url, title: title || url, note: (note || "").trim(),
    col, savedAt: now, movedAt: now,
  });
  await saveCards(cards);
  return { ok: true };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function runAdvance() {
  const cards = await loadCards();
  const now = Date.now();
  const moved = { now: 0, next: 0 };
  const pull = (from, to) => {
    const limit = COLUMNS.find((c) => c.id === to).limit;
    let room = limit - cards.filter((c) => c.col === to).length;
    const queue = cards.filter((c) => c.col === from).sort((a, b) => a.savedAt - b.savedAt);
    for (const c of queue) {
      if (room <= 0) break;
      c.col = to;
      c.movedAt = now;
      room--;
      moved[to]++;
    }
  };
  for (let i = 0; i < 2; i++) {
    pull("next", "now");
    pull("later", "next");
  }
  if (moved.now || moved.next) await saveCards(cards);
  await kvSet("lastAdvance", todayStr());
  return moved;
}

async function runDailyAdvance() {
  const s = await loadSettings();
  if (!s.autoAdvance) return null;
  if ((await kvGet("lastAdvance", "")) === todayStr()) return null;
  const [h, m] = s.notifyTime.split(":").map(Number);
  const d = new Date();
  if (d.getHours() * 60 + d.getMinutes() < h * 60 + m) return null;
  return runAdvance();
}

async function runExpiry() {
  const s = await loadSettings();
  if (!s.autoExpire) return 0;
  const cards = await loadCards();
  const limit = s.expireDays * 86400000;
  const now = Date.now();
  const keep = cards.filter((c) => !(c.col === "later" && now - c.movedAt >= limit));
  const n = cards.length - keep.length;
  if (n) await saveCards(keep);
  return n;
}
