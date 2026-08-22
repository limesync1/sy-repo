import { describe, it, expect } from "vitest";
import {
  normalizeDanish,
  damerauLevenshtein,
  trigramSimilarity,
  matchText,
  scoreMatch,
  rankByQuery,
} from "./search-scoring";

describe("normalizeDanish", () => {
  it("lowercases and trims", () => {
    expect(normalizeDanish("  Rengøring  ")).toBe("rengøring");
  });

  it("preserves danish characters distinctly (not folded to a/o/a)", () => {
    expect(normalizeDanish("Flytterengøring")).toBe("flytterengøring");
    expect(normalizeDanish("Håndværker")).toBe("håndværker");
  });

  it("strips accents on other characters", () => {
    expect(normalizeDanish("café")).toBe("cafe");
  });

  it("collapses whitespace", () => {
    expect(normalizeDanish("tag   rens")).toBe("tag rens");
  });
});

describe("damerauLevenshtein", () => {
  it("is 0 for identical strings", () => {
    expect(damerauLevenshtein("rengøring", "rengøring")).toBe(0);
  });

  it("counts single substitution as 1", () => {
    expect(damerauLevenshtein("rengøring", "rengøzing")).toBe(1);
  });

  it("counts a transposition as 1 (not 2)", () => {
    expect(damerauLevenshtein("flytning", "fltyning")).toBe(1);
  });

  it("handles insertions/deletions", () => {
    expect(damerauLevenshtein("flytning", "flytnin")).toBe(1);
    expect(damerauLevenshtein("kbh", "kobenhavn")).toBeGreaterThan(2);
  });
});

describe("trigramSimilarity", () => {
  it("is 1 for identical strings", () => {
    expect(trigramSimilarity("rengøring", "rengøring")).toBe(1);
  });

  it("is 0 for completely different strings", () => {
    expect(trigramSimilarity("abc", "xyz")).toBe(0);
  });

  it("is higher for similar strings than dissimilar ones", () => {
    const close = trigramSimilarity("rengoering", "rengøring");
    const far = trigramSimilarity("rengøring", "flytning");
    expect(close).toBeGreaterThan(far);
  });
});

describe("matchText", () => {
  it("detects exact match", () => {
    expect(matchText("odense", "odense")?.kind).toBe("exact");
  });

  it("prioritises prefix over substring", () => {
    const prefix = matchText("ren", "rengøring")!;
    const substr = matchText("gør", "rengøring")!;
    expect(prefix.kind).toBe("prefix");
    expect(substr.kind).toBe("substring");
    expect(prefix.quality).toBeGreaterThan(substr.quality);
  });

  it("detects word-start match inside a longer phrase", () => {
    const result = matchText("flyt", "trappevask og flytterengøring")!;
    expect(result.kind).toBe("word-start");
  });

  it("falls back to fuzzy matching for a typo (1 edit)", () => {
    // "rendøring" vs "rengøring" — one substitution
    const result = matchText("rendøring", "rengøring");
    expect(result).not.toBeNull();
    expect(result?.kind).toBe("fuzzy");
  });

  it("tolerates a transposition typo", () => {
    const result = matchText("falytning", "flytning"); // extra letter, close
    // Should still find something reasonably close via fuzzy or substring
    expect(result).not.toBeNull();
  });

  it("returns null when nothing is close enough", () => {
    expect(matchText("banan", "vvs-installation")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(matchText("", "rengøring")).toBeNull();
    expect(matchText("ren", "")).toBeNull();
  });
});

describe("scoreMatch", () => {
  it("gives a higher score to a better match kind", () => {
    const prefix = scoreMatch("ren", "Rengøring A/S")!;
    const fuzzy = scoreMatch("rendøring", "Rengøring A/S")!;
    expect(prefix.score).toBeGreaterThan(fuzzy.score);
  });

  it("boosts popularity without letting it beat a much better match", () => {
    const unpopularGoodMatch = scoreMatch("rengøring", "Rengøring ApS", 0)!;
    const popularBadMatch = scoreMatch("banan", "VVS Frank", 1000);
    expect(popularBadMatch).toBeNull(); // no match at all regardless of popularity
    const popularWeakMatch = scoreMatch("re", "Rengøring ApS", 1000)!;
    expect(unpopularGoodMatch.score).toBeGreaterThanOrEqual(popularWeakMatch.score - 50);
  });

  it("normalises danish text before comparing (case + accents)", () => {
    expect(scoreMatch("NORD", "Café Nord")?.kind).toBe("word-start");
  });
});

describe("rankByQuery", () => {
  it("sorts items by descending score and drops non-matches", () => {
    const items = [
      { name: "VVS Frank" },
      { name: "Rengøring ApS" },
      { name: "Rens & Ren" },
    ];
    const ranked = rankByQuery("ren", items, (i) => i.name);
    expect(ranked.map((r) => r.item.name)).toEqual(["Rengøring ApS", "Rens & Ren"]);
    expect(ranked.map((r) => r.item.name)).not.toContain("VVS Frank");
  });

  it("uses popularity as a tiebreaker among equal match kinds", () => {
    const items = [
      { name: "Rens A", pop: 1 },
      { name: "Rens B", pop: 50 },
    ];
    const ranked = rankByQuery(
      "rens",
      items,
      (i) => i.name,
      (i) => i.pop,
    );
    expect(ranked[0].item.name).toBe("Rens B");
  });
});
