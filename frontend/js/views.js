/* =========================================================
   CHOPA TECH — view builders
   Each function renders into #viewBody (and optionally #pageActions)
   ========================================================= */

function statusBadge(status) {
  const map = {
    ONLINE: "good", ACTIVE: "good", SUCCESS: "good", PAID: "good", AVAILABLE: "info",
    OFFLINE: "bad", ERROR: "bad", FAILED: "bad", EXPIRED: "bad", DISABLED: "neutral",
    PENDING: "warn", CONNECTING: "warn", USED: "neutral", CANCELLED: "bad", REFUNDED: "info",
  };
  return `<span class="badge badge-${map[status] || "neutral"}">${status}</span>`;
}

/* ---------------- DASHBOARD ---------------- */
const AVATAR_PALETTE = ["#3E6DF3", "#38B978", "#E1A13B", "#9B7FE8", "#E15660", "#4FA8D8"];
function colorForName(name) { let h = 0; for (const c of (name || "?")) h = (h * 31 + c.charCodeAt(0)) >>> 0; return AVATAR_PALETTE[h % AVATAR_PALETTE.length]; }
function initials(name) { return (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase(); }
function avatarChip(name) { return `<div class="avatar" style="background:${colorForName(name)}" title="${name}">${initials(name)}</div>`; }
function avatarStack(names, max = 3) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return `<div class="avatar-stack">${shown.map(avatarChip).join("")}${extra > 0 ? `<div class="avatar" style="background:var(--panel-raised);color:var(--text-mid)">+${extra}</div>` : ""}</div>`;
}
function signalBars(strength, tone) { // strength 0-4
  return `<div class="sp-bars">${[0,1,2,3].map(i => `<i class="${i < strength ? "on" : ""}" style="height:${6 + i * 3}px${i < strength && tone ? `;background:${tone}` : ""}"></i>`).join("")}</div>`;
}
const CUSTOMER_POOL = ["Juma Hassan", "Neema K.", "Baraka M.", "Fatma S.", "Ismail Ally", "Grace Lyimo"];

