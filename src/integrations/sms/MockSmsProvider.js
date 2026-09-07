import { SmsProvider } from "./SmsProvider.js";

/** MOCK IMPLEMENTATION — used when SMS_MODE=mock (the default). Never sends a real SMS. */
export class MockSmsProvider extends SmsProvider {
  async sendSms({ to, body }) {
    return { ok: true, mock: true, to, providerRef: `MOCK-${Date.now()}` };
  }
  async getBalance() {
    return { credits: 0, mock: true };
  }
}
export default MockSmsProvider;
