/* =========================================================
   CHOPA TECH — App shell + view renderer (vanilla JS, no framework)
   ========================================================= */
const fmtTZS = (n) => "TSH " + Number(n || 0).toLocaleString("en-US");
const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; };
const qs = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------------------------------------------------------
   Guard: require a session token (in demo mode we seed one)
   --------------------------------------------------------- */
(function ensureSession() {
  if (!localStorage.getItem("chopa_token")) {
    // Demo convenience only — production build must redirect to /login.
    localStorage.setItem("chopa_token", "demo-session");
    localStorage.setItem("chopa_user", JSON.stringify(DEMO.currentUser));
  }
})();

const NAV = [
  { groupKey: "nav_group_main", items: [
    { id: "dashboard", key: "nav_dashboard", icon: "dashboard" },
  ]},
  { groupKey: "nav_group_operations", items: [
    { id: "sms", key: "nav_sms", icon: "sms" },
    { id: "endusers", key: "nav_endusers", icon: "users" },
    { id: "plans", key: "nav_plans", icon: "plans" },
  ]},
  { groupKey: "nav_group_billing", items: [
    { id: "transactions", key: "nav_transactions", icon: "wallet" },
    { id: "invoices", key: "nav_invoices", icon: "invoice" },
    { id: "sessions", key: "nav_sessions", icon: "clock" },
    { id: "vouchers", key: "nav_vouchers", icon: "ticket" },
    { id: "routerstatus", key: "nav_routerstatus", icon: "router" },
  ]},
  { groupKey: "nav_group_network", items: [
    { id: "routermanager", key: "nav_routermanager", icon: "router" },
    { id: "smartsetup", key: "nav_smartsetup", icon: "wand", badge: { text: "NEW", cls: "new" } },
    { id: "radius", key: "nav_radius", icon: "radius", badge: { text: "SOON", cls: "soon" } },
    { id: "accesspoint", key: "nav_accesspoint", icon: "ap" },
    { id: "pppoe", key: "nav_pppoe", icon: "pppoe" },
  ]},
  { groupKey: "nav_group_insights", items: [
    { id: "reports", key: "nav_reports", icon: "report" },
    { id: "paymentsettings", key: "nav_paymentsettings", icon: "payment" },
    { id: "gateways", key: "nav_gateways", icon: "gateway" },
  ]},
  { groupKey: "nav_group_experience", items: [
    { id: "portal", key: "nav_portal", icon: "palette" },
  ]},
  { groupKey: "nav_group_admin", items: [
    { id: "staff", key: "nav_staff", icon: "staff" },
    { id: "profile", key: "nav_profile", icon: "settings" },
    { id: "system", key: "nav_system", icon: "settings" },
    { id: "upgrade", key: "nav_upgrade", icon: "upgrade", badge: { text: "NEW", cls: "new" } },
    { id: "maintenance", key: "nav_maintenance", icon: "wrench" },
  ]},
];

const VIEW_IDS = ["dashboard","sms","endusers","plans","transactions","invoices","sessions","vouchers","routerstatus","routermanager","smartsetup","radius","accesspoint","pppoe","reports","paymentsettings","gateways","portal","staff","profile","system","upgrade","maintenance"];