VIEW_BUILDERS.dashboard = async function () {
  const [{ data, mock }, { data: txns }, { data: routers }] = await Promise.all([Api.dashboard(), Api.transactions(), Api.routers()]);
  const k = data.kpis;
  const goal = 20000;
  const pct = Math.min(100, Math.round((k.todayRevenue / goal) * 100));

  const ticker = [
    { label: t("dash_today_revenue"), value: fmtTZS(k.todayRevenue), delta: k.todayRevenueDelta, icon: "wallet", accent: "var(--signal)" },
    { label: t("dash_active_sessions"), value: k.activeSessions, delta: k.activeSessionsDelta, icon: "wifi", accent: "var(--green)" },
    { label: t("dash_pending_approvals"), value: k.pendingApprovals, delta: k.pendingApprovalsDelta, icon: "clock", accent: "var(--amber)" },
    { label: t("dash_this_month"), value: fmtTZS(k.monthRevenue), delta: k.monthRevenueDelta, icon: "report", accent: "var(--violet)" },
    { label: t("dash_routers_online"), value: `${k.routersConnected} / ${k.routersTotal}`, delta: null, icon: "router", accent: "var(--signal)" },
  ];

  const pendingTxns = txns.filter(t => t.status === "PENDING").concat(txns).slice(0, 5);

  qs("#viewBody").innerHTML = `
    ${mockFlag(mock)}
    <div class="ticker" style="margin-top:${mock ? "10px" : "0"}">
      ${ticker.map((t, i) => `
        <div class="ticker-seg ${i === 0 ? "feature" : ""}" style="--seg-accent:${t.accent}">
          <div>
            <div class="t-label">${ICON(t.icon)} ${t.label}</div>
            <div class="t-value">${t.value}</div>
            ${t.delta !== null ? `<div class="t-delta ${t.delta >= 0 ? "up" : "down"}">${t.delta >= 0 ? "+" : ""}${t.delta}%</div>` : `<div class="t-delta flat">live</div>`}
          </div>
          ${i === 0 ? `<div class="t-spark">${[40,55,35,60,48,70,pct].map(v => `<i data-anim="height" data-target="${Math.max(8, v)}%"></i>`).join("")}</div>` : ""}
        </div>`).join("")}
    </div>

    <div class="dash-grid" style="margin-top:14px">
      <div class="dash-main">
        <div class="grid grid-3">
          <div class="meter">
            <div class="card-title-row" style="margin-bottom:12px"><div class="head-ico">${ICON("wallet")}</div><h3 style="margin:0;font-size:13px;font-family:var(--font-display);font-weight:600">${t("dash_todays_collection")}</h3></div>
            <div class="meter-top"><span class="m-amount">${fmtTZS(k.todayRevenue)}</span><span class="m-goal">/ ${fmtTZS(goal)}</span></div>
            <div class="meter-track"><div class="meter-fill" data-anim="width" data-target="${pct}%"></div></div>
            <div class="meter-ticks"><span>0</span><span>${pct}% of goal</span><span>${fmtTZS(goal)}</span></div>
          </div>

          <div class="card">
            <div class="card-head"><div class="card-title-row"><div class="head-ico">${ICON("clock")}</div><h3>${t("dash_pending_approvals")}</h3></div><span class="link" data-nav="transactions">${t("dash_all")} ${ICON("chevronDown")}</span></div>
            ${pendingTxns.map((t, i) => `
              <div class="ledger-row">
                <span class="l-idx">${String(i + 1).padStart(2, "0")}</span>
                <div class="l-main"><b>${t.customer}</b><span>${t.plan}</span></div>
                <span class="l-value">${fmtTZS(t.amount)}</span>
              </div>`).join("")}
          </div>

          <div class="card">
            <div class="card-head"><div class="card-title-row"><div class="head-ico">${ICON("router")}</div><h3>${t("dash_router_signal")}</h3></div><span class="link" data-nav="routerstatus">${t("dash_all")} ${ICON("chevronDown")}</span></div>
            ${routers.slice(0, 3).map(r => `
              <div class="signal-panel-row ${r.status === "OFFLINE" || r.status === "ERROR" ? "is-down" : ""}">
                ${signalBars(r.status === "ONLINE" ? 4 : r.status === "ERROR" ? 1 : 0)}
                <div class="sp-main"><b>${r.name}</b><span>${statusBadge(r.status)}</span></div>
              </div>`).join("")}
          </div>
        </div>

        <div class="card card-flush" style="margin-top:14px">
          <div class="card-head" style="padding:16px 16px 0"><div class="card-title-row"><div class="head-ico">${ICON("wallet")}</div><h3>${t("dash_payment_approvals")}</h3></div><span class="link" data-nav="transactions" style="margin-right:16px">${t("dash_open_ledger")} ${ICON("chevronDown")}</span></div>
          <div style="padding:16px"><div class="ops-board">${renderApprovalsBoard(txns)}</div></div>
        </div>
      </div>

      <div class="dash-rail">
        <div class="card">
          <div class="card-head"><h3 style="font-size:13px">${t("dash_network_activity")}</h3><span class="badge badge-good">+8%</span></div>
          <div style="font-size:22px;font-weight:700;font-family:var(--font-display)">${Math.min(100, Math.round((k.activeSessions / 15) * 100))}%</div>
          <div style="font-size:11px;color:var(--text-low);margin-top:2px">Utilization this week</div>
          <div class="bars-mini" id="activityBars"></div>
        </div>

        <div class="card">
          <div class="card-head"><h3 style="font-size:13px">${t("dash_package_mix")}</h3><span class="link" data-nav="plans">${t("dash_manage")}</span></div>
          <div class="stack-bar">${data.planMix.map(p => `<div style="background:${p.color}" data-anim="width" data-target="${p.value}%"></div>`).join("")}</div>
          ${data.planMix.map(p => `<div class="legend-row"><span class="legend-dot" style="background:${p.color}"></span>${p.label}<b>${p.value}%</b></div>`).join("")}
        </div>

        <div class="card">
          <div class="card-head"><h3 style="font-size:13px">${t("dash_reminders")}</h3></div>
          <div class="timeline">
            <div class="timeline-item" style="--dot-color:var(--amber)"><div class="tl-time">09:30</div><b>SMS credits low</b><span>Top up before evening rush</span></div>
            <div class="timeline-item" style="--dot-color:var(--red)"><div class="tl-time">10:00</div><b>CHOPA CAFE offline</b><span>Check power / uplink</span></div>
            <div class="timeline-item" style="--dot-color:var(--green)"><div class="tl-time">16:15</div><b>Voucher batch review</b><span>100× 24 Hours, CHOPA SHOP</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
  qsa("[data-nav]", qs("#viewBody")).forEach(n => n.addEventListener("click", () => goTo(n.dataset.nav)));
  drawActivityBars();
  revealFills(qs("#viewBody"));
};

/** Sets deferred width/height fills to their real value on the next paint,
 * so bars/meters/sparklines grow in as one orchestrated reveal instead of
 * appearing static, and never fight the CSS transition by both existing at once. */
function revealFills(root) {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    qsa("[data-anim]", root).forEach(el => { el.style[el.dataset.anim] = el.dataset.target; });
  }));
}

function renderApprovalsBoard(txns) {
  const columns = [
    { key: "PENDING", title: "Pending" },
    { key: "SUCCESS", title: "Approved" },
    { key: "FAILED", title: "Failed" },
    { key: "REFUNDED", title: "Refunded" },
  ];
  return columns.map((col, ci) => {
    const items = txns.filter(t => t.status === col.key || (col.key === "REFUNDED" && t.status === "CANCELLED"));
    const filler = items.length ? items : txns.slice(0, 1);
    return `
      <div class="ops-col">
        <div class="ops-col-head"><span class="oc-title">${col.title}</span><span class="oc-count">${items.length}</span></div>
        ${filler.slice(0, 3).map((t, i) => {
          const prio = t.amount >= 5000 ? "high" : t.amount >= 1500 ? "medium" : "low";
          const names = [t.customer, CUSTOMER_POOL[(i + ci) % CUSTOMER_POOL.length]];
          return `
          <div class="ops-item">
            <div class="oi-top"><span class="priority-tag ${prio}">${prio}</span>${statusBadge(col.key)}</div>
            <p class="oi-name">${t.customer}</p>
            <p class="oi-sub">${t.plan} · ${fmtTZS(t.amount)}</p>
            <div class="oi-foot">
              ${avatarStack(names, 2)}
              <div class="oi-meta">${ICON("router")} ${t.router}</div>
            </div>
          </div>`;
        }).join("")}
      </div>`;
  }).join("");
}

function drawActivityBars() {
  const values = [92, 46, 68, 55, 88, 34, 20];
  const max = Math.max(...values);
  qs("#activityBars").innerHTML = values.map((v) => `
    <div class="bm-col">
      <div class="bm-track"><div class="bm-fill ${v === max ? "peak" : ""}" data-anim="height" data-target="${v}%"></div></div>
      <div class="bm-label">${v}</div>
    </div>`).join("");
}

function drawRevBars(series) {
  const max = Math.max(...series);
  const labels = series.length <= 7 ? ["M","T","W","T","F","S","S"] : series.map((_, i) => i % 5 === 0 ? i + 1 : "");
  qs("#revChart").innerHTML = `<div class="bar-chart">${series.map((v, i) => `
    <div class="bar-col">
      <div class="bar-track"><div class="bar-fill" style="height:${Math.max(6,(v / max) * 100)}%"></div></div>
      <div class="bar-label">${labels[i] || ""}</div>
    </div>`).join("")}</div>`;
}

function donutSVG(data) {
  const total = data.reduce((s, d) => s + d.value, 0);
  let acc = 0;
  const R = 46, C = 2 * Math.PI * R;
  const segs = data.map(d => {
    const frac = d.value / total;
    const dash = frac * C;
    const seg = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${d.color}" stroke-width="14" stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-acc}" stroke-linecap="round"/>`;
    acc += dash;
    return seg;
  }).join("");
  return `<svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg);flex:0 0 auto">${segs}</svg>`;
}

