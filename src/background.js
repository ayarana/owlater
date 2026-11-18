importScripts("storage.js");

const ALARM = "daily-reading";

async function updateBadge() {
  const cards = await loadCards();
  const n = cards.filter((c) => c.col === "now").length;
  await chrome.action.setBadgeText({ text: n ? String(n) : "" });
  await chrome.action.setBadgeBackgroundColor({ color: "#dc2626" });
}

async function scheduleAlarm() {
  const s = await loadSettings();
  await chrome.alarms.clear(ALARM);
  if (!s.notify && !s.autoAdvance) return;
  const [h, m] = s.notifyTime.split(":").map(Number);
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 1);
  chrome.alarms.create(ALARM, { when: next.getTime(), periodInMinutes: 24 * 60 });
}

async function notifyDaily() {
  const cards = await loadCards();
  const by = (col) => cards.filter((c) => c.col === col).sort((a, b) => a.savedAt - b.savedAt);
  const now = by("now");
  let title, message;
  if (now.length) {
    title = "Time to read";
    message = now[0].title + (now.length > 1 ? ` (+${now.length - 1} more in "Now")` : "");
  } else {
    const pick = by("next")[0] || by("later")[0];
    if (!pick) return;
    title = "How about reading something today?";
    message = pick.title;
  }
  chrome.notifications.create("daily", {
    type: "basic",
    iconUrl: "icons/icon128.png",
    title,
    message,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== ALARM) return;
  const s = await loadSettings();
  await runDailyAdvance();
  await runExpiry();
  if (s.notify) await notifyDaily();
});

chrome.notifications.onClicked.addListener((id) => {
  chrome.tabs.create({ url: chrome.runtime.getURL("board.html") });
  chrome.notifications.clear(id);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.cards) updateBadge();
  if (changes.settings) scheduleAlarm();
});

async function init() {
  await runDailyAdvance();
  await runExpiry();
  await updateBadge();
  await scheduleAlarm();
}
chrome.runtime.onStartup.addListener(init);
chrome.runtime.onInstalled.addListener(init);
