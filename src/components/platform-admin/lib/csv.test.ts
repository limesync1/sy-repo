import { describe, it, expect, beforeEach, vi } from "vitest";
import { exportCsv } from "./csv";

describe("exportCsv", () => {
  let createdBlob: Blob | null = null;
  let clickedAnchor: HTMLAnchorElement | null = null;

  beforeEach(() => {
    createdBlob = null;
    clickedAnchor = null;
    // jsdom doesn't implement createObjectURL
    const originalCreate = URL.createObjectURL;
    URL.createObjectURL = vi.fn((b: Blob) => {
      createdBlob = b;
      return "blob:mock";
    }) as any;
    URL.revokeObjectURL = vi.fn() as any;
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      clickedAnchor = this as HTMLAnchorElement;
    };
    return () => {
      URL.createObjectURL = originalCreate;
      HTMLAnchorElement.prototype.click = origClick;
    };
  });

  async function readBlob(b: Blob | null): Promise<string> {
    if (!b) return "";
    return await b.text();
  }

  it("returns silently on empty rows", () => {
    exportCsv("empty.csv", []);
    expect(createdBlob).toBeNull();
  });

  it("writes header + rows separated by semicolons with BOM", async () => {
    exportCsv("out.csv", [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
    const text = await readBlob(createdBlob);
    expect(text.startsWith("\uFEFF")).toBe(true);
    expect(text).toContain("name;age");
    expect(text).toContain("Alice;30");
    expect(text).toContain("Bob;25");
  });

  it("quotes values containing delimiters, quotes and newlines", async () => {
    exportCsv("q.csv", [{ a: 'he said "hi"', b: "line1\nline2", c: "x;y" }]);
    const text = await readBlob(createdBlob);
    expect(text).toContain('"he said ""hi"""');
    expect(text).toContain('"line1\nline2"');
    expect(text).toContain('"x;y"');
  });

  it("handles null/undefined as empty cell", async () => {
    exportCsv("n.csv", [{ a: null, b: undefined, c: 1 }]);
    const text = await readBlob(createdBlob);
    const lines = text.replace("\uFEFF", "").split("\n");
    expect(lines[1]).toBe(";;1");
  });

  it("respects custom headers (column order/subset)", async () => {
    exportCsv("h.csv", [{ a: 1, b: 2, c: 3 }], ["c", "a"]);
    const text = await readBlob(createdBlob);
    const lines = text.replace("\uFEFF", "").split("\n");
    expect(lines[0]).toBe("c;a");
    expect(lines[1]).toBe("3;1");
  });

  it("appends .csv suffix when missing", () => {
    exportCsv("report", [{ a: 1 }]);
    expect(clickedAnchor?.getAttribute("download")).toBe("report.csv");
  });

  it("keeps .csv suffix when already present", () => {
    exportCsv("report.csv", [{ a: 1 }]);
    expect(clickedAnchor?.getAttribute("download")).toBe("report.csv");
  });
});