/* ---------------- ROUTER MANAGER / ROUTER STATUS ---------------- */
async function buildRouterList(showActions) {
  const { data, mock } = await Api.routers();
  qs("#pageActions").innerHTML = showActions ? `<button class="btn btn-primary btn-sm" id="addRouterBtn">${ICON("plus")} Add router</button>` : "";
  qs("#viewBody").innerHTML = `
    ${mockFlag(mock)}
    <div class="grid grid-2" style="margin-top:${mock?10:0}px">
      ${data.map(r => `
        <div class="card">
          <div class="card-head">
            <div>
              <h3 style="display:flex;align-items:center;gap:8px">${r.name} ${statusBadge(r.status)}</h3>
              <p style="margin:2px 0 0;color:var(--text-low);font-size:12px">${r.location}</p>
            </div>
            <div class="icon-wrap tone-brand" style="width:38px;height:38px">${ICON("router")}</div>
          </div>
          <div class="grid grid-4" style="gap:10px">
            <div><div class="cell-sub">Host</div><div class="mono">${r.host}:${r.port}</div></div>
            <div><div class="cell-sub">RouterOS</div><div class="cell-strong">${r.ver}</div></div>
            <div><div class="cell-sub">Uptime</div><div class="cell-strong">${r.uptime}</div></div>
            <div><div class="cell-sub">Users</div><div class="cell-strong">${r.users}</div></div>
          </div>
          <div class="grid grid-2" style="margin-top:12px;gap:10px">
            <div><div class="cell-sub" style="margin-bottom:4px">CPU ${r.cpu}%</div><div class="bar-track" style="height:8px"><div class="bar-fill" style="width:${r.cpu}%;height:100%"></div></div></div>
            <div><div class="cell-sub" style="margin-bottom:4px">RAM ${r.ram}%</div><div class="bar-track" style="height:8px"><div class="bar-fill" style="width:${r.ram}%;height:100%;background:var(--violet)"></div></div></div>
          </div>
          <div class="row-actions" style="margin-top:14px">
            <button class="btn btn-ghost btn-sm test-router" data-id="${r.id}">${ICON("refresh")} Test connection</button>
            <button class="btn btn-ghost btn-sm">${ICON("eye")} Details</button>
            <button class="btn btn-ghost btn-sm">${ICON("edit")} Edit</button>
          </div>
        </div>`).join("")}
    </div>`;
  qsa(".test-router").forEach(b => b.addEventListener("click", async () => {
    b.disabled = true; b.innerHTML = `${ICON("refresh")} Testing…`;
    const { data: res, mock: m } = await Api.testRouter(b.dataset.id);
    toast(res.ok ? "Connection OK" : "Connection failed", m ? res.message : "Router responded to API request.", res.ok ? "success" : "error");
    b.disabled = false; b.innerHTML = `${ICON("refresh")} Test connection`;
  }));
  if (showActions) qs("#addRouterBtn")?.addEventListener("click", () => openAddRouterModal());
}
VIEW_BUILDERS.routermanager = () => buildRouterList(true);
VIEW_BUILDERS.routerstatus = () => buildRouterList(false);

function openAddRouterModal() {
  openModal("Add MikroTik router", `
    <form id="addRouterForm">
      <div class="field"><label>Router name</label><input required placeholder="e.g. CHOPA BRANCH 03"/></div>
      <div class="grid grid-2" style="gap:12px">
        <div class="field"><label>Host / IP</label><input required placeholder="41.222.10.xx"/></div>
        <div class="field"><label>API port</label><input required value="8728"/></div>
      </div>
      <div class="grid grid-2" style="gap:12px">
        <div class="field"><label>Username</label><input required placeholder="api-user"/></div>
        <div class="field"><label>Password</label><input required type="password" placeholder="••••••••"/></div>
      </div>
      <div class="field"><label>Location</label><input placeholder="e.g. Mbezi, Dar es Salaam"/></div>
      <div class="field"><label class="checkbox-row"><input type="checkbox"/> Use API-SSL (recommended)</label></div>
      <p class="hint">Credentials are sent to the backend over HTTPS and encrypted at rest. They are never exposed to the browser after saving.</p>
    </form>
  `, [
    { label: "Cancel", cls: "btn-ghost", action: closeModal },
    { label: "Test & save router", cls: "btn-primary", action: async () => { closeModal(); toast("Router queued", "Backend will attempt a RouterOS API connection and report status.", "success"); } },
  ]);
}

