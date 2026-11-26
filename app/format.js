const integer = new Intl.NumberFormat('en-US');
const short = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 });

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const fmtInt = (n) => integer.format(Math.round(n));

export const fmtCompact = (n) => short.format(n);

export const fmtFixed = (n, digits = 2) => Number(n).toFixed(digits);

export const fmtSigned = (n, digits = 1) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmtFixed(Math.abs(n), digits)}`;

export function fmtValue(value, info = {}, digitsOverride) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const digits = digitsOverride ?? info.digits ?? 2;
  switch (info.kind) {
    case 'money':
      return `$${fmtCompact(n)}`;
    case 'dollar':
      return `$${fmtInt(n)}`;
    case 'percent':
      return `${fmtFixed(n, digits)}%`;
    case 'integer':
      return fmtInt(n);
    default:
      return fmtFixed(n, digits);
  }
}

export function axisValue(value, kind = 'number') {
  const n = Number(value);
  if (kind === 'money') return `$${fmtCompact(n)}`;
  if (kind === 'percent') return `${fmtFixed(n, 1)}%`;
  if (kind === 'integer') return fmtCompact(n);
  if (Math.abs(n) >= 100) return fmtInt(n);
  return fmtFixed(n, n < 10 ? 1 : 0);
}

export const years = (values) => values.map((v) => v[0]);

export function sliceYears(values, start, end) {
  return values.filter((v) => v[0] >= start && v[0] <= end && Number.isFinite(v[1]));
}

export function extent(values) {
  const nums = values.map((v) => v[1]).filter(Number.isFinite);
  return nums.length ? [Math.min(...nums), Math.max(...nums)] : [0, 1];
}