function renderShell() {
  const user = JSON.parse(localStorage.getItem("chopa_user") || "{}");
  const lang = getLang();
  document.body.insertAdjacentHTML("afterbegin", `
    <div class="app-shell" id="appShell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <div class="dot">CT</div>
          <div><div class="name">CHOPA TECH</div><div class="tag">${t("tagline")}</div></div>
        </div>
        <nav class="sidebar-scroll" id="sidebarNav"></nav>
        <div class="sidebar-foot">
          <div class="plan-card">
            <b>${DEMO.kpis.servicePlan}</b>
            <p>${t("plan_card_sub")}</p>
            <button class="btn btn-primary btn-sm btn-block" data-nav="upgrade">${t("upgrade_plan")}</button>
          </div>
        </div>
      </aside>
      <div>
        <header class="topbar">
          <button class="collapse-btn" id="collapseBtn">${ICON("menu")}</button>
          <div class="topbar-title">
            <div id="pageTitle">Dashboard</div>
            <div class="datestamp" id="clockLine"></div>
          </div>
          <div class="topbar-search">
            ${ICON("search")}
            <input placeholder="${t("search_placeholder")}" />
          </div>
          <div class="topbar-right">
            <div class="router-select-pill" id="routerPill"><span class="dot-status"></span> ${t("all_routers")} ${ICON("chevronDown")}</div>
            <span class="topbar-divider"></span>
            <div class="icon-cluster">
              <button class="icon-btn" id="langBtn" title="${t("language")}">${lang.toUpperCase()}</button>
              <div class="dropdown">
                <button class="icon-btn" id="notifBtn">${ICON("bell")}<span class="ping" id="notifCount">4</span></button>
                <div class="dropdown-panel" id="notifPanel"><h4>${t("notifications")}</h4><div id="notifList"></div></div>
              </div>
              <button class="icon-btn" id="themeBtn" title="Toggle theme">${ICON("moon")}</button>
            </div>
            <span class="topbar-divider"></span>
            <div class="dropdown">
              <div class="user-chip" id="userChipBtn">
                <div class="av">${(user.name||"CT").split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
                <div class="meta"><b>${user.name||"Chopa Admin"}</b><span>${(user.role||"ADMIN").replace("_"," ")}</span></div>
                ${ICON("chevronDown")}
              </div>
              <div class="dropdown-panel" id="userPanel">
                <div class="menu-link" data-nav="profile">${ICON("settings")} ${t("profile_settings")}</div>
                <div class="menu-link" data-nav="system">${ICON("settings")} ${t("system_settings")}</div>
                <div class="menu-sep"></div>
                <div class="menu-link" id="logoutLink">${ICON("logout")} ${t("log_out")}</div>
              </div>
            </div>
          </div>
        </header>
        <main class="content" id="content"></main>
      </div>
    </div>
    <div class="toast-region" id="toastRegion"></div>
  `);

  // sidebar nav
  const nav = qs("#sidebarNav");
  NAV.forEach(group => {
    nav.insertAdjacentHTML("beforeend", `<div class="nav-group-label">${t(group.groupKey)}</div>`);
    group.items.forEach(item => {
      nav.insertAdjacentHTML("beforeend", `
        <div class="nav-item" data-nav="${item.id}">
          ${ICON(item.icon)}<span class="label">${t(item.key)}</span>
          ${item.badge ? `<span class="badge-tag ${item.badge.cls}">${item.badge.text}</span>` : ""}
        </div>`);
    });
  });

  qsa("[data-nav]").forEach(n => n.addEventListener("click", () => goTo(n.dataset.nav)));
  qs("#collapseBtn").addEventListener("click", () => qs("#appShell").classList.toggle("collapsed"));
  qs("#themeBtn").addEventListener("click", toggleTheme);
  qs("#langBtn").addEventListener("click", () => setLanguage(getLang() === "en" ? "sw" : "en"));
  qs("#notifBtn").addEventListener("click", (e) => { e.stopPropagation(); togglePanel("notifPanel"); });
  qs("#userChipBtn").addEventListener("click", (e) => { e.stopPropagation(); togglePanel("userPanel"); });
  qs("#logoutLink").addEventListener("click", () => { localStorage.removeItem("chopa_token"); location.href = "login.html"; });
  document.addEventListener("click", () => qsa(".dropdown-panel.open").forEach(p => p.classList.remove("open")));

  loadNotifications();
  tickClock();
  setInterval(tickClock, 30000);

  const savedTheme = localStorage.getItem("chopa_theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  qs("#themeBtn").innerHTML = ICON(savedTheme === "light" ? "sun" : "moon");
}

function togglePanel(id) {
  const p = qs("#" + id);
  const wasOpen = p.classList.contains("open");
  qsa(".dropdown-panel.open").forEach(x => x.classList.remove("open"));
  if (!wasOpen) p.classList.add("open");
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", cur);
  localStorage.setItem("chopa_theme", cur);
  qs("#themeBtn").innerHTML = ICON(cur === "light" ? "sun" : "moon");
}

function tickClock() {
  const d = new Date();
  qs("#clockLine").textContent = d.toLocaleString("en-GB", { weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " · Africa/Dar_es_Salaam";
}

function toast(title, body, tone = "success") {
  const region = qs("#toastRegion");
  const iconName = { success: "check", error: "x", warn: "alert" }[tone] || "check";
  const node = el(`<div class="toast ${tone}">${ICON(iconName)}<div><b>${title}</b><p>${body}</p></div></div>`);
  region.appendChild(node);
  setTimeout(() => node.remove(), 4200);
}

async function loadNotifications() {
  const { data } = await Api.notifications();
  const toneColor = { good: "var(--green)", warn: "var(--amber)", bad: "var(--red)", info: "var(--violet)", brand: "var(--signal)" };
  const toneDim = { good: "var(--green-dim)", warn: "var(--amber-dim)", bad: "var(--red-dim)", info: "var(--violet-dim)", brand: "var(--signal-dim)" };
  qs("#notifList").innerHTML = data.map(n => `
    <div class="notif-item">
      <div class="ico" style="background:${toneDim[n.tone] || toneDim.brand};color:${toneColor[n.tone] || toneColor.brand};">${ICON(n.icon)}</div>
      <div><b>${n.title}</b><p>${n.body} · ${n.time}</p></div>
    </div>`).join("");
}

/* ---------------------------------------------------------
   Router / view switching
   --------------------------------------------------------- */
const VIEW_BUILDERS = {}; // populated by views.js

function goTo(id) {
  if (!VIEW_IDS.includes(id)) return;
  location.hash = id;
}

async function renderView(id) {
  if (!VIEW_IDS.includes(id)) id = "dashboard";
  qsa(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.nav === id));
  const [title, subtitle] = tView(id);
  qs("#pageTitle").textContent = title;

  const content = qs("#content");
  content.innerHTML = `
    <div class="page-head">
      <div><h1>${title}</h1><p>${subtitle}</p></div>
      <div class="actions" id="pageActions"></div>
    </div>
    <div id="viewBody">${skeletonBlock()}</div>
  `;

  const builder = VIEW_BUILDERS[id] || VIEW_BUILDERS.placeholder;
  try {
    await builder();
  } catch (e) {
    qs("#viewBody").innerHTML = `<div class="card empty-state">${ICON("alert", "")}<h4>Something went wrong</h4><p>${e.message}</p></div>`;
  }
}

function skeletonBlock() {
  return `<div class="card"><div class="skeleton skel-row" style="width:40%"></div><div class="skeleton skel-row" style="width:90%"></div><div class="skeleton skel-row" style="width:70%"></div><div class="skeleton skel-row" style="width:85%"></div></div>`;
}

function mockFlag(mock) {
  return ""; // demo-data banner intentionally suppressed in the UI
}

window.addEventListener("hashchange", () => renderView(location.hash.slice(1)));

document.addEventListener("DOMContentLoaded", () => {
  renderShell();
  renderView(location.hash.slice(1) || "dashboard");
});
