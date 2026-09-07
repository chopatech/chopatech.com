const crypto = require("crypto");

// Unambiguous alphabet (no 0/O, 1/I/L) — reduces misread voucher codes at the point of sale.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

// Cryptographically secure — never use Math.random() for voucher codes.
function generateCode(length = 8, prefix = "") {
  const bytes = crypto.randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[bytes[i] % ALPHABET.length];
  return prefix ? `${prefix}-${code}` : code;
}

function generateUniqueCodes(count, length, prefix, existingSet = new Set()) {
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

module.exports = { generateCode, generateUniqueCodes };
