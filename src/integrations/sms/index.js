import { MockSmsProvider } from "./MockSmsProvider.js";

export function getSmsProvider(env) {
  if ((env.SMS_MODE || "mock") !== "live") return new MockSmsProvider();
  const key = env.SMS_PROVIDER;
  throw new Error(`No live SMS provider registered for "${key}" — add one in src/integrations/sms/, following SmsProvider.js`);
}
