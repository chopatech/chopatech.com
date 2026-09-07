/**
 * CHOPA TECH — MikroTik RouterOS adapter
 * -----------------------------------------------------------
 * Talks to a real MikroTik router over the RouterOS API using
 * the `node-routeros` package. All calls happen server-side —
 * credentials never reach the browser (see RouterCredential model).
 *
 * This adapter only issues commands that are documented RouterOS
 * API menu paths. It never invents unsupported commands.
 */
const { RouterOSAPI } = require("node-routeros");
const logger = require("../../utils/logger");

class RouterOsAdapter {
  /**
   * @param {{host:string, port:number, user:string, password:string, useSsl?:boolean, timeout?:number}} cfg
   */
  constructor(cfg) {
    this.cfg = cfg;
    this.conn = null;
  }

  async connect() {
    this.conn = new RouterOSAPI({
      host: this.cfg.host,
      user: this.cfg.user,
      password: this.cfg.password,
      port: this.cfg.port,
      tls: this.cfg.useSsl ? {} : undefined,
      timeout: this.cfg.timeout || 8,
    });
    await this.conn.connect();
    return this;
  }

  async disconnect() {
    if (this.conn) await this.conn.close();
  }

  async testConnection() {
    await this.connect();
    const identity = await this.conn.write("/system/identity/print");
    const resource = await this.conn.write("/system/resource/print");
    await this.disconnect();
    return {
      ok: true,
      identity: identity?.[0]?.name,
      routerOsVersion: resource?.[0]?.version,
      board: resource?.[0]["board-name"],
    };
  }

  async getSystemResource() {
    const [r] = await this.conn.write("/system/resource/print");
    return {
      cpuLoad: Number(r["cpu-load"]),
      freeMemory: Number(r["free-memory"]),
      totalMemory: Number(r["total-memory"]),
      uptime: r.uptime,
      version: r.version,
      boardName: r["board-name"],
    };
  }

  async getInterfaces() {
    return this.conn.write("/interface/print");
  }

  async getHotspotActiveUsers() {
    return this.conn.write("/ip/hotspot/active/print");
  }

  async getHotspotUsers() {
    return this.conn.write("/ip/hotspot/user/print");
  }

  async getHotspotProfiles() {
    return this.conn.write("/ip/hotspot/user/profile/print");
  }

  async getPppUsers() {
    return this.conn.write("/ppp/secret/print");
  }

  /**
   * Creates a hotspot user (voucher) on the router.
   * Throws on failure — callers must NOT mark a voucher as created
   * unless this resolves successfully (see RULE 12 in the product spec).
   */
  async createHotspotUser({ username, password, profile, limitUptime }) {
    const params = [
      `=name=${username}`,
      `=password=${password}`,
      `=profile=${profile}`,
    ];
    if (limitUptime) params.push(`=limit-uptime=${limitUptime}`);
    return this.conn.write("/ip/hotspot/user/add", params);
  }

  async disableHotspotUser(username) {
    const [user] = await this.conn.write("/ip/hotspot/user/print", [`?name=${username}`]);
    if (!user) throw new Error(`Hotspot user ${username} not found`);
    return this.conn.write("/ip/hotspot/user/set", [`=.id=${user[".id"]}`, "=disabled=yes"]);
  }

  async removeHotspotActiveSession(sessionId) {
    return this.conn.write("/ip/hotspot/active/remove", [`=.id=${sessionId}`]);
  }
}

module.exports = RouterOsAdapter;
