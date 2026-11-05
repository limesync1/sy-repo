// Skal matche SMS_PACKS / SMS_FREE_PER_MONTH i supabase/functions/_shared/sms.ts.
export const SMS_FREE_PER_MONTH = 50;
export const SMS_PACKS = [
  { id: "sms_100", credits: 100, priceDkk: 35 },
  { id: "sms_500", credits: 500, priceDkk: 175, popular: true },
  { id: "sms_1000", credits: 1000, priceDkk: 350 },
] as const;
export type SmsPackId = (typeof SMS_PACKS)[number]["id"];
