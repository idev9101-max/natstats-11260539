export const routes = [
  { id: 'overview', n: '01', label: 'Overview', title: 'National dashboard', note: 'A compact reading of Japan across ten public-data themes.' },
  { id: 'population', n: '02', label: 'Population & demographics', title: 'People and age', note: 'Census counts, sex split, age, density and long-run population.' },
  { id: 'economy', n: '03', label: 'Economy & labor', title: 'Output and work', note: 'GDP, growth, income and unemployment with country context.' },
  { id: 'prices', n: '04', label: 'Prices & households', title: 'Prices and household lens', note: 'Consumer inflation in long run and across countries.' },
  { id: 'health', n: '05', label: 'Health & education', title: 'Health and learning', note: 'Life expectancy, fertility and public education spending.' },
  { id: 'energy', n: '06', label: 'Energy & environment', title: 'Energy and emissions', note: 'Renewable electricity and carbon per person.' },
  { id: 'regions', n: '07', label: 'Prefectures', title: 'Regional atlas', note: 'All 47 prefectures from the 2020 census, grouped by region.' },
  { id: 'explorer', n: '08', label: 'Time-series explorer', title: 'Explore the archive', note: 'Every World Bank series, with years, scaling and local exports.' },
  { id: 'rankings', n: '09', label: 'Rankings & compare', title: 'Rank and compare', note: 'Sortable prefecture leagues and Japan against peer countries.' },
  { id: 'methodology', n: '10', label: 'Data & methodology', title: 'Sources and methods', note: 'Provenance, definitions, caveats and complete local downloads.' },
];

const groups = [
  { label: 'Read', ids: ['overview', 'population', 'economy', 'prices', 'health', 'energy'] },
  { label: 'Explore', ids: ['regions', 'explorer', 'rankings'] },
  { label: 'Reference', ids: ['methodology'] },
];

const byId = new Map(routes.map((r) => [r.id, r]));

export function currentRoute() {
  const id = location.hash.match(/^#\/([a-z-]+)/)?.[1];
  return byId.has(id) ? id : 'overview';
}

export function routeMeta(id) {
  return byId.get(id) ?? byId.get('overview');
}

export function ensureHash() {
  if (!/^#\//.test(location.hash)) history.replaceState(null, '', '#/overview');
}

export function navHtml(active) {
  return groups
    .map(
      (group) => `<div class="nav-group"><div class="nav-label">${group.label}</div>${group.ids
        .map((id) => {
          const r = byId.get(id);
          return `<a class="nav-link${id === active ? ' active' : ''}" href="#/${id}"${id === active ? ' aria-current="page"' : ''}><span class="nav-n">${r.n}</span><span>${r.label}</span></a>`;
        })
        .join('')}</div>`,
    )
    .join('');
}
