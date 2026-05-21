export type ReviewFilter = "all" | "low" | "flagged" | "hidden";

export const FLAG_REASONS = [
  { value: "spam", label: "Spam" },
  { value: "abusive", label: "Krænkende" },
  { value: "fake", label: "Fake/falsk" },
  { value: "off_topic", label: "Off-topic" },
  { value: "other", label: "Andet" },
];

export interface ReviewInsights {
  distribution: Record<number, number>;
  total: number;
  avg: number;
  newWeek: number;
  lowCount: number;
  flaggedCount: number;
  hiddenCount: number;
}

export const computeInsights = (list: any[]): ReviewInsights => {
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  list.forEach((r: any) => { if (r.rating >= 1 && r.rating <= 5) distribution[r.rating] += 1; });
  const total = list.length;
  const avg = total ? list.reduce((s: number, r: any) => s + (r.rating || 0), 0) / total : 0;
  const newWeek = list.filter((r: any) => new Date(r.created_at).getTime() > sevenDaysAgo).length;
  const lowCount = (distribution[1] || 0) + (distribution[2] || 0);
  const flaggedCount = list.filter((r: any) => r.flagged_at).length;
  const hiddenCount = list.filter((r: any) => r.hidden_at).length;
  return { distribution, total, avg, newWeek, lowCount, flaggedCount, hiddenCount };
};