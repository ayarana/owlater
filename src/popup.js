const $ = (id) => document.getElementById(id);
let tab = null;

async function fillColumns() {
  const cards = await loadCards();
  const sel = $("col");
  for (const col of COLUMNS) {
    const n = cards.filter((c) => c.col === col.id).length;
    const full = col.limit !== null && n >= col.limit;
    const opt = document.createElement("option");
    opt.value = col.id;
    opt.disabled = full;
    opt.textContent = col.limit !== null ? `${col.name} (${n}/${col.limit}${full ? ", full" : ""})` : col.name;
    sel.append(opt);
  }
  sel.value = "later";
}

function colName() {
  return COLUMNS.find((c) => c.id === $("col").value).name;
}

function updateButton() {
  $("save").textContent = `Save to "${colName()}"`;
}

(async () => {
  applyTheme((await loadSettings()).theme);
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  $("title").textContent = tab?.title || "(untitled)";
  $("url").textContent = tab?.url || "";
  await fillColumns();
  updateButton();
  if (!tab?.url || !/^https?:/.test(tab.url)) {
    $("save").disabled = true;
    $("msg").textContent = "This page can't be saved.";
  }
})();

$("col").addEventListener("change", updateButton);

$("save").addEventListener("click", async () => {
  const col = $("col").value;
  const res = await addCard(tab.url, tab.title, $("note").value, col);
  if (res.ok) {
    $("msg").textContent = `Saved to "${colName()}".`;
    $("save").disabled = true;
    $("note").disabled = true;
    $("col").disabled = true;
  } else if (res.duplicate) {
    $("msg").textContent = "You already saved this link.";
  } else if (res.full) {
    $("msg").textContent = `"${colName()}" is full. Pick another column.`;
  } else {
    $("msg").textContent = "Couldn't save.";
  }
});

$("board").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("board.html") });
  window.close();
});
