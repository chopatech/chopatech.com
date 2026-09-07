const MockSmsProvider = require("./MockSmsProvider");

function getSmsProvider() {
  if ((process.env.SMS_MODE || "mock") !== "live") return new MockSmsProvider();
  const key = process.env.SMS_PROVIDER;
  if (key === "beem") return new (require("./BeemSmsProvider"))();
  throw new Error(`No live SMS provider registered for "${key}"`);
}
module.exports = { getSmsProvider };
