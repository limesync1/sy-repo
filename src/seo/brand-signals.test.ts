import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("brand and AI crawler signals", () => {
  it("organization lists the 'Service ydere' spelling", () => {
    expect(readFileSync("index.html", "utf8")).toContain('"Service ydere"');
  });
  it("robots explicitly allows AI search crawlers but keeps admin private", () => {
    const robots = readFileSync("public/robots.txt", "utf8");
    for (const bot of ["GPTBot", "OAI-SearchBot", "PerplexityBot", "ClaudeBot", "Google-Extended"]) {
      const block = robots.split(`User-agent: ${bot}\n`)[1]?.split("\n\n")[0] ?? "";
      expect(block, bot).toContain("Allow: /");
      expect(block, bot).toContain("Disallow: /admin");
    }
  });
});
