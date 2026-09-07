const SmsProvider = require("./SmsProvider");

/** MOCK IMPLEMENTATION — used when SMS_MODE=mock (the default). Never sends a real SMS. */
class MockSmsProvider extends SmsProvider {
  async sendSms({ to, body }) {
    return { ok: true, mock: true, to, providerRef: `MOCK-${Date.now()}` };
  }
  async getBalance() {
    return { credits: 0, mock: true };
  }
}
module.exports = MockSmsProvider;
