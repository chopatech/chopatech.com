/** CHOPA TECH — SMS provider interface. Concrete providers (Beem, Africa's Talking, etc.) implement this. */
export class SmsProvider {
  async sendSms({ to, body }) {
    throw new Error("sendSms() not implemented");
  }
  async getBalance() {
    throw new Error("getBalance() not implemented");
  }
}
export default SmsProvider;
