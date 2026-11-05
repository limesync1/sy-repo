import { learnedDuration } from "./learned.ts";
const eq = (a: number, b: number) => { if (a !== b) throw new Error(`${a} != ${b}`); };
Deno.test("under 3 registreringer beholder planlagt tid", () => eq(learnedDuration(30, [50, 50]), 30));
Deno.test("median af faktiske tider bruges", () => eq(learnedDuration(30, [40, 45, 90]), 45));
Deno.test("begrænses til dobbelt planlagt tid", () => eq(learnedDuration(30, [200, 200, 200]), 60));
Deno.test("urealistiske registreringer ignoreres", () => eq(learnedDuration(30, [1, 2, 20, 22, 24]), 22));
