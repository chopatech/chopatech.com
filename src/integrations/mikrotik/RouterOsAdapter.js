/**
 * CHOPA TECH — MikroTik RouterOS adapter (Cloudflare Workers build)
 * -----------------------------------------------------------------
 * Talks to a real MikroTik router over the RouterOS API using Workers'
 * native `cloudflare:sockets` TCP support, connecting straight to the
 * router's public IP/port. Credentials never reach the browser (see
 * RouterCredential table).
 *
 * IMPORTANT: outbound TCP sockets from Workers (`cloudflare:sockets`)
 * require the Workers Paid plan. See:
 * https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/
 *
 * This adapter only issues documented RouterOS API menu paths. It never
 * invents unsupported commands.
 */
import { connect } from "cloudflare:sockets";
import { writeSentence, readSentence, ByteStream, parseAttributeWord } from "./protocol.js";

export class RouterOsAdapter {
  /**
   * @param {{host:string, port:number, user:string, password:string, useSsl?:boolean}} cfg
   */
  constructor(cfg) {
    this.cfg = cfg;
    this.socket = null;
    this.writer = null;
    this.stream = null;
  }

  async connect() {
    this.socket = connect(
      { hostname: this.cfg.host, port: this.cfg.port },
      this.cfg.useSsl ? { secureTransport: "on" } : undefined
    );
    this.writer = this.socket.writable.getWriter();
    this.stream = new ByteStream(this.socket.readable.getReader());

    await writeSentence(this.writer, ["/login", `=name=${this.cfg.user}`, `=password=${this.cfg.password}`]);
    const sentence = await readSentence(this.stream);
    if (sentence[0] !== "!done") {
      const message = this._extractMessage(sentence);
      throw new Error(`MikroTik login failed: ${message || sentence.join(" ")}`);
    }
    return this;
  }

  async disconnect() {
    try {
      if (this.writer) await this.writer.close();
    } catch {
      // socket may already be closed — ignore
    }
    try {
      if (this.socket) await this.socket.close();
    } catch {
      // ignore
    }
  }

  _extractMessage(sentence) {
    const word = sentence.find((w) => w.startsWith("=message="));
    return word ? parseAttributeWord(word).value : null;
  }

  // Sends a command sentence and collects every "!re" (reply) row until "!done".
  // Throws if the router replies "!trap" (RouterOS's error response).
  // Connects lazily on first use, so callers don't have to remember to call
  // connect() themselves — but they SHOULD call disconnect() when finished
  // with an adapter instance (see routes/*.js), since each open connection
  // counts against the Worker's concurrent-connection limit.
  async write(command, params = []) {
    if (!this.writer) await this.connect();
    await writeSentence(this.writer, [command, ...params]);
    const rows = [];
    while (true) {
      const sentence = await readSentence(this.stream);
      const tag = sentence[0];
      if (tag === "!done") break;
      if (tag === "!trap") {
        throw new Error(this._extractMessage(sentence) || `MikroTik command failed: ${command}`);
      }
      if (tag === "!re") {
        const row = {};
        for (const word of sentence.slice(1)) {
          const { key, value } = parseAttributeWord(word);
          row[key] = value;
        }
        rows.push(row);
      }
      // "!fatal" or anything else: keep looping until connection errors out,
      // readSentence() will throw if the socket closes.
    }
    return rows;
  }

  async testConnection() {
    await this.connect();
    try {
      const [identity] = await this.write("/system/identity/print");
      const [resource] = await this.write("/system/resource/print");
      return {
        ok: true,
        identity: identity?.name,
        routerOsVersion: resource?.version,
        board: resource?.["board-name"],
      };
    } finally {
      await this.disconnect();
    }
  }

  async getSystemResource() {
    const [r] = await this.write("/system/resource/print");
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
    return this.write("/interface/print");
  }

  async getHotspotActiveUsers() {
    return this.write("/ip/hotspot/active/print");
  }

  async getHotspotUsers() {
    return this.write("/ip/hotspot/user/print");
  }

  async getHotspotProfiles() {
    return this.write("/ip/hotspot/user/profile/print");
  }

  async getPppUsers() {
    return this.write("/ppp/secret/print");
  }

  /**
   * Creates a hotspot user (voucher) on the router.
   * Throws on failure — callers must NOT mark a voucher as created unless
   * this resolves successfully.
   */
  async createHotspotUser({ username, password, profile, limitUptime }) {
    const params = [`=name=${username}`, `=password=${password}`, `=profile=${profile}`];
    if (limitUptime) params.push(`=limit-uptime=${limitUptime}`);
    return this.write("/ip/hotspot/user/add", params);
  }

  async disableHotspotUser(username) {
    const [user] = await this.write("/ip/hotspot/user/print", [`?name=${username}`]);
    if (!user) throw new Error(`Hotspot user ${username} not found`);
    return this.write("/ip/hotspot/user/set", [`=.id=${user[".id"]}`, "=disabled=yes"]);
  }

  async removeHotspotActiveSession(sessionId) {
    return this.write("/ip/hotspot/active/remove", [`=.id=${sessionId}`]);
  }
}

export default RouterOsAdapter;
