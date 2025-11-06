export const computeMSV = (targetCPA: number, factor = 40) => targetCPA * factor;

export const computeMaxVariants = (totalBudget: number, msv: number) =>
  Math.max(0, Math.floor(totalBudget / Math.max(msv, 1)));

export const computeMaxConcurrent = (dailyBudget: number, msv: number, readDays: number) =>
  dailyBudget > 0 ? Math.floor(dailyBudget / (msv / Math.max(readDays, 1))) : 0;

export function clampCountsToBudget(counts: number[], maxVariants: number): number[] {
  let total = counts.reduce((a, b) => a + b, 0);
  const out = [...counts];
  while (total > maxVariants) {
    const i = out.indexOf(Math.max(...out));
    if (i === -1) break;
    out[i] = Math.max(0, out[i] - 1);
    total -= 1;
  }
  return out;
}

export const enforceMinPerVertical = (counts: number[], min = 3) =>
  counts.map((c) => (c >= min ? c : 0));
