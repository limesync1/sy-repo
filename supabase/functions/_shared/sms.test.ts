import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizePhone, senderFromName, segmentsFor } from "./sms.ts";

Deno.test("danske 8-cifrede numre får +45", () => assertEquals(normalizePhone("32 32 42 22"), "+4532324222"));
Deno.test("ikke-nordiske numre afvises", () => assertEquals(normalizePhone("+17156528820"), null));
Deno.test("afsendernavn højst 11 tegn uden æøå og ApS", () => assertEquals(senderFromName("Jimmy's Vinduespolering ApS"), "JimmysVindu"));
Deno.test("160 tegn = 1 SMS, 161 = 2", () => { assertEquals(segmentsFor("a".repeat(160)), 1); assertEquals(segmentsFor("a".repeat(161)), 2); });
import { SMS_FREE_PER_MONTH, SMS_PACKS } from "./sms.ts";
Deno.test("50 gratis SMS pr. måned", () => assertEquals(SMS_FREE_PER_MONTH, 50));
Deno.test("pakker: 0,35 kr./SMS som SkvizBiz (100/35, 500/175, 1000/350 kr.)", () =>
  assertEquals(SMS_PACKS.map((p) => [p.credits, p.priceDkk]), [[100, 35], [500, 175], [1000, 350]]));
