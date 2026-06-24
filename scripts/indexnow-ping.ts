// IndexNow-ping: notificér Bing/Yandex/Seznam/Naver om opdaterede URLs.
// Google understøtter ikke IndexNow direkte endnu, men respekterer
// IndexNow-pings indirekte via Bing-discovery.
//
// Brug:
//   bunx tsx scripts/indexnow-ping.ts <slug1> <slug2> ...
//   bunx tsx scripts/indexnow-ping.ts --batch=enrichment-3
//
// "--batch=<navn>" læser slug-listen fra reports/indexnow/<navn>.txt
// (én slug pr. linje, uden /blog/ prefix).

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const HOST = "serviceydere.dk";
const KEY = "9a152c93d78e44a39fac89abe29eabc5";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const args = process.argv.slice(2);
const batchArg = args.find((a) => a.startsWith("--batch="));

let slugs: string[] = [];
if (batchArg) {
  const file = resolve(`reports/indexnow/${batchArg.slice("--batch=".length)}.txt`);
  if (!existsSync(file)) {
    console.error(`✗ batch-fil findes ikke: ${file}`);
    process.exit(1);
  }
  slugs = readFileSync(file, "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
} else {
  slugs = args.filter((a) => !a.startsWith("--"));
}

if (slugs.length === 0) {
  console.error("✗ ingen slugs angivet");
  process.exit(1);
}

const urlList = slugs.map((s) => `https://${HOST}/blog/${s.replace(/^\/blog\//, "")}`);

const body = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList,
};

const endpoints = [
  "https://api.indexnow.org/IndexNow",
  "https://www.bing.com/indexnow",
];

(async () => {
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(body),
      });
      console.log(`${res.status} ${url} — ${urlList.length} URLs`);
    } catch (e) {
      console.error(`✗ ${url}:`, (e as Error).message);
    }
  }
})();