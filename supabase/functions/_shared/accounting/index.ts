import type { AccountingAdapter, AccountingCredentials, AccountingProvider, AccountingSettings } from "./types.ts";
import { makeEconomicAdapter } from "./economic.ts";
import { makeDineroAdapter } from "./dinero.ts";

export function makeAdapter(
  provider: AccountingProvider,
  creds: AccountingCredentials,
  settings: AccountingSettings,
): AccountingAdapter {
  switch (provider) {
    case "economic": return makeEconomicAdapter(creds, settings);
    case "dinero":   return makeDineroAdapter(creds, settings);
    default: throw new Error(`Ukendt regnskabsudbyder: ${provider}`);
  }
}

export * from "./types.ts";