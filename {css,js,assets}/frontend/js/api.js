/* =========================================================
   CHOPA TECH — API client
   -----------------------------------------------------------
   Every function here tries the real backend REST API first
   (see /backend). If the backend is not running (e.g. you are
   only previewing the frontend), it falls back to the local
   DEMO dataset so the UI remains reviewable — and it sets
   window.CHOPA_MOCK_MODE = true so the UI can show a visible
   "DEMO DATA" flag. This fallback must never run silently in
   production; deploy the backend and set API_BASE accordingly.
   ========================================================= */
const API_BASE = window.CHOPA_API_BASE || "/api";
window.CHOPA_MOCK_MODE = false;

async function apiRequest(path, opts = {}) {
  const token = localStorage.getItem("chopa_token");
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (res.status === 401) {
    localStorage.removeItem("chopa_token");
    if (!location.pathname.endsWith("login.html")) location.href = "login.html";
    throw new Error("Unauthorized");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error?.message || `Request failed (${res.status})`);
  return body;
}

// Wraps a real API call; on network failure, falls back to a demo value and flags mock mode.
async function withFallback(path, demoValue, opts) {
  try {
    return { data: await apiRequest(path, opts), mock: false };
  } catch (e) {
    window.CHOPA_MOCK_MODE = true;
    console.warn(`[CHOPA] backend unreachable for ${path} — showing DEMO data. (${e.message})`);
    await new Promise(r => setTimeout(r, 220)); // simulate latency so skeleton states are visible
    return { data: demoValue, mock: true };
  }
}

const Api = {
  login: (username, password) =>
    apiRequest("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  register: (payload) =>
    apiRequest("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  forgotPassword: (email) =>
    apiRequest("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) }),

  dashboard: () => withFallback("/dashboard", { kpis: DEMO.kpis, revenueSeries: DEMO.revenueSeries, planMix: DEMO.planMix }),
  routers: () => withFallback("/routers", DEMO.routers),
  testRouter: (id) => withFallback(`/routers/${id}/test`, { ok: true, mock: true, message: "MOCK adapter: connection simulated (no real MikroTik configured)" }),
  plans: () => withFallback("/plans", DEMO.plans),
  vouchers: () => withFallback("/vouchers", DEMO.vouchers),
  generateVouchers: (payload) => withFallback("/vouchers/generate", { created: payload.quantity || 0, mock: true }, { method: "POST", body: JSON.stringify(payload) }),
  hotspotUsers: () => withFallback("/users", DEMO.hotspotUsers),
  transactions: () => withFallback("/transactions", DEMO.transactions),
  sessions: () => withFallback("/sessions", DEMO.sessions),
  invoices: () => withFallback("/invoices", DEMO.invoices),
  notifications: () => withFallback("/notifications", DEMO.notifications),
  staff: () => withFallback("/staff", DEMO.staff),
};
