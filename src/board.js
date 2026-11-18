const $ = (id) => document.getElementById(id);

const ICONS = {
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  "chevrons-right": '<path d="m6 17 5-5-5-5"/><path d="m13 17 5-5-5-5"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  "sliders-horizontal": '<line x1="21" x2="14" y1="4" y2="4"/><line x1="10" x2="3" y1="4" y2="4"/><line x1="21" x2="12" y1="12" y2="12"/><line x1="8" x2="3" y1="12" y2="12"/><line x1="21" x2="16" y1="20" y2="20"/><line x1="12" x2="3" y1="20" y2="20"/><line x1="14" x2="14" y1="2" y2="6"/><line x1="8" x2="8" y1="10" y2="14"/><line x1="16" x2="16" y1="18" y2="22"/>',
  "file-text": '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  coffee:'<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
  "book-open": '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  "trash-2":'<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
};

function icon(name) {
  const span = document.createElement("span");
  span.className = "icon";
  span.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  return span;
}
document.querySelectorAll("[data-icon]").forEach((b) => b.prepend(icon(b.dataset.icon)));

let cards = [];
let settings = { ...DEFAULT_SETTINGS };
let dragId = null;
const openNotes = new Set();

function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"), 3000);
}

function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

const canDelete = (c) => !settings.strict || c.col === "now";
const canMarkRead = (c) => !settings.strict || c.col === "now";
const DELETE_LOCKED_MSG = 'Commitment mode: you can only delete cards in "Now".';
const READ_LOCKED_MSG = 'Commitment mode: you can only mark as read what is in "Now".';

function confirmDelete(c) {
  const note = c.note ? "\n\nYour note on this link will be lost too." : "";
  return confirm(`Delete this link permanently?\n\n${c.title}${note}\n\nThis can't be undone.`);
}

function lockButton(btn, msg) {
  btn.disabled = true;
  btn.title = msg;
  btn.style.opacity = ".35";
  btn.style.cursor = "not-allowed";
}

const ageDays = (card) => Math.floor((Date.now() - card.movedAt) / 86400000);
const ageLabel = (d) => (d === 0 ? "today" : d === 1 ? "1 day ago" : `${d} days ago`);

async function persist() {
  await saveCards(cards);
  render();
}

const COL_ICON = { now: "coffee", next: "book-open", later: "moon", read: "leaf" };

const EMPTY_MSG = {
  now: "Pick something and settle in",
  next: "What's coming up next goes here",
  later: "Drop links here, no rush",
  read: "Finished things land here",
};

function render() {
  const board = $("board");
  board.replaceChildren();

  for (const col of COLUMNS) {
    const items = cards
      .filter((c) => c.col === col.id)
      .sort((a, b) => (col.id === "read" ? b.movedAt - a.movedAt : a.savedAt - b.savedAt));

    const el = document.createElement("section");
    el.className = "column";
    el.dataset.col = col.id;

    const full = col.limit !== null && items.length >= col.limit;
    const h = document.createElement("h2");
    const badge = icon(COL_ICON[col.id] || "bookmark");
    badge.classList.add("col-icon");
    h.append(badge, col.name);
    const count = document.createElement("span");
    count.className = "count" + (full ? " full" : "");
    count.textContent = col.limit !== null ? `${items.length}/${col.limit}` : items.length;
    h.append(count);

    const hint = document.createElement("p");
    hint.className = "hint";
    hint.textContent =
      col.id === "later"
        ? settings.autoExpire
          ? `Deleted after ${settings.expireDays} days`
          : "No rush"
        : col.hint;
    el.append(h, hint);

    if (!items.length) {
      const e = document.createElement("div");
      e.className = "empty";
      e.textContent = EMPTY_MSG[col.id] || "empty";
      el.append(e);
    }
    for (const c of items) el.append(renderCard(c, col));

    el.addEventListener("dragover", (ev) => { ev.preventDefault(); el.classList.add("over"); });
    el.addEventListener("dragleave", () => el.classList.remove("over"));
    el.addEventListener("drop", (ev) => { ev.preventDefault(); el.classList.remove("over"); moveCard(dragId, col.id); });

    board.append(el);
  }
}

