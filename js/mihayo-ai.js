/* =========================================================
   MIHAYO'S SAFARIS — mihayo-ai.js
   "Mihayo AI" — a keyword-matched tourism concierge widget.
   IMPORTANT (read before wiring to production): this runs
   entirely client-side against a hand-written knowledge base
   in js/translations.js (keys prefixed "ai."). It is NOT
   connected to a real LLM — there's no backend here to call
   one safely (that needs a server to hold an API key). It's
   built to be swapped out later: replace `matchIntent()` +
   `getAnswer()` below with a fetch() to your own backend
   endpoint that calls an LLM, and keep the UI exactly as is.
   ========================================================= */

const AI_LOGO = "images/mihayo-ai-mascot.png";

/* Keyword -> intent map, checked across all 4 languages so guests
   can type in whichever language they're already using. */
const AI_INTENTS = [
  { id: "bestTime", answerKey: "ai.a.bestTime", keywords: ["best time", "when to visit", "season", "wakati mzuri", "msimu", "mejor época", "meilleure période", "quand visiter", "saison"] },
  { id: "kili", answerKey: "ai.a.kili", keywords: ["kilimanjaro", "climb", "route", "summit", "machame", "lemosho", "marangu", "panda mlima", "njia", "escalar", "ruta", "grimper", "itinéraire"] },
  { id: "prices", answerKey: "ai.a.prices", keywords: ["price", "cost", "how much", "budget", "bei", "gharama", "precio", "costo", "cuánto", "prix", "coût", "combien"] },
  { id: "zanzibar", answerKey: "ai.a.zanzibar", keywords: ["zanzibar", "beach", "nungwi", "paje", "stone town", "fukwe", "playa", "plage"] },
  { id: "packing", answerKey: "ai.a.packing", keywords: ["pack", "wear", "clothes", "bring", "kufunga", "nguo", "empacar", "ropa", "emporter", "vêtements"] },
  { id: "migration", answerKey: "ai.a.migration", keywords: ["migration", "wildebeest", "river crossing", "uhamiaji", "migración", "migration"] },
  { id: "weather", answerKey: "ai.a.weather", keywords: ["weather", "temperature", "rain", "climate", "hali ya hewa", "clima", "météo", "temps"] },
  { id: "human", answerKey: "ai.a.human", keywords: ["human", "person", "agent", "call", "whatsapp", "mtu", "persona", "personne", "appeler"] },
];

function aiMatchIntent(text) {
  const t = text.toLowerCase();
  for (const intent of AI_INTENTS) {
    if (intent.keywords.some(k => t.includes(k))) return intent;
  }
  return null;
}

function aiT(key) {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS[DEFAULT_LANG];
  return (dict && dict[key]) || (TRANSLATIONS[DEFAULT_LANG][key]) || key;
}

function aiScrollToBottom() {
  const box = document.getElementById("aiMessages");
  if (box) box.scrollTop = box.scrollHeight;
}

function aiAddMessage(role, text) {
  const box = document.getElementById("aiMessages");
  if (!box) return;
  const row = document.createElement("div");
  row.className = `ai-msg ${role}`;
  if (role === "bot") {
    row.innerHTML = `<div class="ai-msg-avatar"><img src="${AI_LOGO}" alt=""></div><div class="ai-msg-bubble"></div>`;
  } else {
    row.innerHTML = `<div class="ai-msg-bubble"></div>`;
  }
  row.querySelector(".ai-msg-bubble").textContent = text;
  box.appendChild(row);
  aiScrollToBottom();
}

function aiShowTyping() {
  const box = document.getElementById("aiMessages");
  if (!box) return;
  const row = document.createElement("div");
  row.className = "ai-msg bot ai-typing";
  row.id = "aiTypingRow";
  row.innerHTML = `<div class="ai-msg-avatar"><img src="${AI_LOGO}" alt=""></div><div class="ai-msg-bubble"><span></span><span></span><span></span></div>`;
  box.appendChild(row);
  aiScrollToBottom();
}
function aiHideTyping() {
  const row = document.getElementById("aiTypingRow");
  if (row) row.remove();
}

function aiRespond(userText) {
  aiAddMessage("user", userText);
  aiShowTyping();
  const intent = aiMatchIntent(userText);
  setTimeout(() => {
    aiHideTyping();
    if (intent) {
      aiAddMessage("bot", aiT(intent.answerKey));
      if (intent.id === "weather") {
        setTimeout(() => { if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/" ) document.getElementById("weatherWheel") && document.getElementById("weatherWheel").scrollIntoView({behavior:"smooth", block:"center"}); }, 400);
      }
      if (intent.id === "human") {
        setTimeout(() => { window.location.href = "contact.html"; }, 1200);
      }
    } else {
      aiAddMessage("bot", aiT("ai.a.fallback"));
    }
  }, 700 + Math.random() * 500);
}

function aiInit() {
  const fab = document.getElementById("aiFab");
  const panel = document.getElementById("aiPanel");
  const closeBtn = document.getElementById("aiCloseBtn");
  const sendBtn = document.getElementById("aiSendBtn");
  const input = document.getElementById("aiInput");
  if (!fab || !panel) return;

  const openPanel = () => {
    panel.classList.add("open");
    fab.classList.add("ai-fab-hide");
    if (!panel.dataset.greeted) {
      panel.dataset.greeted = "1";
      setTimeout(() => aiAddMessage("bot", aiT("ai.greeting")), 300);
    }
  };
  const closePanel = () => {
    panel.classList.remove("open");
    fab.classList.remove("ai-fab-hide");
  };

  fab.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);

  document.querySelectorAll(".ai-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      const label = chip.textContent;
      const intentId = chip.getAttribute("data-intent");
      const forcedIntent = AI_INTENTS.find(i => i.id === intentId);
      aiAddMessage("user", label);
      aiShowTyping();
      setTimeout(() => {
        aiHideTyping();
        aiAddMessage("bot", aiT(forcedIntent ? forcedIntent.answerKey : "ai.a.fallback"));
        if (intentId === "human") setTimeout(() => { window.location.href = "contact.html"; }, 1200);
      }, 700);
    });
  });

  const send = () => {
    const val = input.value.trim();
    if (!val) return;
    input.value = "";
    aiRespond(val);
  };
  sendBtn.addEventListener("click", send);
  input.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
}

document.addEventListener("DOMContentLoaded", aiInit);
