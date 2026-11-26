import { prefRows, prefFields } from './data.js';
import { fmtInt, fmtFixed, fmtSigned } from './format.js';

const ix = Object.fromEntries(prefFields.map((key, i) => [key, i]));

export const prefectures = prefRows.map((r) => ({
  code: r[ix.code],
  nameJa: r[ix.nameJa],
  nameEn: r[ix.nameEn],
  population2020: r[ix.population2020],
  male2020: r[ix.male2020],
  female2020: r[ix.female2020],
  population2015: r[ix.population2015],
  change2015: r[ix.change2015],
  changePct2015: r[ix.changePct2015],
  areaKm2: r[ix.areaKm2],
  density: r[ix.density],
  averageAge: r[ix.averageAge],
  medianAge: r[ix.medianAge],
}));

export const regionGroups = [
  { id: 'hokkaido', name: 'Hokkaido', codes: [1] },
  { id: 'tohoku', name: 'Tohoku', codes: [2, 3, 4, 5, 6, 7] },
  { id: 'kanto', name: 'Kanto', codes: [8, 9, 10, 11, 12, 13, 14] },
  { id: 'chubu', name: 'Chubu', codes: [15, 16, 17, 18, 19, 20, 21, 22, 23] },
  { id: 'kansai', name: 'Kansai', codes: [24, 25, 26, 27, 28, 29, 30] },
  { id: 'chugoku', name: 'Chugoku', codes: [31, 32, 33, 34, 35] },
  { id: 'shikoku', name: 'Shikoku', codes: [36, 37, 38, 39] },
  { id: 'kyushu', name: 'Kyushu & Okinawa', codes: [40, 41, 42, 43, 44, 45, 46, 47] },
];

const regionOfCode = new Map(regionGroups.flatMap((g) => g.codes.map((c) => [c, g])));

export const regionName = (p) => regionOfCode.get(p.code)?.name ?? 'Other';

export const prefMetrics = {
  population2020: { label: 'Population, 2020', short: 'Residents', value: (p) => p.population2020, format: (v) => fmtInt(v), axis: 'integer' },
  density: { label: 'People per km², 2020', short: 'Density', value: (p) => p.density, format: (v) => fmtInt(v), axis: 'number' },
  averageAge: { label: 'Average age, 2020', short: 'Average age', value: (p) => p.averageAge, format: (v) => fmtFixed(v, 1), axis: 'number' },
  medianAge: { label: 'Median age, 2020', short: 'Median age', value: (p) => p.medianAge, format: (v) => fmtFixed(v, 1), axis: 'number' },
  changePct2015: { label: 'Population change, 2015–2020', short: 'Change', value: (p) => p.changePct2015, format: (v) => `${fmtSigned(v, 1)}%`, axis: 'percent' },
  femaleShare: { label: 'Female share, 2020', short: 'Female share', value: (p) => (100 * p.female2020) / p.population2020, format: (v) => fmtFixed(v, 1) + '%', axis: 'percent' },
  areaKm2: { label: 'Land area, 2020', short: 'Area', value: (p) => p.areaKm2, format: (v) => `${fmtInt(v)} km²`, axis: 'number' },
};

const searchText = (p) => `${p.nameEn} ${p.nameJa} ${p.code} ${regionName(p)}`.toLowerCase();

export function selectPrefs({ region = 'all', query = '', metric = 'population2020', direction = 'desc', limit = 0 } = {}) {
  const wanted = regionGroups.find((g) => g.id === region);
  const needle = query.trim().toLowerCase();
  const rows = prefectures.filter((p) => (!wanted || wanted.codes.includes(p.code)) && (!needle || searchText(p).includes(needle)));
  const get = prefMetrics[metric]?.value ?? prefMetrics.population2020.value;
  const sign = direction === 'asc' ? 1 : -1;
  rows.sort((a, b) => sign * (get(a) - get(b)) || a.code - b.code);
  return limit ? rows.slice(0, limit) : rows;
}

export function aggregatePrefs(rows) {
  const pop = rows.reduce((a, p) => a + p.population2020, 0);
  const pop15 = rows.reduce((a, p) => a + p.population2015, 0);
  const area = rows.reduce((a, p) => a + p.areaKm2, 0);
  const wavg = (key) => rows.reduce((a, p) => a + p[key] * p.population2020, 0) / (pop || 1);
  return {
    count: rows.length,
    population: pop,
    change: pop - pop15,
    changePct: pop15 ? (100 * (pop - pop15)) / pop15 : 0,
    area,
    density: pop / (area || 1),
    averageAge: wavg('averageAge'),
    medianAge: wavg('medianAge'),
    femaleShare: (100 * rows.reduce((a, p) => a + p.female2020, 0)) / (pop || 1),
  };
}

export function quantiles(rows, metric) {
  const get = prefMetrics[metric]?.value ?? prefMetrics.population2020.value;
  const values = rows.map(get).sort((a, b) => a - b);
  const map = new Map();
  rows.forEach((p) => {
    const v = get(p);
    let lo = 0;
    let hi = values.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (values[mid] < v) lo = mid + 1;
      else hi = mid;
    }
    map.set(p.code, Math.min(5, Math.floor((5 * lo) / Math.max(1, values.length - 1))));
  });
  return map;
}