function renderCard(c, col) {
  const d = ageDays(c);
  const el = document.createElement("div");
  el.className = "card" + (col.id === "later" && d >= settings.expireDays ? " old" : "");
  el.draggable = true;
  el.addEventListener("dragstart", () => { dragId = c.id; el.classList.add("dragging"); });
  el.addEventListener("dragend", () => el.classList.remove("dragging"));

  const a = document.createElement("a");
  a.href = c.url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.textContent = c.title;

  const dom = document.createElement("div");
  dom.className = "domain";
  dom.textContent = domainOf(c.url);
  el.append(a, dom);

  if (openNotes.has(c.id)) {
    const ta = document.createElement("textarea");
    ta.rows = 3;
    ta.value = c.note || "";
    ta.placeholder = "What caught your interest? What did you learn?";
    let timer;
    const save = () => { clearTimeout(timer); c.note = ta.value.trim(); saveCards(cards); };
    ta.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(save, 600); });
    ta.addEventListener("blur", save);
    el.append(ta);
    queueMicrotask(() => ta.focus());
  } else if (c.note) {
    const p = document.createElement("div");
    p.className = "note-preview";
    p.textContent = c.note;
    p.title = "Click to edit";
    p.addEventListener("click", () => { openNotes.add(c.id); render(); });
    el.append(p);
  }

  const meta = document.createElement("div");
  meta.className = "meta";
  const age = document.createElement("span");
  age.className = "age";
  age.textContent = ageLabel(d);

  const tools = document.createElement("div");
  tools.className = "tools";
  const noteBtn = document.createElement("button");
  noteBtn.append(icon("file-text"));
  noteBtn.setAttribute("aria-label", "Note");
  noteBtn.title = "Note";
  if (c.note) noteBtn.classList.add("has-note");
  noteBtn.addEventListener("click", () => {
    openNotes.has(c.id) ? openNotes.delete(c.id) : openNotes.add(c.id);
    render();
  });
  const del = document.createElement("button");
  del.className = "del";
  del.title = "Delete";
  del.append(icon("trash-2"));
  del.setAttribute("aria-label", "Delete");
  if (!canDelete(c)) lockButton(del, DELETE_LOCKED_MSG);
  del.addEventListener("click", () => {
    if (!canDelete(c)) return toast(DELETE_LOCKED_MSG);
    if (!confirmDelete(c)) return;
    cards = cards.filter((x) => x.id !== c.id);
    persist();
  });
  if (col.id !== "read") {
    const read = document.createElement("button");
    read.append(icon("check"), " Read");
    read.title = "Mark as read";
    if (!canMarkRead(c)) lockButton(read, READ_LOCKED_MSG);
    read.addEventListener("click", () => moveCard(c.id, "read"));
    tools.append(read);
  }
  tools.append(noteBtn, del);

  meta.append(age, tools);
  el.append(meta);
  return el;
}

function moveCard(id, colId) {
  const card = cards.find((c) => c.id === id);
  if (!card || card.col === colId) return;
  const col = COLUMNS.find((c) => c.id === colId);
  if (colId === "read" && !canMarkRead(card)) { toast(READ_LOCKED_MSG); return; }
  const inCol = cards.filter((c) => c.col === colId).length;
  if (col.limit !== null && inCol >= col.limit) {
    toast(`"${col.name}" is full (${col.limit}). Read or move something first.`);
    return;
  }
  card.col = colId;
  card.movedAt = Date.now();
  persist();
}

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
const today = () => new Date().toISOString().slice(0, 10);

$("export-json").addEventListener("click", () => {
  const data = { app: "owlater", version: 1, exportedAt: new Date().toISOString(), cards };
  download(`owlater-${today()}.json`, JSON.stringify(data, null, 2), "application/json");
});

$("import").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async (ev) => {
  const file = ev.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.cards;
    if (!Array.isArray(list)) throw new Error();
    const validCols = new Set(COLUMNS.map((c) => c.id));
    const known = new Set(cards.map((c) => c.url));
    const valid = list
      .filter((c) => c && typeof c.url === "string")
      .map((c) => ({ ...c, col: normalizeColumn(c.col) }))
      .filter((c) => validCols.has(c.col) && !known.has(c.url));
    cards = cards.concat(valid.map((c) => ({
      id: newId(), url: c.url, title: String(c.title || c.url), note: String(c.note || ""), col: c.col,
      savedAt: Number(c.savedAt) || Date.now(), movedAt: Number(c.movedAt) || Date.now(),
    })));
    await persist();
    toast(`${valid.length} link(s) imported.`);
  } catch {
    toast("Invalid file.");
  }
  ev.target.value = "";
});

function advanceMsg(m) {
  const parts = [];
  if (m.now) parts.push(`${m.now} to Now`);
  if (m.next) parts.push(`${m.next} to Next`);
  return parts.join(" and ");
}

$("advance").addEventListener("click", async () => {
  const m = await runAdvance();
  cards = await loadCards();
  render();
  toast(m.now || m.next ? `Queue advanced: ${advanceMsg(m)}.` : "Nothing to advance: the target columns are full or there are no cards to move up.");
});

