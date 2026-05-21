import { describe, it, expect, beforeEach, vi } from "vitest";
import { exportCsv } from "./csv";

describe("exportCsv", () => {
  let capturedText: string | null = null;
  let clickedAnchor: HTMLAnchorElement | null = null;

  beforeEach(() => {
    capturedText = null;
    clickedAnchor = null;
    const origBlob = globalThis.Blob;
    class CapturingBlob extends origBlob {
      constructor(parts: any[], opts?: BlobPropertyBag) {
        super(parts, opts);
        capturedText = (parts || []).map((p) => (typeof p === "string" ? p : "")).join("");
      }
    }
    (globalThis as any).Blob = CapturingBlob;
    URL.createObjectURL = vi.fn(() => "blob:mock") as any;
    URL.revokeObjectURL = vi.fn() as any;
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      clickedAnchor = this as HTMLAnchorElement;
    };
    return () => {
      (globalThis as any).Blob = origBlob;
      HTMLAnchorElement.prototype.click = origClick;
    };
  });

  function read(): string {
    return capturedText ?? "";
  }

  it("returns silently on empty rows", () => {
    exportCsv("empty.csv", []);
    expect(capturedText).toBeNull();
  });

  it("writes header + rows separated by semicolons with BOM", () => {
    exportCsv("out.csv", [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ]);
    const text = read();
    expect(text.startsWith("\uFEFF")).toBe(true);
    expect(text).toContain("name;age");
    expect(text).toContain("Alice;30");
    expect(text).toContain("Bob;25");
  });

  it("quotes values containing delimiters, quotes and newlines", () => {
    exportCsv("q.csv", [{ a: 'he said "hi"', b: "line1\nline2", c: "x;y" }]);
    const text = read();
    expect(text).toContain('"he said ""hi"""');
    expect(text).toContain('"line1\nline2"');
    expect(text).toContain('"x;y"');
  });

  it("handles null/undefined as empty cell", () => {
    exportCsv("n.csv", [{ a: null, b: undefined, c: 1 }]);
    const text = read();
    const lines = text.replace("\uFEFF", "").split("\n");
    expect(lines[1]).toBe(";;1");
  });

  it("respects custom headers (column order/subset)", () => {
    exportCsv("h.csv", [{ a: 1, b: 2, c: 3 }], ["c", "a"]);
    const text = read();
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