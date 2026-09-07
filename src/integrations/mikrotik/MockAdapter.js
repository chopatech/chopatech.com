/**
 * CHOPA TECH — MikroTik MOCK adapter
 * -----------------------------------------------------------
 * MOCK IMPLEMENTATION. Used only when a real RouterOS API connection isn't
 * configured, so the rest of the application can be exercised end-to-end.
 * It must never be used in production and never pretends a real router is
 * connected (every response is tagged mock: true).
 */
export class MockAdapter {
  constructor(cfg) {
    this.cfg = cfg;
  }

  async testConnection() {
    return { ok: true, mock: true, identity: "MOCK-ROUTER", routerOsVersion: "7.x (mock)", board: "mock-board" };
  }

  async getSystemResource() {
    return { mock: true, cpuLoad: 18, freeMemory: 62000000, totalMemory: 128000000, uptime: "0d 0h (mock)", version: "7.x (mock)" };
  }

  async getInterfaces() {
    return [{ mock: true, name: "ether1", type: "ether", running: "true" }];
  }

  async getHotspotActiveUsers() {
    return [];
  }

  async getHotspotUsers() {
    return [];
  }

  async getHotspotProfiles() {
    return [{ mock: true, name: "default" }];
  }

  async getPppUsers() {
    return [];
  }

  async createHotspotUser({ username }) {
    return { mock: true, created: true, username };
  }

  async disableHotspotUser(username) {
    return { mock: true, disabled: true, username };
  }

  async removeHotspotActiveSession(sessionId) {
    return { mock: true, removed: true, sessionId };
  }

  async disconnect() {
    // no-op — nothing to close
  }
}

export default MockAdapter;