/* ---------------- PLANS ---------------- */
VIEW_BUILDERS.plans = async function () {
  const { data, mock } = await Api.plans();
  qs("#pageActions").innerHTML = `<button class="btn btn-primary btn-sm" id="addPlanBtn">${ICON("plus")} New plan</button>`;
  qs("#viewBody").innerHTML = `
    ${mockFlag(mock)}
    <div class="grid grid-3" style="margin-top:${mock?10:0}px">
      ${data.map(p => `
        <div class="card">
          <div class="card-head"><h3>${p.name}</h3>${statusBadge(p.status)}</div>
          <div class="value" style="font-size:26px">${fmtTZS(p.price)}</div>
          <p style="color:var(--text-low);margin:2px 0 14px">${p.duration} validity</p>
          <div class="grid grid-2" style="gap:8px;font-size:12.5px">
            <div class="cell-sub">Download</div><div class="cell-strong" style="text-align:right">${p.down} Mbps</div>
            <div class="cell-sub">Upload</div><div class="cell-strong" style="text-align:right">${p.up} Mbps</div>
            <div class="cell-sub">Data cap</div><div class="cell-strong" style="text-align:right">${p.data}</div>
            <div class="cell-sub">Simultaneous users</div><div class="cell-strong" style="text-align:right">${p.users}</div>
            <div class="cell-sub">Router</div><div class="cell-strong" style="text-align:right">${p.router}</div>
          </div>
          <div class="row-actions" style="margin-top:14px">
            <button class="btn btn-ghost btn-sm">${ICON("edit")} Edit</button>
            <button class="btn btn-ghost btn-sm" data-nav="vouchers">${ICON("ticket")} Generate vouchers</button>
          </div>
        </div>`).join("")}
    </div>`;
  qsa("[data-nav]", qs("#viewBody")).forEach(n => n.addEventListener("click", () => goTo(n.dataset.nav)));
  qs("#addPlanBtn").addEventListener("click", () => openModal("Create plan", `
    <div class="grid grid-2" style="gap:12px">
      <div class="field"><label>Plan name</label><input placeholder="e.g. 12 Hours"/></div>
      <div class="field"><label>Price (TSH)</label><input type="number" placeholder="1500"/></div>
      <div class="field"><label>Duration</label><input placeholder="12 hours"/></div>
      <div class="field"><label>Router</label><select><option>All routers</option><option>CHOPA SHOP</option><option>CHOPA CAFE</option></select></div>
      <div class="field"><label>Download (Mbps)</label><input type="number" placeholder="5"/></div>
      <div class="field"><label>Upload (Mbps)</label><input type="number" placeholder="2"/></div>
      <div class="field"><label>Data limit</label><input placeholder="Unlimited or e.g. 20 GB"/></div>
      <div class="field"><label>Simultaneous users</label><input type="number" value="1"/></div>
    </div>
    <p class="hint">Saving creates a matching MikroTik hotspot user profile on the selected router(s).</p>
  `, [{ label: "Cancel", cls: "btn-ghost", action: closeModal }, { label: "Create plan", cls: "btn-primary", action: () => { closeModal(); toast("Plan created", "Hotspot profile queued for sync to RouterOS.", "success"); } }]));
};

