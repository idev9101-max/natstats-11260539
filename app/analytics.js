import { series, countryRows } from './data.js';
import { prefectures } from './regions.js';

const points = (code) => series[code] ?? [];

export function latestOf(code) {
  const all = points(code);
  return all[all.length - 1] ?? [null, null];
}

export function pointAt(code, year) {
  return points(code).find(([y]) => y === year) ?? null;
}

export function decadeTrends(code, from = 1960, to = 2025) {
  const out = [];
  for (let start = from; start < to; start += 10) {
    const end = Math.min(start + 10, to);
    const a = pointAt(code, start);
    const b = pointAt(code, end);
    if (!a || !b || !Number.isFinite(a[1]) || !Number.isFinite(b[1]) || a[1] === 0) continue;
    out.push({ start, end, first: a[1], last: b[1], changePct: (100 * (b[1] - a[1])) / a[1] });
  }
  return out;
}

export function peakOf(code) {
  const good = points(code).filter(([, v]) => Number.isFinite(v));
  return good.length ? good.reduce((best, p) => (p[1] > best[1] ? p : best), good[0]) : null;
}

export function troughOf(code) {
  const good = points(code).filter(([, v]) => Number.isFinite(v));
  return good.length ? good.reduce((best, p) => (p[1] < best[1] ? p : best), good[0]) : null;
}

export function windowStats(code, start, end) {
  const good = points(code).filter(([y, v]) => y >= start && y <= end && Number.isFinite(v));
  if (good.length < 2) return null;
  const first = good[0];
  const last = good[good.length - 1];
  const span = last[0] - first[0];
  const growth =
    span > 0 && first[1] > 0 && last[1] > 0
      ? 100 * (Math.pow(last[1] / first[1], 1 / span) - 1)
      : null;
  return {
    first,
    last,
    span,
    change: last[1] - first[1],
    changePct: first[1] ? (100 * (last[1] - first[1])) / Math.abs(first[1]) : null,
    annualPct: growth,
    peak: good.reduce((best, p) => (p[1] > best[1] ? p : best), good[0]),
    trough: good.reduce((best, p) => (p[1] < best[1] ? p : best), good[0]),
  };
}

export function countryStanding(code, { lowerBetter = false } = {}) {
  const rows = countryRows
    .map(([name, iso, values]) => ({ name, iso, year: values[code]?.[0], value: values[code]?.[1] }))
    .filter((r) => Number.isFinite(r.value));
  if (!rows.length) return null;
  const sorted = rows.sort((a, b) => (lowerBetter ? a.value - b.value : b.value - a.value));
  const index = sorted.findIndex((r) => r.iso === 'JPN');
  if (index < 0) return null;
  return { rank: index + 1, total: sorted.length, year: sorted[index].year, value: sorted[index].value, lowerBetter, leader: sorted[0] };
}

const ordinal = (n) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`;
};

export function standingText(standing) {
  if (!standing) return '—';
  const { rank, total, lowerBetter } = standing;
  if (rank === 1) return lowerBetter ? `lowest of ${total}` : `highest of ${total}`;
  if (rank === total) return lowerBetter ? `highest of ${total}` : `lowest of ${total}`;
  return lowerBetter ? `${ordinal(rank)} lowest` : `${ordinal(rank)} of ${total}`;
}

export const genderRatio = (p) => (100 * p.female2020) / p.male2020;

export function genderLeaders(limit = 6) {
  return [...prefectures].sort((a, b) => genderRatio(b) - genderRatio(a)).slice(0, limit);
}

export function genderFollowers(limit = 6) {
  return [...prefectures].sort((a, b) => genderRatio(a) - genderRatio(b)).slice(0, limit);
}

export function nationalGender() {
  const male = prefectures.reduce((sum, p) => sum + p.male2020, 0);
  const female = prefectures.reduce((sum, p) => sum + p.female2020, 0);
  return { male, female, share: (100 * female) / (male + female), per100: (100 * female) / male };
}
