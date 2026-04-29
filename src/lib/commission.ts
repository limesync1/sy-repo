/**
 * Provisionsberegning for serviceydere-platformen.
 *
 * Reglerne (aftalt med ejeren):
 *  1. Provision beregnes KUN af beløb uden moms (25% moms trækkes fra først).
 *  2. Hver medarbejder har sin egen provisionssats (commission_pct).
 *  3. Hvis flere medarbejdere udfører samme opgave, deles HVER persons sats
 *     med antallet af medarbejdere på opgaven.
 *
 *  Eksempel: Kunden betaler 125 kr inkl. moms.
 *    -> Beløb uden moms = 100 kr.
 *    -> Medarbejder med 50% alene: 50 kr.
 *    -> 2 medarbejdere (50% + 30%): 50/2 = 25 kr og 30/2 = 15 kr.
 *    -> 3 medarbejdere (50% + 30% + 40%): 50/3, 30/3, 40/3.
 */

/** Standard dansk momssats. */
export const VAT_RATE = 0.25;

/** Træk moms fra et inkl.-moms beløb. */
export const exclVat = (amountInclVat: number): number => {
  if (!Number.isFinite(amountInclVat) || amountInclVat <= 0) return 0;
  return amountInclVat / (1 + VAT_RATE);
};

/**
 * Andelen til ÉN medarbejder for en opgave.
 *
 * @param amountInclVat   Ordrebeløb inkl. moms (det kunden betaler)
 * @param myCommissionPct Min provisionssats i hele procent (fx 50 for 50%)
 * @param totalAssignees  Antal medarbejdere der deler opgaven (mindst 1)
 */
export const calcEmployeeShare = (
  amountInclVat: number,
  myCommissionPct: number,
  totalAssignees: number,
): number => {
  const base = exclVat(amountInclVat);
  const pct = Math.max(0, Number(myCommissionPct || 0)) / 100;
  const shares = Math.max(1, Math.floor(Number(totalAssignees || 1)));
  if (base <= 0 || pct <= 0) return 0;
  return (base * pct) / shares;
};

/**
 * Sum af alle medarbejderes andele for én opgave (det virksomheden betaler ud).
 */
export const calcTotalPayout = (
  amountInclVat: number,
  commissions: number[],
): number => {
  if (!commissions.length) return 0;
  const base = exclVat(amountInclVat);
  const shares = commissions.length;
  return commissions.reduce((sum, pct) => {
    const p = Math.max(0, Number(pct || 0)) / 100;
    return sum + (base * p) / shares;
  }, 0);
};

/**
 * Pænt formateret kr-tal med ører (dansk locale).
 *
 * Vi viser ALTID øre — også selvom beløbet er rundt — så medarbejderen
 * kan stole på, at provisionsberegningen er præcis (fx "32,24 kr" i
 * stedet for "32 kr"). Brug `formatKrCompact` for steder hvor der ikke
 * er plads til ører.
 */
export const formatKr = (n: number): string => {
  const value = Number(n) || 0;
  return `${value.toLocaleString("da-DK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} kr`;
};

/** Kompakt udgave uden ører — KUN til steder hvor præcision er ligegyldig. */
export const formatKrCompact = (n: number): string =>
  `${Math.round(Number(n) || 0).toLocaleString("da-DK")} kr`;