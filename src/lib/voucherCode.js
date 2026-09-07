// Unambiguous alphabet (no 0/O, 1/I/L) — reduces misread voucher codes at the point of sale.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// Cryptographically secure — never use Math.random() for voucher codes.
export function generateCode(length = 8, prefix = "") {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return prefix ? `${prefix}-${code}` : code;
}

export function generateUniqueCodes(count, length, prefix, existingSet = new Set()) {
  const codes = [];
  while (codes.length < count) {
    const c = generateCode(length, prefix);
    if (!existingSet.has(c)) {
      existingSet.add(c);
      codes.push(c);
    }
  }
  return codes;
}

export function randomHex(bytesLength = 4) {
  const bytes = crypto.getRandomValues(new Uint8Array(bytesLength));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function newId() {
  return crypto.randomUUID();
}
