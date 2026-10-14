export function availabilityMeetsSlo(percent: number): boolean {
  if (!Number.isFinite(percent) || percent < 0 || percent > 100)
    throw new Error('INVALID_AVAILABILITY_PERCENT');
  return percent >= 99.9;
}
export type MinuteStatus = 'available' | 'failed' | 'maintenance';
export interface MinuteObservation {
  minute: number;
  status: MinuteStatus;
}
/** Minutes are UTC calendar offsets. Missing data never proves availability. */
export function calculateAvailability(
  year: number,
  month: number,
  observations: MinuteObservation[],
) {
  if (
    !Number.isInteger(year) ||
    year < 1970 ||
    year > 9999 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    !Array.isArray(observations)
  )
    throw new Error('INVALID_CALENDAR_POPULATION');
  const denominator = (Date.UTC(year, month, 1) - Date.UTC(year, month - 1, 1)) / 60000;
  const counts = { available: 0, failed: 0, maintenance: 0 };
  const seen = new Set<number>();
  for (const item of observations) {
    if (
      !item ||
      !Number.isInteger(item.minute) ||
      item.minute < 0 ||
      item.minute >= denominator ||
      seen.has(item.minute) ||
      !['available', 'failed', 'maintenance'].includes(item.status)
    )
      throw new Error('INVALID_OR_OVERLAPPING_MINUTE');
    seen.add(item.minute);
    counts[item.status]++;
  }
  const unobserved = denominator - seen.size,
    complete = unobserved === 0;
  const percentage = (100 * counts.available) / denominator;
  return {
    year,
    month,
    denominator,
    ...counts,
    unobserved,
    complete,
    status: complete ? 'complete' : 'incomplete',
    availabilityPercent: complete ? percentage : null,
    lowerBoundPercent: percentage,
    sloMet: complete ? availabilityMeetsSlo(percentage) : null,
  };
}
