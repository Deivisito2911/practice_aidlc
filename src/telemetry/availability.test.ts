import { describe, expect, it } from 'vitest';
import {
  calculateAvailability,
  availabilityMeetsSlo,
  type MinuteObservation,
} from './availability.js';
function population(days: number): MinuteObservation[] {
  return Array.from({ length: days * 1440 }, (_, minute) => ({ minute, status: 'available' }));
}
describe('disponibilidad calendario UTC', () => {
  it.each([
    [2025, 2, 28],
    [2024, 2, 29],
    [2026, 4, 30],
    [2026, 1, 31],
  ])('mes %s/%s tiene %s días completos', (year, month, days) => {
    expect(calculateAvailability(year, month, population(days))).toMatchObject({
      denominator: days * 1440,
      complete: true,
      availabilityPercent: 100,
      sloMet: true,
    });
  });
  it('mantenimiento permanece en el denominador y faltantes no afirman SLO', () => {
    const rows = population(30);
    rows[0].status = 'maintenance';
    rows[1].status = 'failed';
    const result = calculateAvailability(2026, 4, rows);
    expect(result.availabilityPercent).toBe((100 * (43200 - 2)) / 43200);
    expect(result.maintenance).toBe(1);
    expect(calculateAvailability(2026, 4, rows.slice(1))).toMatchObject({
      status: 'incomplete',
      unobserved: 1,
      availabilityPercent: null,
      sloMet: null,
    });
  });
  it('frontera 99,9 % incluye igualdad sobre población completa', () => {
    const rows = population(30);
    for (let n = 0; n < 43; n++) rows[n].status = 'failed';
    expect(calculateAvailability(2026, 4, rows).sloMet).toBe(true);
    rows[43].status = 'maintenance';
    expect(calculateAvailability(2026, 4, rows).sloMet).toBe(false);
  });
  it.each([-1, NaN, Infinity, 43200, 0.5])('rechaza minuto %s', (minute) => {
    expect(() => calculateAvailability(2026, 4, [{ minute, status: 'available' }])).toThrow();
  });
  it('rechaza categorías solapadas y población/calendario inválidos', () => {
    expect(() =>
      calculateAvailability(2026, 4, [
        { minute: 0, status: 'available' },
        { minute: 0, status: 'maintenance' },
      ]),
    ).toThrow('OVERLAPPING');
    expect(() => calculateAvailability(2026, 13, [])).toThrow();
    expect(() =>
      calculateAvailability(2026, 4, [{ minute: 0, status: 'unknown' as never }]),
    ).toThrow();
  });
});

it('frontera exacta 99.9 es inclusiva', () => {
  expect(availabilityMeetsSlo(99.9)).toBe(true);
  expect(availabilityMeetsSlo(99.899)).toBe(false);
  expect(() => availabilityMeetsSlo(NaN)).toThrow();
});