/* ---------------- VOUCHERS ---------------- */
VIEW_BUILDERS.vouchers = async function () {
  const { data, mock } = await Api.vouchers();
  qs("#pageActions").innerHTML = `<button class="btn btn-primary btn-sm" id="genVoucherBtn">${ICON("plus")} Generate vouchers</button>`;
  qs("#viewBody").innerHTML = `
    ${mockFlag(mock)}
    <div class="card card-flush" style="margin-top:${mock?10:0}px">
      <div class="table-toolbar">
        <div class="search-box">${ICON("search")}<input placeholder="Search voucher code…"/></div>
        <select><option>All statuses</option><option>AVAILABLE</option><option>ACTIVE</option><option>USED</option><option>EXPIRED</option><option>DISABLED</option></select>
        <select><option>All routers</option><option>CHOPA SHOP</option><option>CHOPA CAFE</option></select>
        <button class="btn btn-ghost btn-sm">${ICON("download")} Export</button>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Voucher</th><th>Package</th><th>Price</th><th>Router</th><th>Created</th><th>Expiry</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${data.map(v => `<tr>
              <td class="mono cell-strong">${v.code}</td>
              <td>${v.plan}</td>
              <td>${fmtTZS(v.price)}</td>
              <td>${v.router}</td>
              <td class="cell-sub">${v.created}</td>
              <td class="cell-sub">${v.expiry}</td>
              <td>${statusBadge(v.status)}</td>
              <td><div class="row-actions">
                <button class="btn-icon" title="Print">${ICON("print")}</button>
                <button class="btn-icon" title="Disable">${ICON("x")}</button>
              </div></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="table-foot"><span>Showing ${data.length} of ${data.length}</span><div class="pager"><button class="active">1</button></div></div>
    </div>`;
  qs("#genVoucherBtn").addEventListener("click", () => openModal("Generate vouchers", `
    <form id="genForm">
      <div class="grid grid-2" style="gap:12px">
        <div class="field"><label>Quantity</label><select><option>10</option><option selected>50</option><option>100</option><option>500</option><option>1000</option></select></div>
        <div class="field"><label>Package</label><select>${DEMO.plans.map(p=>`<option>${p.name}</option>`).join("")}</select></div>
        <div class="field"><label>Router</label><select><option>CHOPA SHOP</option><option>CHOPA CAFE</option><option>All routers</option></select></div>
        <div class="field"><label>Code length</label><select><option>6</option><option selected>8</option><option>12</option><option>16</option></select></div>
        <div class="field"><label>Prefix</label><input value="CHOPA"/></div>
        <div class="field"><label>Username/password format</label><select><option>Same code</option><option>Random pair</option></select></div>
      </div>
      <p class="hint">Codes are generated with a cryptographically secure random source. Each voucher is only marked AVAILABLE after MikroTik confirms the hotspot user was created — partial failures are reported, not hidden.</p>
    </form>
  `, [{ label: "Cancel", cls: "btn-ghost", action: closeModal }, { label: "Generate", cls: "btn-primary", action: async () => {
    closeModal();
    const { data: res, mock: m } = await Api.generateVouchers({ quantity: 50 });
    toast("Voucher batch queued", m ? "MOCK adapter used — connect a router to create real hotspot users." : `${res.created} vouchers created.`, "success");
  } }]));
};

/* ---------------- END USERS (hotspot users) ---------------- */
VIEW_BUILDERS.endusers = async function () {
  const { data, mock } = await Api.hotspotUsers();
  qs("#viewBody").innerHTML = `
    ${mockFlag(mock)}
    <div class="card card-flush" style="margin-top:${mock?10:0}px">
      <div class="table-toolbar">
        <div class="search-box">${ICON("search")}<input placeholder="Search username, MAC, IP…"/></div>
        <select><option>All routers</option><option>CHOPA SHOP</option><option>CHOPA CAFE</option></select>
        <select><option>All statuses</option><option>ONLINE</option><option>EXPIRED</option></select>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Username</th><th>Profile</th><th>Router</th><th>IP</th><th>MAC</th><th>Data used</th><th>Session</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${data.map(u => `<tr>
              <td class="cell-strong mono">${u.username}</td>
              <td>${u.profile}</td><td>${u.router}</td>
              <td class="mono">${u.ip}</td><td class="mono cell-sub">${u.mac}</td>
              <td>${u.data}</td><td>${u.session}</td>
              <td>${statusBadge(u.status)}</td>
              <td><div class="row-actions">
                <button class="btn-icon" title="Extend">${ICON("clock")}</button>
                <button class="btn-icon" title="Disconnect">${ICON("power")}</button>
                <button class="btn-icon" title="Delete">${ICON("trash")}</button>
              </div></td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
};

/* ---------------- TRANSACTIONS ---------------- */
VIEW_BUILDERS.transactions = async function () {
  const { data, mock } = await Api.transactions();
  qs("#pageActions").innerHTML = `<button class="btn btn-ghost btn-sm">${ICON("download")} Export CSV</button>`;
  qs("#viewBody").innerHTML = `
    ${mockFlag(mock)}
    <div class="card card-flush" style="margin-top:${mock?10:0}px">
      <div class="table-toolbar">
        <div class="search-box">${ICON("search")}<input placeholder="Search transaction, customer, ref…"/></div>
        <select><option>All methods</option><option>Cash</option><option>M-Pesa</option><option>Airtel Money</option><option>Mixx by Yas</option><option>HaloPesa</option></select>
        <select><option>All statuses</option><option>PENDING</option><option>SUCCESS</option><option>FAILED</option><option>REFUNDED</option></select>
      </div>
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Transaction</th><th>Customer</th><th>Amount</th><th>Method</th><th>Package</th><th>Router</th><th>Reference</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            ${data.map(t => `<tr>
              <td class="mono cell-strong">${t.id}</td><td>${t.customer}</td><td>${fmtTZS(t.amount)}</td>
              <td>${t.method}</td><td>${t.plan}</td><td>${t.router}</td>
              <td class="mono cell-sub">${t.ref}</td><td class="cell-sub">${t.date}</td>
              <td>${statusBadge(t.status)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
};

/* ---------------- INVOICES ---------------- */
VIEW_BUILDERS.invoices = async function () {
  const { data, mock } = await Api.invoices();
  qs("#viewBody").innerHTML = `
    ${mockFlag(mock)}
    <div class="card card-flush" style="margin-top:${mock?10:0}px">
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>${data.map(i => `<tr>
            <td class="mono cell-strong">${i.id}</td><td>${i.customer}</td><td class="cell-sub">${i.date}</td>
            <td>${fmtTZS(i.total)}</td><td>${statusBadge(i.status)}</td>
            <td><div class="row-actions"><button class="btn-icon">${ICON("eye")}</button><button class="btn-icon">${ICON("print")}</button><button class="btn-icon">${ICON("download")}</button></div></td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>`;
};

/* ---------------- SESSIONS ---------------- */
VIEW_BUILDERS.sessions = async function () {
  const { data, mock } = await Api.sessions();
  qs("#viewBody").innerHTML = `
    ${mockFlag(mock)}
    <div class="card card-flush" style="margin-top:${mock?10:0}px">
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Username</th><th>Router</th><th>IP</th><th>MAC</th><th>Start</th><th>Duration</th><th>Download</th><th>Upload</th><th>Status</th><th></th></tr></thead>
          <tbody>${data.map(s => `<tr>
            <td class="cell-strong mono">${s.username}</td><td>${s.router}</td><td class="mono">${s.ip}</td>
            <td class="mono cell-sub">${s.mac}</td><td>${s.start}</td><td>${s.duration}</td>
            <td>${s.down}</td><td>${s.up}</td><td>${statusBadge(s.status)}</td>
            <td><button class="btn btn-ghost btn-sm">${ICON("power")} Disconnect</button></td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>`;
};

/* ---------------- SMS ---------------- */
VIEW_BUILDERS.sms = async function () {
  qs("#viewBody").innerHTML = `
    <div class="grid grid-3">
      <div class="card stat-card tone-info"><div class="icon-wrap">${ICON("sms")}</div><div class="label">SMS balance</div><div class="value">${DEMO.kpis.smsCredits} credits</div><span class="delta down">Top up needed</span></div>
      <div class="card stat-card tone-good"><div class="icon-wrap">${ICON("check")}</div><div class="label">Delivered (30d)</div><div class="value">312</div></div>
      <div class="card stat-card tone-bad"><div class="icon-wrap">${ICON("x")}</div><div class="label">Failed (30d)</div><div class="value">6</div></div>
    </div>
    <div class="grid grid-2" style="margin-top:16px">
      <div class="card">
        <div class="card-head"><h3>Send SMS</h3></div>
        <div class="field"><label>Recipients</label><select><option>All active users</option><option>Single number</option><option>CSV upload</option></select></div>
        <div class="field"><label>Template</label><select><option>Voucher delivery</option><option>Payment confirmation</option><option>Voucher expiry</option><option>Welcome message</option><option>Custom</option></select></div>
        <div class="field"><label>Message</label><textarea rows="4">CHOPA TECH: Your WiFi voucher is {voucher}. Package: {plan}. Valid for {duration}. Thank you.</textarea></div>
        <button class="btn btn-primary" id="sendSmsBtn">${ICON("sms")} Send</button>
      </div>
      <div class="card">
        <div class="card-head"><h3>Provider</h3></div>
        <p style="color:var(--text-mid);font-size:13px">No SMS provider connected. CHOPA TECH ships a provider-agnostic <span class="mono">SmsProvider</span> interface — add credentials in <a data-nav="system" style="color:var(--signal);cursor:pointer">System Settings</a> to enable live sending.</p>
        <span class="mock-flag">${ICON("alert")} Currently using MOCK provider</span>
      </div>
    </div>`;
  qs("#sendSmsBtn").addEventListener("click", () => toast("MOCK provider used", "Configure a real SMS provider in System Settings to send live messages.", "warn"));
  qsa("[data-nav]", qs("#viewBody")).forEach(n => n.addEventListener("click", () => goTo(n.dataset.nav)));
};

/* ---------------- REPORTS ---------------- */
VIEW_BUILDERS.reports = async function () {
  const { data } = await Api.dashboard();
  qs("#pageActions").innerHTML = `<button class="btn btn-ghost btn-sm">${ICON("download")} CSV</button><button class="btn btn-ghost btn-sm">${ICON("download")} Excel</button><button class="btn btn-ghost btn-sm">${ICON("download")} PDF</button>`;
  qs("#viewBody").innerHTML = `
    <div class="card">
      <div class="card-head"><h3>Filters</h3></div>
      <div class="grid grid-4" style="gap:12px">
        <div class="field"><label>Date range</label><input placeholder="Last 30 days"/></div>
        <div class="field"><label>Router</label><select><option>All routers</option>${DEMO.routers.map(r=>`<option>${r.name}</option>`).join("")}</select></div>
        <div class="field"><label>Package</label><select><option>All packages</option>${DEMO.plans.map(p=>`<option>${p.name}</option>`).join("")}</select></div>
        <div class="field"><label>Payment method</label><select><option>All methods</option><option>Cash</option><option>M-Pesa</option></select></div>
      </div>
    </div>
    <div class="grid grid-4" style="margin-top:16px">
      <div class="card stat-card tone-brand"><div class="icon-wrap">${ICON("wallet")}</div><div class="label">Revenue</div><div class="value">${fmtTZS(data.kpis.monthRevenue)}</div></div>
      <div class="card stat-card tone-info"><div class="icon-wrap">${ICON("wallet")}</div><div class="label">Avg. sale</div><div class="value">${fmtTZS(2280)}</div></div>
      <div class="card stat-card tone-good"><div class="icon-wrap">${ICON("ticket")}</div><div class="label">Best package</div><div class="value" style="font-size:16px">24 Hours</div></div>
      <div class="card stat-card tone-warn"><div class="icon-wrap">${ICON("router")}</div><div class="label">Top router</div><div class="value" style="font-size:16px">CHOPA SHOP</div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h3>Revenue trend</h3></div><div id="repChart"></div></div>`;
  drawRevBars(data.revenueSeries["30d"]);
  qs("#repChart").innerHTML = qs("#revChart") ? qs("#revChart").innerHTML : "";
};

/* ---------------- PAYMENT SETTINGS / GATEWAYS ---------------- */
VIEW_BUILDERS.paymentsettings = async function () {
  qs("#viewBody").innerHTML = `
    <div class="card">
      <div class="card-head"><h3>General billing</h3></div>
      <div class="grid grid-2" style="gap:12px">
        <div class="field"><label>Currency</label><select><option selected>TZS (TSH)</option><option>USD</option></select></div>
        <div class="field"><label>Tax (VAT)</label><input placeholder="0%"/></div>
        <div class="field"><label>Invoice prefix</label><input value="INV-2026-"/></div>
        <div class="field"><label>Default payment method</label><select><option>Mobile Money</option><option>Cash</option></select></div>
      </div>
      <button class="btn btn-primary btn-sm">Save settings</button>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-head"><h3>Payment methods enabled</h3></div>
      <div class="grid grid-2" style="gap:10px">
        ${["Cash","Manual payment","Mobile Money","Payment Gateway"].map(m=>`
          <div class="card" style="background:var(--bg-card-2);box-shadow:none;display:flex;align-items:center;justify-content:space-between;padding:14px">
            <span>${m}</span><label class="switch"><input type="checkbox" ${m!=="Payment Gateway"?"checked":""}/><span class="track"></span></label>
          </div>`).join("")}
      </div>
    </div>`;
};
VIEW_BUILDERS.gateways = async function () {
  const providers = [
    { name: "M-Pesa (Vodacom)", status: "Not connected" },
    { name: "Airtel Money", status: "Not connected" },
    { name: "Mixx by Yas", status: "Not connected" },
    { name: "HaloPesa", status: "Not connected" },
  ];
  qs("#viewBody").innerHTML = `
    <div class="grid grid-2">
      ${providers.map(p => `
        <div class="card">
          <div class="card-head"><h3>${p.name}</h3><span class="badge badge-neutral">${p.status}</span></div>
          <p style="color:var(--text-mid);font-size:12.5px">Connects through the CHOPA TECH <span class="mono">PaymentProvider</span> adapter (createPayment / checkPaymentStatus / handleCallback / refundPayment). Requires API keys and a signed webhook URL.</p>
          <button class="btn btn-ghost btn-sm">${ICON("edit")} Configure credentials</button>
        </div>`).join("")}
    </div>
    <div class="card" style="margin-top:16px">
      <span class="mock-flag">${ICON("alert")} No live gateway configured — payments use the MOCK provider in development</span>
      <p style="color:var(--text-mid);font-size:12.5px;margin-top:10px">All webhook callbacks are signature-verified and processed idempotently — a package is only activated after the backend confirms payment, never from a frontend redirect alone.</p>
    </div>`;
};

/* ---------------- PORTAL DESIGNER ---------------- */
VIEW_BUILDERS.portal = async function () {
  qs("#viewBody").innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>Customize</h3></div>
        <div class="field"><label>Template</label>
          <select id="ptTemplate"><option>Modern</option><option>Minimal</option><option>Business</option><option>Dark</option><option>Gradient</option><option>Classic</option></select>
        </div>
        <div class="field"><label>Welcome message</label><input id="ptWelcome" value="Welcome to CHOPA WiFi"/></div>
        <div class="grid grid-2" style="gap:12px">
          <div class="field"><label>Primary color</label><input id="ptPrimary" type="color" value="#2563eb"/></div>
          <div class="field"><label>Button color</label><input id="ptBtn" type="color" value="#ff5b34"/></div>
        </div>
        <div class="field"><label>Support contact</label><input id="ptPhone" value="+255 700 000 000"/></div>
        <div class="field"><label>Footer text</label><input value="© 2026 CHOPA TECH — Smart WiFi Billing"/></div>
        <button class="btn btn-primary btn-sm">Save portal</button>
      </div>
      <div class="card">
        <div class="card-head"><h3>Live preview</h3></div>
        <div id="portalPreview" style="border-radius:16px;overflow:hidden;border:1px solid var(--border-soft)"></div>
      </div>
    </div>`;
  const render = () => {
    const primary = qs("#ptPrimary").value, btn = qs("#ptBtn").value;
    qs("#portalPreview").innerHTML = `
      <div style="background:linear-gradient(160deg, ${primary}22, #0b0d12 70%);padding:38px 24px;text-align:center;color:#fff;font-family:Inter,sans-serif">
        <div style="font-weight:800;font-size:13px;letter-spacing:.06em;opacity:.8">CHOPA TECH</div>
        <div style="font-weight:800;font-size:20px;margin-top:10px">${qs("#ptWelcome").value}</div>
        <input placeholder="Enter voucher code" style="margin-top:18px;width:80%;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#fff;text-align:center"/>
        <div><button style="margin-top:12px;background:${btn};color:#fff;border:none;padding:10px 22px;border-radius:10px;font-weight:700;cursor:pointer">Connect</button></div>
        <div style="margin-top:18px;font-size:11px;opacity:.7">Support: ${qs("#ptPhone").value}</div>
      </div>`;
  };
  ["ptWelcome","ptPrimary","ptBtn","ptPhone"].forEach(id => qs("#"+id).addEventListener("input", render));
  render();
};

/* ---------------- STAFF ---------------- */
VIEW_BUILDERS.staff = async function () {
  const { data, mock } = await Api.staff();
  qs("#pageActions").innerHTML = `<button class="btn btn-primary btn-sm">${ICON("plus")} Add staff</button>`;
  qs("#viewBody").innerHTML = `
    ${mockFlag(mock)}
    <div class="card card-flush" style="margin-top:${mock?10:0}px">
      <div class="table-scroll">
        <table class="data-table">
          <thead><tr><th>Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr></thead>
          <tbody>${data.map(s => `<tr>
            <td class="cell-strong">${s.name}</td><td class="mono">${s.username}</td><td>${s.email}</td>
            <td><span class="badge badge-info">${s.role}</span></td><td>${statusBadge(s.status)}</td><td class="cell-sub">${s.last}</td>
            <td><div class="row-actions"><button class="btn-icon">${ICON("edit")}</button><button class="btn-icon">${ICON("trash")}</button></div></td>
          </tr>`).join("")}</tbody>
        </table>
      </div>
    </div>`;
};

/* ---------------- PROFILE / SYSTEM SETTINGS ---------------- */
VIEW_BUILDERS.profile = async function () {
  const user = JSON.parse(localStorage.getItem("chopa_user") || "{}");
  qs("#viewBody").innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>Account</h3></div>
        <div class="field"><label>Full name</label><input value="${user.name || ""}"/></div>
        <div class="field"><label>Email</label><input value="${user.email || ""}"/></div>
        <div class="field"><label>Role</label><input value="${(user.role||"").replace("_"," ")}" disabled/></div>
        <button class="btn btn-primary btn-sm">Save changes</button>
      </div>
      <div class="card">
        <div class="card-head"><h3>Security</h3></div>
        <div class="field"><label>Current password</label><input type="password"/></div>
        <div class="field"><label>New password</label><input type="password"/></div>
        <button class="btn btn-ghost btn-sm">Update password</button>
      </div>
    </div>`;
};
VIEW_BUILDERS.system = async function () {
  qs("#viewBody").innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><h3>Company</h3></div>
        <div class="field"><label>Company name</label><input value="CHOPA TECH"/></div>
        <div class="field"><label>Currency</label><select><option selected>TZS (TSH)</option><option>USD</option></select></div>
        <div class="field"><label>Timezone</label><select><option selected>Africa/Dar_es_Salaam</option></select></div>
        <div class="field"><label>Language</label><select id="sysLangSelect"><option value="en" ${getLang()==="en"?"selected":""}>English</option><option value="sw" ${getLang()==="sw"?"selected":""}>Kiswahili</option></select></div>
        <button class="btn btn-primary btn-sm">Save</button>
      </div>
      <div class="card">
        <div class="card-head"><h3>Defaults</h3></div>
        <div class="field"><label>Default router for new vouchers</label><select>${DEMO.routers.map(r=>`<option>${r.name}</option>`).join("")}</select></div>
        <div class="field"><label>Voucher code length</label><input type="number" value="8"/></div>
        <div class="field"><label>Notification email</label><input placeholder="alerts@chopatech.co.tz"/></div>
        <button class="btn btn-ghost btn-sm">Save defaults</button>
      </div>
    </div>`;
  qs("#sysLangSelect").addEventListener("change", (e) => setLanguage(e.target.value));
};

/* ---------------- Lighter / roadmap pages ---------------- */
VIEW_BUILDERS.smartsetup = async function () {
  const steps = [
    ["Connect router", "Enter host, API port and credentials — the backend verifies the RouterOS API connection."],
    ["Create hotspot server", "CHOPA TECH configures a hotspot interface on your chosen bridge/interface."],
    ["Generate profiles", "One RouterOS hotspot profile is created per CHOPA TECH plan."],
    ["Deploy captive portal", "The CHOPA TECH branded login page is uploaded to the router's hotspot files."],
    ["Test a voucher", "A single test voucher is generated so you can confirm end-to-end login."],
  ];
  qs("#viewBody").innerHTML = `<div class="card"><div class="card-head"><h3>Guided setup</h3><span class="badge-tag new">NEW</span></div>
    ${steps.map((s,i)=>`<div style="display:flex;gap:14px;padding:14px 0;border-bottom:1px solid var(--border-soft)">
      <div style="width:30px;height:30px;border-radius:6px;background:var(--signal-dim);color:var(--signal);display:flex;align-items:center;justify-content:center;font-weight:700;flex:0 0 auto;font-family:var(--font-display)">${i+1}</div>
      <div><b>${s[0]}</b><p style="color:var(--text-mid);font-size:12.5px;margin:4px 0 0">${s[1]}</p></div>
    </div>`).join("")}
    <button class="btn btn-primary btn-sm" style="margin-top:14px">Start guided setup</button>
  </div>`;
};
VIEW_BUILDERS.radius = async function () {
  qs("#viewBody").innerHTML = `<div class="card empty-state">
    <div class="ico">${ICON("radius")}</div>
    <h4>RADIUS — coming soon</h4>
    <p>Database tables (radcheck, radreply, radacct) and a FreeRADIUS service interface are scaffolded in the backend. Enable this once you're ready to centralize authentication across routers.</p>
  </div>`;
};
VIEW_BUILDERS.accesspoint = async function () {
  qs("#viewBody").innerHTML = `<div class="card">
    <div class="card-head"><h3>Wireless interfaces</h3></div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Interface</th><th>SSID</th><th>Band</th><th>Security</th><th>Router</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td class="mono">wlan1</td><td>CHOPA-SHOP-WIFI</td><td>2.4GHz</td><td>WPA2</td><td>CHOPA SHOP</td><td>${statusBadge("ONLINE")}</td></tr>
        <tr><td class="mono">wlan2</td><td>CHOPA-SHOP-5G</td><td>5GHz</td><td>WPA2</td><td>CHOPA SHOP</td><td>${statusBadge("ONLINE")}</td></tr>
      </tbody>
    </table></div>
  </div>`;
};
VIEW_BUILDERS.pppoe = async function () {
  qs("#viewBody").innerHTML = `<div class="card">
    <div class="card-head"><h3>PPPoE secrets</h3><button class="btn btn-primary btn-sm">${ICON("plus")} Add secret</button></div>
    <div class="table-scroll"><table class="data-table">
      <thead><tr><th>Username</th><th>Profile</th><th>Router</th><th>Status</th></tr></thead>
      <tbody><tr><td class="mono">home-0231</td><td>10Mbps Home</td><td>CHOPA OFFICE</td><td>${statusBadge("ACTIVE")}</td></tr></tbody>
    </table></div>
  </div>`;
};
VIEW_BUILDERS.upgrade = async function () {
  const plans = [
    { name: "Starter", price: "Free", features: ["1 router","500 vouchers/mo","Email support"] , current:true},
    { name: "Growth", price: "TSH 45,000/mo", features: ["5 routers","5,000 vouchers/mo","SMS credits included","Priority support"] },
    { name: "Business", price: "TSH 120,000/mo", features: ["Unlimited routers","Unlimited vouchers","Resellers & RADIUS","Dedicated support"] },
  ];
  qs("#viewBody").innerHTML = `<div class="grid grid-3">${plans.map(p=>`
    <div class="card" style="${p.current?"border-color:var(--signal)":""}">
      <div class="card-head"><h3>${p.name}</h3>${p.current?'<span class="badge badge-info">Current</span>':""}</div>
      <div class="value" style="font-size:22px">${p.price}</div>
      <ul style="margin:14px 0 0;padding-left:18px;color:var(--text-mid);font-size:13px">${p.features.map(f=>`<li style="margin-bottom:6px">${f}</li>`).join("")}</ul>
      <button class="btn ${p.current?"btn-ghost":"btn-primary"} btn-sm btn-block" style="margin-top:16px" ${p.current?"disabled":""}>${p.current?"Current plan":"Upgrade"}</button>
    </div>`).join("")}</div>`;
};
VIEW_BUILDERS.maintenance = async function () {
  qs("#viewBody").innerHTML = `<div class="grid grid-2">
    <div class="card"><div class="card-head"><h3>Scheduled jobs</h3></div>
      <div class="table-scroll"><table class="data-table">
        <thead><tr><th>Job</th><th>Schedule</th><th>Last run</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>Expire vouchers</td><td>Every 5 min</td><td class="cell-sub">2 min ago</td><td>${statusBadge("SUCCESS")}</td></tr>
          <tr><td>Router health poll</td><td>Every 1 min</td><td class="cell-sub">40s ago</td><td>${statusBadge("SUCCESS")}</td></tr>
          <tr><td>SMS delivery retry</td><td>Every 10 min</td><td class="cell-sub">7 min ago</td><td>${statusBadge("PENDING")}</td></tr>
        </tbody>
      </table></div>
    </div>
    <div class="card"><div class="card-head"><h3>System health</h3></div>
      <div class="grid grid-2" style="gap:10px">
        <div class="card" style="background:var(--bg-card-2);box-shadow:none"><div class="cell-sub">API</div><div style="margin-top:4px">${statusBadge("ONLINE")}</div></div>
        <div class="card" style="background:var(--bg-card-2);box-shadow:none"><div class="cell-sub">Database</div><div style="margin-top:4px">${statusBadge("ONLINE")}</div></div>
        <div class="card" style="background:var(--bg-card-2);box-shadow:none"><div class="cell-sub">SMS provider</div><div style="margin-top:4px">${statusBadge("DISABLED")}</div></div>
        <div class="card" style="background:var(--bg-card-2);box-shadow:none"><div class="cell-sub">Payment gateway</div><div style="margin-top:4px">${statusBadge("DISABLED")}</div></div>
      </div>
    </div>
  </div>`;
};

VIEW_BUILDERS.placeholder = async function () {
  qs("#viewBody").innerHTML = `<div class="card empty-state"><div class="ico">${ICON("wrench")}</div><h4>Coming soon</h4><p>This module is scaffolded on the backend and will render here next.</p></div>`;
};

/* ---------------- shared modal helper ---------------- */
function openModal(title, bodyHtml, buttons) {
  qs("#modalRoot")?.remove();
  const overlay = el(`<div class="modal-overlay open" id="modalRoot">
    <div class="modal">
      <div class="modal-head"><h3>${title}</h3><button class="btn-icon" id="modalClose">${ICON("x")}</button></div>
      <div class="modal-body">${bodyHtml}</div>
      <div class="modal-foot" id="modalFoot"></div>
    </div>
  </div>`);
  document.body.appendChild(overlay);
  qs("#modalFoot").innerHTML = buttons.map((b,i) => `<button class="btn ${b.cls}" data-i="${i}">${b.label}</button>`).join("");
  qsa("#modalFoot button").forEach((b,i) => b.addEventListener("click", () => buttons[i].action()));
  qs("#modalClose").addEventListener("click", closeModal);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
}
function closeModal() { qs("#modalRoot")?.remove(); }
