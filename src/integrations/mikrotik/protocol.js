// CHOPA TECH — RouterOS API wire protocol, implemented from scratch against
// Cloudflare Workers' native `cloudflare:sockets` TCP API.
//
// Why this exists: the original backend used the `node-routeros` npm package,
// which opens a plain Node `net.Socket`. Workers doesn't have Node sockets —
// it has its own `connect()` API that returns Web Streams instead. RouterOS's
// API protocol itself is simple (documented at
// https://help.mikrotik.com/docs/display/ROS/API), so it's reimplemented here
// directly rather than trying to shim node-routeros on top of Workers.
//
// This targets RouterOS 6.43+ / v7, which use plain-text login over the API
// port (no more legacy MD5 challenge-response). If you're on RouterOS older
// than 6.43, upgrade it — it's also a security recommendation from MikroTik.

function encodeLength(length) {
  if (length < 0x80) return new Uint8Array([length]);
  if (length < 0x4000) {
    const l = length | 0x8000;
    return new Uint8Array([(l >> 8) & 0xff, l & 0xff]);
  }
  if (length < 0x200000) {
    const l = length | 0xc00000;
    return new Uint8Array([(l >> 16) & 0xff, (l >> 8) & 0xff, l & 0xff]);
  }
  if (length < 0x10000000) {
    const l = length | 0xe0000000;
    return new Uint8Array([(l >>> 24) & 0xff, (l >> 16) & 0xff, (l >> 8) & 0xff, l & 0xff]);
  }
  return new Uint8Array([0xf0, (length >>> 24) & 0xff, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
}

function encodeWord(word) {
  const bytes = new TextEncoder().encode(word);
  const lenBytes = encodeLength(bytes.length);
  const out = new Uint8Array(lenBytes.length + bytes.length);
  out.set(lenBytes, 0);
  out.set(bytes, lenBytes.length);
  return out;
}

export async function writeSentence(writer, words) {
  const parts = words.map(encodeWord);
  parts.push(new Uint8Array([0])); // zero-length word terminates the sentence
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  await writer.write(out);
}

// Buffers bytes off a ReadableStreamDefaultReader so we can read exact byte
// counts even though TCP delivers arbitrary chunk sizes.
export class ByteStream {
  constructor(reader) {
    this.reader = reader;
    this.buffer = new Uint8Array(0);
  }

  async _fill(min) {
    while (this.buffer.length < min) {
      const { value, done } = await this.reader.read();
      if (done) throw new Error("MikroTik connection closed unexpectedly");
      const merged = new Uint8Array(this.buffer.length + value.length);
      merged.set(this.buffer, 0);
      merged.set(value, this.buffer.length);
      this.buffer = merged;
    }
  }

  async readByte() {
    await this._fill(1);
    const b = this.buffer[0];
    this.buffer = this.buffer.slice(1);
    return b;
  }

  async readBytes(n) {
    await this._fill(n);
    const out = this.buffer.slice(0, n);
    this.buffer = this.buffer.slice(n);
    return out;
  }
}

async function readLength(stream) {
  const c = await stream.readByte();
  if ((c & 0x80) === 0) return c;
  if ((c & 0xc0) === 0x80) {
    const b = await stream.readBytes(1);
    return ((c & 0x3f) << 8) | b[0];
  }
  if ((c & 0xe0) === 0xc0) {
    const b = await stream.readBytes(2);
    return ((c & 0x1f) << 16) | (b[0] << 8) | b[1];
  }
  if ((c & 0xf0) === 0xe0) {
    const b = await stream.readBytes(3);
    return ((c & 0x0f) << 24) | (b[0] << 16) | (b[1] << 8) | b[2];
  }
  const b = await stream.readBytes(4);
  return ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
}

async function readWord(stream) {
  const len = await readLength(stream);
  if (len === 0) return null; // zero-length word = end of sentence
  const bytes = await stream.readBytes(len);
  return new TextDecoder().decode(bytes);
}

export async function readSentence(stream) {
  const words = [];
  while (true) {
    const w = await readWord(stream);
    if (w === null) break;
    words.push(w);
  }
  return words;
}

// A "=key=value" word -> { key, value }
export function parseAttributeWord(word) {
  // word looks like "=name=ether1" — the key is between the first and second "="
  const secondEquals = word.indexOf("=", 1);
  return { key: word.slice(1, secondEquals), value: word.slice(secondEquals + 1) };
}
