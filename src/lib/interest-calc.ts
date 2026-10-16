// Pure TypeScript mirror of the Postgres accrue_interest_to_date() function.
// Used for client-side previews (Khata Sale dialog, Interest Management page).
// The Postgres function is the source of truth; this file must produce the
// same numbers for the same inputs.

export type RatePeriod = "monthly" | "annual";
export type RateSegment = {
  effectiveDate: string; // YYYY-MM-DD
  rate: number; // percentage (e.g. 12 = 12%)
  ratePeriod: RatePeriod;
};

export type AccrualResult = {
  accruedInterestTotal: number;
  interestOutstanding: number;
  principalOutstanding: number;
  totalSettlement: number;
};

// ACT/365 day count. Both dates are YYYY-MM-DD strings.
function daysBetween(from: string, to: string): number {
  const fromParts = from.split("-").map(Number);
  const toParts = to.split("-").map(Number);
  // Use local midnight to avoid UTC offset issues. PostgreSQL DATE
  // values are calendar dates, not timestamps.
  const fromD = new Date(fromParts[0]!, fromParts[1]! - 1, fromParts[2]!);
  const toD = new Date(toParts[0]!, toParts[1]! - 1, toParts[2]!);
  return Math.max(0, Math.round((toD.getTime() - fromD.getTime()) / (1000 * 60 * 60 * 24)));
}

function annualize(rate: number, period: RatePeriod): number {
  return period === "monthly" ? rate * 12 : rate;
}

// Compute simple interest accrued on a principal over a segment of days.
// principal × annualRate/100 × days/365
function simpleInterest(principal: number, annualRatePct: number, days: number): number {
  return principal * (annualRatePct / 100) * (days / 365);
}

/**
 * Compute accrued interest across rate segments, mirroring the Postgres
 * accrue_interest_to_date() function.
 *
 * Algorithm: walk segments in effective_date order. For each segment,
 * compute simple interest on the principal outstanding at the start of
 * that segment (after subtracting principal payments made in earlier
 * segments). Reduce the principal-for-accrual by principal payments made
 * in this segment for the NEXT segment.
 *
 * @param originalPrincipal  The principal at agreement start
 * @param segments            Ordered rate segments (effective_date asc)
 * @param startDate           When interest started accruing
 * @param asOfDate            Compute accrued interest up to this date
 * @param principalPayments   List of {date, amount} of principal payments
 *                             made against this agreement up to asOfDate
 * @param interestPaidTotal   Sum of interest_portion already paid
 * @param interestWaivedTotal Sum of waiver interest_deltas (positive magnitude)
 * @param principalWriteOffTotal Sum of write_off principal_deltas (positive)
 * @param currentOutstandingPrincipal  The agreement.outstanding_principal
 *                                       value (kept current by the DB)
 */
export function accrueInterestToDate(input: {
  originalPrincipal: number;
  segments: RateSegment[];
  startDate: string;
  asOfDate: string;
  principalPayments: Array<{ date: string; amount: number }>;
  interestPaidTotal: number;
  interestWaivedTotal: number;
  principalWriteOffTotal: number;
  currentOutstandingPrincipal: number;
}): AccrualResult {
  const {
    originalPrincipal,
    segments,
    startDate,
    asOfDate,
    principalPayments,
    interestPaidTotal,
    interestWaivedTotal,
    principalWriteOffTotal,
    currentOutstandingPrincipal,
  } = input;

  if (segments.length === 0) {
    return {
      accruedInterestTotal: 0,
      interestOutstanding: 0,
      principalOutstanding: Math.max(currentOutstandingPrincipal - principalWriteOffTotal, 0),
      totalSettlement: Math.max(currentOutstandingPrincipal - principalWriteOffTotal, 0),
    };
  }

  // As-of date cannot be before start date.
  if (asOfDate < startDate) {
    return {
      accruedInterestTotal: 0,
      interestOutstanding: 0,
      principalOutstanding: Math.max(currentOutstandingPrincipal - principalWriteOffTotal, 0),
      totalSettlement: Math.max(currentOutstandingPrincipal - principalWriteOffTotal, 0),
    };
  }

  let accrued = 0;
  let principalForAccrual = originalPrincipal;

  // Sort segments by effective_date ascending (defensive).
  const sortedSegments = [...segments].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));

  for (let i = 0; i < sortedSegments.length; i++) {
    const seg = sortedSegments[i]!;
    const nextSeg = sortedSegments[i + 1];
    const segStart = seg.effectiveDate < startDate ? startDate : seg.effectiveDate;
    const segEnd = nextSeg ? nextSeg.effectiveDate : asOfDate;
    const effectiveSegEnd = asOfDate < segEnd ? asOfDate : segEnd;

    if (effectiveSegEnd > segStart) {
      const days = daysBetween(segStart, effectiveSegEnd);
      const annualRate = annualize(seg.rate, seg.ratePeriod);
      accrued += simpleInterest(principalForAccrual, annualRate, days);

      // Subtract principal payments in this segment for the NEXT segment.
      const paymentsInSegment = principalPayments
        .filter((p) => p.date >= segStart && p.date < effectiveSegEnd)
        .reduce((sum, p) => sum + p.amount, 0);
      principalForAccrual = Math.max(principalForAccrual - paymentsInSegment, 0);
    }
  }

  const interestOutstanding = Math.max(accrued - interestPaidTotal - interestWaivedTotal, 0);
  const principalOutstanding = Math.max(currentOutstandingPrincipal - principalWriteOffTotal, 0);

  return {
    accruedInterestTotal: round2(accrued),
    interestOutstanding: round2(interestOutstanding),
    principalOutstanding: round2(principalOutstanding),
    totalSettlement: round2(interestOutstanding + principalOutstanding),
  };
}

/**
 * Allocate a payment across interest and principal. Interest-first
 * convention (standard loan amortization).
 *
 * @param paymentAmount     Total amount of the payment
 * @param interestOutstanding  Currently owed interest
 * @param principalOutstanding Currently owed principal
 * @returns Split of the payment into interest / principal / adjustment portions
 */
export function allocatePayment(input: {
  paymentAmount: number;
  interestOutstanding: number;
  principalOutstanding: number;
}): { interestPortion: number; principalPortion: number; adjustmentPortion: number } {
  const { paymentAmount, interestOutstanding, principalOutstanding } = input;
  const interestPortion = Math.min(paymentAmount, Math.max(interestOutstanding, 0));
  const principalPortion = Math.min(paymentAmount - interestPortion, Math.max(principalOutstanding, 0));
  const adjustmentPortion = paymentAmount - interestPortion - principalPortion;
  return {
    interestPortion: round2(interestPortion),
    principalPortion: round2(principalPortion),
    adjustmentPortion: round2(adjustmentPortion),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