$("add-manual").addEventListener("click", async () => {
  const url = prompt("Paste the link:");
  if (!url) return;
  try { new URL(url); } catch { return toast("Invalid link."); }
  const res = await addCard(url.trim(), url.trim());
  if (!res.ok) return toast("That link is already on the board.");
  cards = await loadCards();
  render();
});

const hasAlarms = typeof chrome !== "undefined" && chrome.alarms;

function renderThemePicker() {
  const box = $("theme-picker");
  box.replaceChildren();
  for (const t of THEMES) {
    const b = document.createElement("button");
    b.className = "theme-btn";
    b.setAttribute("aria-pressed", String(t.id === settings.theme));
    const sw = document.createElement("span");
    sw.className = "swatch";
    for (const c of t.colors) {
      const dot = document.createElement("i");
      dot.style.background = c;
      sw.append(dot);
    }
    b.append(sw, t.name);
    b.addEventListener("click", async () => {
      settings = { ...settings, theme: t.id };
      await saveSettings(settings);
      fillSettings();
    });
    box.append(b);
  }
}

function fillSettings() {
  applyTheme(settings.theme);
  renderThemePicker();
  $("s-expire").checked = settings.autoExpire;
  $("s-days").value = settings.expireDays;
  $("s-notify").checked = settings.notify;
  $("s-time").value = settings.notifyTime;
  $("s-strict").checked = settings.strict;
  $("s-advance").checked = settings.autoAdvance;
  if (!hasAlarms) {
    $("s-notify").disabled = true;
    $("notify-hint").textContent = "Reminders only work with the installed extension.";
  }
}

const settingsOpen = () => $("settings").classList.contains("open");
function setSettingsOpen(open) {
  const s = $("settings");
  s.classList.toggle("open", open);
  s.inert = !open;
  s.setAttribute("aria-hidden", String(!open));
}
$("toggle-settings").addEventListener("click", () => setSettingsOpen(!settingsOpen()));
$("close-settings").addEventListener("click", () => setSettingsOpen(false));

async function onSettingsChange() {
  const days = Math.min(365, Math.max(1, parseInt($("s-days").value, 10) || DEFAULT_SETTINGS.expireDays));
  const next = {
    autoExpire: $("s-expire").checked,
    expireDays: days,
    notify: $("s-notify").checked,
    notifyTime: $("s-time").value || DEFAULT_SETTINGS.notifyTime,
    strict: $("s-strict").checked,
    autoAdvance: $("s-advance").checked,
    theme: settings.theme,
  };
  if (next.autoExpire && (!settings.autoExpire || next.expireDays < settings.expireDays)) {
    const n = cards.filter((c) => c.col === "later" && ageDays(c) >= next.expireDays).length;
    const msg =
      `Hardcore mode: cards sitting in "Later" for ${next.expireDays} days will be PERMANENTLY DELETED.` +
      (n ? `\n\nThis deletes ${n} card(s) right now.` : "") +
      "\n\nTurn it on?";
    if (!confirm(msg)) { fillSettings(); return; }
  }
  settings = next;
  await saveSettings(settings);
  if (settings.autoExpire) {
    const n = await runExpiry();
    if (n) { cards = await loadCards(); toast(`${n} card(s) deleted by expiry.`); }
  }
  render();
}
for (const id of ["s-expire", "s-days", "s-notify", "s-time", "s-strict", "s-advance"]) $(id).addEventListener("change", onSettingsChange);

function closeSettings() { setSettingsOpen(false); }
function closeNotes() {
  if (!openNotes.size) return;
  openNotes.clear();
  render();
}
document.addEventListener("click", (ev) => {
  const t = ev.target;
  if (!(t instanceof Element) || !t.isConnected) return;
  if (settingsOpen() && !t.closest("#settings, #toggle-settings")) closeSettings();
  if (!t.closest("textarea")) closeNotes();
});
document.addEventListener("keydown", (ev) => {
  if (ev.key !== "Escape") return;
  closeSettings();
  closeNotes();
});

if (hasChromeStorage) {
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== "local") return;
    if (ch.settings) { settings = { ...DEFAULT_SETTINGS, ...ch.settings.newValue }; fillSettings(); render(); }
    if (ch.cards) {
      const incoming = ch.cards.newValue || [];
      if (JSON.stringify(incoming) !== JSON.stringify(cards)) { cards = incoming; render(); }
    }
  });
}

(async () => {
  settings = await loadSettings();
  const adv = await runDailyAdvance();
  const n = await runExpiry();
  cards = await loadCards();
  fillSettings();
  render();
  if (adv && (adv.now || adv.next)) toast(`Today's queue: ${advanceMsg(adv)}.`);
  else if (n) toast(`${n} card(s) deleted by expiry.`);
})();
