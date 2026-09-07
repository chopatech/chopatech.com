const bcrypt = require("bcryptjs");

const HASH_ROUNDS = 12;

async function hashPassword(plain) {
  return bcrypt.hash(plain, HASH_ROUNDS);
}
async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
