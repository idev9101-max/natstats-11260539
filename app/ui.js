import { meta, indicators, series, countryRows } from './data.js';
import { prefectures, regionGroups, prefMetrics, regionName, selectPrefs, aggregatePrefs, quantiles } from './regions.js';
import { lineChart, barChart, scatterChart, sparkline, tileCartogram, prefHeatmap } from './charts.js';
import {
  decadeTrends, peakOf, countryStanding, standingText, genderLeaders, genderFollowers, genderRatio, nationalGender, windowStats,
} from './analytics.js';
import { esc, fmtInt, fmtCompact, fmtFixed, fmtValue, fmtSigned, sliceYears, years } from './format.js';
import { routeMeta } from './router.js';

const CENSUS = '2020 Census of Japan prefecture table';
const WDI = 'World Bank World Development Indicators';

const latest = (code) => series[code][series[code].length - 1];
const at = (code, year) => series[code].find((p) => p[0] === year)?.[1] ?? null;
const country = (iso) => countryRows.find((c) => c[1] === iso) ?? countryRows[0];
const census = aggregatePrefs(prefectures);
const femaleTotal = prefectures.reduce((sum, p) => sum + p.female2020, 0);

function note(label, year) {
  return `<p class="source-note">Source: ${esc(label)} · ${esc(year)}</p>`;
}

function pageHead(route, badge) {
  return `<header class="page-head"><div><div class="eyebrow">${route.n} / ${esc(badge)}</div><h1>${esc(route.title)}</h1><p>${esc(route.note)}</p></div><div class="page-stamp"><span>JAPAN</span><strong>47</strong><small>prefectures</small></div></header>`;
}

function kpi(title, value, detail, source, spark = [], color = 'var(--accent)') {
  return `<article class="kpi"><div class="kpi-top"><span>${esc(title)}</span>${sparkline(spark, { color })}</div><strong>${esc(value)}</strong><div class="kpi-detail">${detail}</div>${note(...source)}</article>`;
}

function panel(title, body, source, extra = '', head = '') {
  return `<section class="panel ${extra}"><div class="panel-head"><h2>${esc(title)}</h2>${head}</div>${body}${source ? note(...source) : ''}</section>`;
}

function rankList(items, { format = (v) => esc(v), color = 'var(--accent)' } = {}) {
  const values = items.map((i) => Number(i.value));
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return `<ol class="rank-list">${items
    .map(
      (item, i) => `<li><span class="rl-rank">${String(i + 1).padStart(2, '0')}</span><span class="rl-name">${esc(item.label)}</span><span class="rl-bar"><i style="width:${fmtFixed(((Number(item.value) - lo) / (hi - lo || 1)) * 100 + 8, 1)}%;background:${color}"></i></span><b>${format(item.value)}</b></li>`,
    )
    .join('')}</ol>`;
}

function derivedCard(label, value, detail, spark = [], color = 'var(--accent)') {
  return `<div class="derived"><span>${esc(label)}</span><strong>${esc(value)}</strong><div>${detail}</div>${sparkline(spark, { color, width: 70, height: 20 })}</div>`;
}

function standingCard(label, code, info, options = {}, color = 'var(--accent)') {
  const s = countryStanding(code, options);
  if (!s) return '';
  return `<div class="peer-card"><span>${esc(label)} · ${s.year}</span><strong style="color:${color}">${esc(fmtValue(s.value, info))}</strong><em>${esc(standingText(s))}</em></div>`;
}

function selectControl(id, label, options, value) {
  return `<label class="field"><span>${esc(label)}</span><select id="${id}">${options
    .map(([v, text]) => `<option value="${esc(v)}"${String(v) === String(value) ? ' selected' : ''}>${esc(text)}</option>`)
    .join('')}</select></label>`;
}

function segmented(attr, options, active) {
  return `<div class="segmented" role="group">${options
    .map(([v, text]) => `<button type="button" data-${attr}="${esc(v)}" aria-pressed="${v === active}" class="${v === active ? 'on' : ''}">${esc(text)}</button>`)
    .join('')}</div>`;
}

function table(headers, rows, className = '') {
  return `<div class="table-wrap"><table class="${className}"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

const indicatorOptions = (topic) =>
  Object.entries(indicators)
    .filter(([code, info]) => !topic || info.topic === topic || (topic === 'labor' && info.topic === 'economy'))
    .map(([code, info]) => [code, `${info.short} · ${info.unit}`]);

const regionOptions = [['all', 'All regions'], ...regionGroups.map((g) => [g.id, g.name])];
const countryOptions = countryRows.map((c) => [c[1], c[0]]);

function compareTable(codes, iso) {
  const other = country(iso);
  const rows = codes.map((code) => {
    const info = indicators[code];
    const [jy, jv] = latest(code);
    const [cy, cv] = other[2][code];
    return `<tr><th>${esc(info.short)}</th><td>${fmtValue(jv, info)} <span class="yr">${jy}</span></td><td>${fmtValue(cv, info)} <span class="yr">${cy}</span></td><td class="muted">${esc(info.unit)}</td></tr>`;
  });
  return table(['Measure', 'Japan', esc(other[0]), 'Unit'], rows, 'compare-table');
}

function scatter(codes, iso) {
  const xCode = codes[0];
  const yCode = codes[1];
  const points = countryRows.map((c) => ({
    x: c[2][xCode][1],
    y: c[2][yCode][1],
    label: c[0],
    tag: c[1],
    xText: `${fmtValue(c[2][xCode][1], indicators[xCode])} (${c[2][xCode][0]})`,
    yText: `${fmtValue(c[2][yCode][1], indicators[yCode])} (${c[2][yCode][0]})`,
    highlight: c[1] === 'JPN' || c[1] === iso,
  }));
  return scatterChart(points, {
    xLabel: `${indicators[xCode].short} (${latest(xCode)[0]})`,
    yLabel: `${indicators[yCode].short} (${latest(yCode)[0]})`,
    xKind: indicators[xCode].kind,
    yKind: indicators[yCode].kind,
  });
}

function overview() {
  const pop = latest('SP.POP.TOTL');
  const gdpPc = latest('NY.GDP.PCAP.CD');
  const life = latest('SP.DYN.LE00.IN');
  const growth = latest('SP.POP.GROW');
  const gdpGrowth = latest('NY.GDP.MKTP.KD.ZG');
  const gender = nationalGender();
  const shrinking = prefectures.filter((p) => p.change2015 < 0).length;
  const peakPop = peakOf('SP.POP.TOTL');
  const regionPops = regionGroups.map((g) => aggregatePrefs(prefectures.filter((p) => g.codes.includes(p.code))).population);
  const heatMetric = prefMetrics.changePct2015;
  const heatQ = quantiles(prefectures, 'changePct2015');
  const fastestFall = selectPrefs({ metric: 'changePct2015', direction: 'asc', limit: 1 })[0];
  const fastestRise = selectPrefs({ metric: 'changePct2015', limit: 1 })[0];
  const ladder = [
    ...selectPrefs({ metric: 'changePct2015', limit: 5 }),
    ...selectPrefs({ metric: 'changePct2015', direction: 'asc', limit: 5 }),
  ].sort((a, b) => b.changePct2015 - a.changePct2015);
  const densityLeaders = selectPrefs({ metric: 'density', limit: 6 });
  const ageLeaders = selectPrefs({ metric: 'averageAge', limit: 6 });
  const genderRows = [...genderLeaders(3), ...genderFollowers(3)].map((p) => ({
    label: p.nameEn,
    value: genderRatio(p),
  }));
  const popDecades = decadeTrends('SP.POP.TOTL');
  const gdpByStart = new Map(decadeTrends('NY.GDP.PCAP.CD').map((d) => [d.start, d]));
  const decadeRows = popDecades.map((d) => {
    const g = gdpByStart.get(d.start);
    return `<tr><th>${d.start}–${d.end}</th><td class="${d.changePct < 0 ? 'neg' : 'pos'}">${fmtSigned(d.changePct, 1)}%</td><td>${g ? fmtSigned(g.changePct, 1) + '%' : '—'}</td></tr>`;
  });
  return `<header class="page-head dash-head">
    <div><div class="eyebrow">01 / CENSUS 2020 · WDI LATEST</div><h1>Japan data observatory</h1><p>47 prefectures · ${Object.keys(indicators).length} indicators · two sources, each figure dated.</p></div>
    <div class="head-stats">
      <div><b>${fmtInt(pop[1])}</b><span>WDI population · ${pop[0]}</span></div>
      <div><b>${fmtCompact(census.population)}</b><span>Census total · 2020</span></div>
      <div><b>${peakPop[0]} · ${fmtCompact(peakPop[1])}</b><span>Population peak · WDI</span></div>
    </div>
  </header>
  <div class="dash-kpis">
    ${kpi('Census residents · 2020', fmtCompact(census.population), `47 prefectures · ${fmtSigned(census.changePct, 2)}% since 2015`, [CENSUS, '2020'], regionPops)}
    ${kpi('Population · WDI', fmtCompact(pop[1]), `${fmtSigned(growth[1], 3)}% in ${growth[0]}`, [WDI, `${pop[0]}`], sliceYears(series['SP.POP.TOTL'], 2000, 2025).map((p) => p[1]))}
    ${kpi('GDP / person', fmtValue(gdpPc[1], indicators['NY.GDP.PCAP.CD']), `${standingText(countryStanding('NY.GDP.PCAP.CD'))} · ${gdpGrowth[0]} growth ${fmtValue(gdpGrowth[1], indicators['NY.GDP.MKTP.KD.ZG'])}`, [WDI, `${gdpPc[0]}`], sliceYears(series['NY.GDP.PCAP.CD'], 1990, 2025).map((p) => p[1]), 'var(--gold)')}
    ${kpi('Life expectancy', fmtValue(life[1], indicators['SP.DYN.LE00.IN']), `${standingText(countryStanding('SP.DYN.LE00.IN'))} · ${life[0]}`, [WDI, `${life[0]}`], sliceYears(series['SP.DYN.LE00.IN'], 1990, 2024).map((p) => p[1]), 'var(--teal)')}
    ${kpi('Prefectures shrinking', `${shrinking} / 47`, `${fmtSigned(census.change, 0)} residents · 2015–20`, [CENSUS, '2015–2020'], prefectures.map((p) => p.changePct2015), 'var(--coral)')}
    ${kpi('Female share · census', `${fmtFixed(gender.share, 2)}%`, `${fmtFixed(gender.per100, 1)} women per 100 men`, [CENSUS, '2020'], prefectures.map((p) => (100 * p.female2020) / p.population2020), 'var(--series-3)')}
  </div>
  <div class="dash-grid">
    ${panel('National series · 1960–2025', `<div class="mini-series">
      <div class="mini-series-title"><span>Population</span><b>${fmtCompact(pop[1])} · ${pop[0]}</b></div>
      ${lineChart([{ name: 'Japan population', values: series['SP.POP.TOTL'], color: 'var(--accent)' }], { width: 420, height: 74, padLeft: 44, padTop: 6, padBottom: 17, yTicks: 3, xTicks: 4, kind: 'integer' })}
      <div class="mini-series-title"><span>GDP per person</span><b>${fmtValue(gdpPc[1], indicators['NY.GDP.PCAP.CD'])} · ${gdpPc[0]}</b></div>
      ${lineChart([{ name: 'GDP per capita', values: series['NY.GDP.PCAP.CD'], color: 'var(--gold)' }], { width: 420, height: 74, padLeft: 44, padTop: 6, padBottom: 17, yTicks: 3, xTicks: 4, kind: 'dollar' })}
    </div>`, [WDI, 'Population and GDP per person · 1960–2025'], 'dpanel a-series')}
    ${panel('Change ladder · 2015–20', barChart(ladder.map((p) => ({ label: p.nameEn, value: p.changePct2015, color: p.changePct2015 < 0 ? 'var(--coral)' : 'var(--teal)' })), { width: 330, labelW: 96, valueW: 54, rowH: 15, labelChars: 13, format: (v) => `${fmtSigned(v, 1)}%`, aria: 'Fastest growing and fastest shrinking prefectures, 2015 to 2020' }), [CENSUS, 'Percent change from 2015 · top 5 and bottom 5'], 'dpanel a-ladder', `<span class="panel-tag">10 pref.</span>`)}
    ${panel('47-prefecture heatmap', `<div class="heat-callout"><span>Fall <b>${esc(fastestFall.nameEn)} ${fmtSigned(fastestFall.changePct2015, 1)}%</b></span><span>Rise <b>${esc(fastestRise.nameEn)} ${fmtSigned(fastestRise.changePct2015, 1)}%</b></span></div>${prefHeatmap(prefectures, heatMetric, heatQ)}`, [CENSUS, '2020 · code order · 2015–2020 change'], 'dpanel a-heat', `<span class="panel-tag">47 / 47</span>`)}
    ${panel(`Decades · peak ${peakPop[0]}`, table(['Years', 'People', 'GDP / person'], decadeRows, 'micro-table'), [WDI, 'Decade endpoints from embedded series'], 'dpanel b-decades')}
    ${panel('Density leaders', barChart(densityLeaders.map((p) => ({ label: p.nameEn, value: p.density })), { width: 245, labelW: 76, valueW: 50, rowH: 20, labelChars: 11, format: fmtInt, aria: 'Highest population density among prefectures, 2020' }), [CENSUS, '2020 · residents per km²'], 'dpanel b-density', `<span class="panel-tag">national ${fmtFixed(census.density, 0)}/km²</span>`)}
    ${panel('Age leaders', rankList(ageLeaders.map((p) => ({ label: p.nameEn, value: p.averageAge })), { format: (v) => `${fmtFixed(v, 1)} y`, color: 'var(--gold)' }), [CENSUS, '2020 · population-weighted national average ' + fmtFixed(census.averageAge, 1)], 'dpanel b-age')}
    ${panel('Gender balance', rankList(genderRows, { format: (v) => fmtFixed(v, 1), color: 'var(--teal)' }), [CENSUS, '2020 · women per 100 men · top 3 and bottom 3'], 'dpanel b-gender', `<span class="panel-tag">${fmtFixed(gender.per100, 1)} / 100</span>`)}
    ${panel('Japan against 15 countries', `<div class="peer-strip">
      ${standingCard('Life expectancy', 'SP.DYN.LE00.IN', indicators['SP.DYN.LE00.IN'], {}, 'var(--teal)')}
      ${standingCard('GDP / person', 'NY.GDP.PCAP.CD', indicators['NY.GDP.PCAP.CD'], {}, 'var(--gold)')}
      ${standingCard('Unemployment', 'SL.UEM.TOTL.ZS', indicators['SL.UEM.TOTL.ZS'], { lowerBetter: true }, 'var(--teal)')}
      ${standingCard('Fertility', 'SP.DYN.TFRT.IN', indicators['SP.DYN.TFRT.IN'], { lowerBetter: true }, 'var(--coral)')}
      ${standingCard('CO₂ / person', 'EN.GHG.CO2.PC.CE.AR5', indicators['EN.GHG.CO2.PC.CE.AR5'], {}, 'var(--coral)')}
      ${standingCard('Renewable power', 'EG.ELC.RNEW.ZS', indicators['EG.ELC.RNEW.ZS'], {}, 'var(--series-3)')}
    </div>`, [WDI, 'Latest available year shown in each card'], 'dpanel c-peers', `<span class="panel-tag">rank by value</span>`)}
  </div>`;
}

function population() {
  const a = census;
  const changeRows = selectPrefs({ metric: 'changePct2015', direction: 'asc', limit: 8 }).map(
    (p) => `<tr><th>${esc(p.nameEn)}</th><td>${esc(regionName(p))}</td><td>${fmtInt(p.population2015)}</td><td>${fmtInt(p.population2020)}</td><td class="neg">${fmtSigned(p.changePct2015, 1)}%</td></tr>`,
  );
  const ageRows = selectPrefs({ metric: 'averageAge', limit: 8 }).map(
    (p) => `<tr><th>${esc(p.nameEn)}</th><td>${fmtFixed(p.averageAge, 1)}</td><td>${fmtFixed(p.medianAge, 1)}</td><td>${fmtFixed(p.density, 1)}</td></tr>`,
  );
  const maleShare = (100 * prefectures.reduce((s, p) => s + p.male2020, 0)) / a.population;
  return `${pageHead(routeMeta('population'), 'CENSUS 2020 · WDI')}
  <div class="kpi-grid">
    ${kpi('Residents · census', fmtCompact(a.population), `${fmtInt(61349581)} male · ${fmtInt(64796518)} female`, [CENSUS, '2020'], [])}
    ${kpi('Change since 2015', `${fmtSigned(a.change, 0)}`, `${fmtSigned(a.changePct, 2)}% across 47 prefectures`, [CENSUS, '2015–2020'], [])}
    ${kpi('Average age', fmtFixed(a.averageAge, 2), `Population-weighted across prefectures`, [CENSUS, '2020'], [])}
    ${kpi('Population density', `${fmtFixed(a.density, 1)} / km²`, `${fmtInt(a.area)} km² of land in table`, [CENSUS, '2020'], [])}
  </div>
  <div class="grid">
    ${panel('Population since 1960', lineChart([{ name: 'Population total', values: series['SP.POP.TOTL'], color: 'var(--accent)' }], { height: 235, kind: 'integer' }), [WDI, '1960–2025 · latest 2025'], 'span-7')}
    ${panel('Sex split, 2020 census', `<div class="split-wrap"><div class="split-bar"><span style="width:${fmtFixed(maleShare, 2)}%"></span><span style="width:${fmtFixed(100 - maleShare, 2)}%"></span></div><div class="split-legend"><span><b>${fmtFixed(maleShare, 1)}%</b> male · ${fmtInt(61349581)}</span><span><b>${fmtFixed(100 - maleShare, 1)}%</b> female · ${fmtInt(64796518)}</span></div></div>`, [CENSUS, '2020'], 'span-5')}
    ${panel('Eight steepest declines, 2015–2020', barChart(selectPrefs({ metric: 'changePct2015', direction: 'asc', limit: 8 }).map((p) => ({ label: p.nameEn, value: p.changePct2015, color: 'var(--coral)' })), { format: (v) => `${fmtSigned(v, 1)}%`, labelChars: 16, rowH: 24, width: 620 }), [CENSUS, 'change 2015–2020'], 'span-6')}
    ${panel('Fertility, 1960–2024', lineChart([{ name: 'Births per woman', values: series['SP.DYN.TFRT.IN'], color: 'var(--teal)' }], { height: 218, kind: 'number' }), [WDI, '1960–2024 · latest 2024'], 'span-6')}
    ${panel('Largest population losses', table(['Prefecture', 'Region', '2015', '2020', 'Change'], changeRows), [CENSUS, '2015 and 2020'], 'span-6')}
    ${panel('Oldest prefectures', table(['Prefecture', 'Average age', 'Median age', 'People / km²'], ageRows), [CENSUS, '2020'], 'span-6')}
  </div>`;
}

function economy(state) {
  const gdp = latest('NY.GDP.MKTP.CD');
  const pc = latest('NY.GDP.PCAP.CD');
  const growth = latest('NY.GDP.MKTP.KD.ZG');
  const unemp = latest('SL.UEM.TOTL.ZS');
  const bars = countryRows
    .slice()
    .sort((a, b) => b[2]['NY.GDP.PCAP.CD'][1] - a[2]['NY.GDP.PCAP.CD'][1])
    .map((c) => ({ label: c[0], value: c[2]['NY.GDP.PCAP.CD'][1], color: c[1] === 'JPN' ? 'var(--coral)' : 'var(--accent)' }));
  return `${pageHead(routeMeta('economy'), 'WDI · LATEST YEARS')}
  <div class="kpi-grid">
    ${kpi('GDP · current US$', fmtValue(gdp[1], indicators['NY.GDP.MKTP.CD']), `Annual growth ${fmtValue(growth[1], indicators['NY.GDP.MKTP.KD.ZG'])}`, [WDI, `${gdp[0]}`], sliceYears(series['NY.GDP.MKTP.CD'], 2000, 2025).map((p) => p[1]), 'var(--gold)')}
    ${kpi('GDP per person', fmtValue(pc[1], indicators['NY.GDP.PCAP.CD']), `Latest observation ${pc[0]}`, [WDI, `${pc[0]}`], sliceYears(series['NY.GDP.PCAP.CD'], 1990, 2025).map((p) => p[1]), 'var(--gold)')}
    ${kpi('GDP growth', fmtValue(growth[1], indicators['NY.GDP.MKTP.KD.ZG']), `Annual percent, ${growth[0]}`, [WDI, `${growth[0]}`], sliceYears(series['NY.GDP.MKTP.KD.ZG'], 2000, 2025).map((p) => p[1]))}
    ${kpi('Unemployment', fmtValue(unemp[1], indicators['SL.UEM.TOTL.ZS']), `Percent of labour force, ${unemp[0]}`, [WDI, `${unemp[0]}`], sliceYears(series['SL.UEM.TOTL.ZS'], 1991, 2025).map((p) => p[1]), 'var(--teal)')}
  </div>
  <div class="grid">
    ${panel('GDP per person, 1960–2025', lineChart([{ name: 'GDP per capita', values: series['NY.GDP.PCAP.CD'], color: 'var(--gold)' }], { height: 225, kind: 'dollar' }), [WDI, '1960–2025 · latest 2025'], 'span-7')}
    ${panel('GDP per person across 15 countries', barChart(bars, { format: (v) => `$${fmtInt(v)}`, labelChars: 17, rowH: 22, width: 560 }), [WDI, `${pc[0]}`], 'span-5')}
    ${panel('Unemployment since 1991', lineChart([{ name: 'Unemployment', values: series['SL.UEM.TOTL.ZS'], color: 'var(--teal)' }], { height: 200, kind: 'percent' }), [WDI, '1991–2025 · latest 2025'], 'span-6')}
    ${panel('GDP growth since 1961', lineChart([{ name: 'GDP growth', values: series['NY.GDP.MKTP.KD.ZG'], color: 'var(--coral)' }], { height: 200, kind: 'percent' }), [WDI, '1961–2025 · latest 2025'], 'span-6')}
    ${panel('Japan against a peer', compareTable(['NY.GDP.PCAP.CD', 'NY.GDP.MKTP.KD.ZG', 'SL.UEM.TOTL.ZS', 'FP.CPI.TOTL.ZG'], state.compareCountry), [WDI, 'Latest year of each measure shown per row'], 'span-12', selectControl('compare-country', 'Comparison country', countryOptions, state.compareCountry))}
  </div>`;
}

function prices() {
  const cpi = latest('FP.CPI.TOTL.ZG');
  const bars = countryRows
    .slice()
    .sort((a, b) => b[2]['FP.CPI.TOTL.ZG'][1] - a[2]['FP.CPI.TOTL.ZG'][1])
    .map((c) => ({ label: c[0], value: c[2]['FP.CPI.TOTL.ZG'][1], color: c[1] === 'JPN' ? 'var(--coral)' : 'var(--accent)' }));
  const household = ['SP.POP.GROW', 'NY.GDP.PCAP.CD', 'SP.DYN.TFRT.IN', 'SL.UEM.TOTL.ZS'].map((code) => {
    const [year, value] = latest(code);
    return `<tr><th>${esc(indicators[code].short)}</th><td>${fmtValue(value, indicators[code])}</td><td>${year}</td></tr>`;
  });
  return `${pageHead(routeMeta('prices'), 'WDI · CONSUMER PRICES')}
  <div class="kpi-grid">
    ${kpi('Consumer inflation', fmtValue(cpi[1], indicators['FP.CPI.TOTL.ZG']), `Annual percent in ${cpi[0]}`, [WDI, `${cpi[0]}`], sliceYears(series['FP.CPI.TOTL.ZG'], 2000, 2025).map((p) => p[1]))}
    ${kpi('Inflation · 2020', fmtValue(at('FP.CPI.TOTL.ZG', 2020), indicators['FP.CPI.TOTL.ZG']), 'Annual percent', [WDI, '2020'], [])}
    ${kpi('Inflation · 1990', fmtValue(at('FP.CPI.TOTL.ZG', 1990), indicators['FP.CPI.TOTL.ZG']), 'Annual percent', [WDI, '1990'], [])}
    ${kpi('GDP per person', fmtValue(latest('NY.GDP.PCAP.CD')[1], indicators['NY.GDP.PCAP.CD']), `Latest year ${latest('NY.GDP.PCAP.CD')[0]}`, [WDI, `${latest('NY.GDP.PCAP.CD')[0]}`], [], 'var(--gold)')}
  </div>
  <div class="grid">
    ${panel('Inflation, 1960–2025', lineChart([{ name: 'Consumer inflation', values: series['FP.CPI.TOTL.ZG'], color: 'var(--coral)' }], { height: 245, kind: 'percent' }), [WDI, '1960–2025 · latest 2025'], 'span-7')}
    ${panel('Inflation across 15 countries', barChart(bars, { format: (v) => `${fmtFixed(v, 2)}%`, labelChars: 17, rowH: 23, width: 560 }), [WDI, `${cpi[0]}`], 'span-5')}
    ${panel('Household context', table(['Measure', 'Japan', 'Year'], household), [WDI, 'Latest year per measure'], 'span-6')}
    ${panel('Reading this section', `<p class="prose">The dataset carries consumer-price inflation, not a household income or spending series. The figures above describe the price environment and purchasing context; they are not a budget survey. Prefectural price levels are not present in the supplied data and are therefore not shown.</p>`, null, 'span-6')}
  </div>`;
}

function health(state) {
  const life = latest('SP.DYN.LE00.IN');
  const fertility = latest('SP.DYN.TFRT.IN');
  const edu = latest('SE.XPD.TOTL.GD.ZS');
  const eduBars = countryRows
    .slice()
    .sort((a, b) => b[2]['SE.XPD.TOTL.GD.ZS'][1] - a[2]['SE.XPD.TOTL.GD.ZS'][1])
    .map((c) => ({ label: c[0], value: c[2]['SE.XPD.TOTL.GD.ZS'][1], color: c[1] === 'JPN' ? 'var(--coral)' : 'var(--accent)' }));
  return `${pageHead(routeMeta('health'), 'WDI · LAGGED SERIES LABELLED')}
  <div class="kpi-grid">
    ${kpi('Life expectancy at birth', fmtValue(life[1], indicators['SP.DYN.LE00.IN']), `Latest available year ${life[0]}`, [WDI, `${life[0]}`], sliceYears(series['SP.DYN.LE00.IN'], 1990, 2024).map((p) => p[1]), 'var(--teal)')}
    ${kpi('Fertility', fmtValue(fertility[1], indicators['SP.DYN.TFRT.IN']), `Births per woman, ${fertility[0]}`, [WDI, `${fertility[0]}`], sliceYears(series['SP.DYN.TFRT.IN'], 1990, 2024).map((p) => p[1]))}
    ${kpi('Education spending', fmtValue(edu[1], indicators['SE.XPD.TOTL.GD.ZS']), `Percent of GDP, ${edu[0]}`, [WDI, `${edu[0]}`], sliceYears(series['SE.XPD.TOTL.GD.ZS'], 1990, 2021).map((p) => p[1]), 'var(--gold)')}
    ${kpi('Median age · census', fmtFixed(census.medianAge, 2), `Population-weighted, 2020`, [CENSUS, '2020'], [])}
  </div>
  <div class="grid">
    ${panel('Life expectancy, 1960–2024', lineChart([{ name: 'Life expectancy', values: series['SP.DYN.LE00.IN'], color: 'var(--teal)' }], { height: 225, kind: 'number' }), [WDI, '1960–2024 · latest 2024'], 'span-7')}
    ${panel('Education spending across countries', barChart(eduBars, { format: (v) => `${fmtFixed(v, 2)}%`, labelChars: 17, rowH: 23, width: 560 }), [WDI, `${edu[0]} · latest available`], 'span-5')}
    ${panel('Income and longevity', scatter(['NY.GDP.PCAP.CD', 'SP.DYN.LE00.IN'], state.compareCountry), [WDI, `GDP per person ${latest('NY.GDP.PCAP.CD')[0]} · life expectancy ${life[0]}`], 'span-7')}
    ${panel('Fertility, 1960–2024', lineChart([{ name: 'Fertility', values: series['SP.DYN.TFRT.IN'], color: 'var(--coral)' }], { height: 210, kind: 'number' }), [WDI, '1960–2024 · latest 2024'], 'span-5')}
  </div>`;
}

function energy(state) {
  const ren = latest('EG.ELC.RNEW.ZS');
  const co2 = latest('EN.GHG.CO2.PC.CE.AR5');
  const ren1990 = at('EG.ELC.RNEW.ZS', 1990);
  const co21970 = at('EN.GHG.CO2.PC.CE.AR5', 1970);
  const co2Bars = countryRows
    .slice()
    .sort((a, b) => b[2]['EN.GHG.CO2.PC.CE.AR5'][1] - a[2]['EN.GHG.CO2.PC.CE.AR5'][1])
    .map((c) => ({ label: c[0], value: c[2]['EN.GHG.CO2.PC.CE.AR5'][1], color: c[1] === 'JPN' ? 'var(--coral)' : 'var(--accent)' }));
  return `${pageHead(routeMeta('energy'), 'WDI · LAGGED SERIES LABELLED')}
  <div class="kpi-grid">
    ${kpi('Renewable electricity', fmtValue(ren[1], indicators['EG.ELC.RNEW.ZS']), `${fmtSigned(ren[1] - ren1990, 1)} points since 1990`, [WDI, `${ren[0]} · latest available`], sliceYears(series['EG.ELC.RNEW.ZS'], 1990, 2021).map((p) => p[1]), 'var(--teal)')}
    ${kpi('CO₂ per person', fmtValue(co2[1], indicators['EN.GHG.CO2.PC.CE.AR5']), `${fmtSigned(co2[1] - co21970, 2)} t since 1970`, [WDI, `${co2[0]}`], sliceYears(series['EN.GHG.CO2.PC.CE.AR5'], 1970, 2024).map((p) => p[1]), 'var(--coral)')}
    ${kpi('Renewables · 1990', fmtValue(ren1990, indicators['EG.ELC.RNEW.ZS']), 'Percent of total output', [WDI, '1990'], [])}
    ${kpi('CO₂ · 1970', fmtValue(co21970, indicators['EN.GHG.CO2.PC.CE.AR5']), 'Tonnes CO₂e per person', [WDI, '1970'], [])}
  </div>
  <div class="grid">
    ${panel('Renewable electricity, 1990–2021', lineChart([{ name: 'Renewable electricity', values: series['EG.ELC.RNEW.ZS'], color: 'var(--teal)' }], { height: 225, kind: 'percent' }), [WDI, '1990–2021 · latest available 2021'], 'span-6')}
    ${panel('CO₂ per person, 1970–2024', lineChart([{ name: 'CO₂ per person', values: series['EN.GHG.CO2.PC.CE.AR5'], color: 'var(--coral)' }], { height: 225, kind: 'number' }), [WDI, '1970–2024 · latest 2024'], 'span-6')}
    ${panel('CO₂ per person across countries', barChart(co2Bars, { format: (v) => `${fmtFixed(v, 1)} t`, labelChars: 17, rowH: 23, width: 620 }), [WDI, `${co2[0]}`], 'span-7')}
    ${panel('Measurement note', `<p class="prose">Renewable electricity is measured as a share of total electricity output and is only available to ${ren[0]}. Carbon is reported per person in tonnes CO₂e excluding land-use change and forestry, latest ${co2[0]}. These years differ; neither is presented as a ${co2[0]} electricity figure.</p>`, [WDI, `${ren[0]} · ${co2[0]}`], 'span-5')}
  </div>`;
}

function regions(state) {
  const metric = prefMetrics[state.prefMetric] ?? prefMetrics.population2020;
  const rows = selectPrefs({ region: state.prefRegion, query: state.prefSearch, metric: state.prefMetric, direction: state.prefDirection });
  const qmap = quantiles(rows, state.prefMetric);
  const selected = prefectures.find((p) => p.code === state.prefSelected) ?? rows[0] ?? prefectures[0];
  const agg = aggregatePrefs(rows);
  const changeLeader = selectPrefs({ metric: 'changePct2015', direction: 'asc', limit: 1 })[0];
  const densityLeader = selectPrefs({ metric: 'density', limit: 1 })[0];
  const ageLeader = selectPrefs({ metric: 'averageAge', limit: 1 })[0];
  const genderLeader = genderLeaders(1)[0];
  const regionTable = regionGroups.map((g) => {
    const a = aggregatePrefs(prefectures.filter((p) => g.codes.includes(p.code)));
    return `<tr><th>${esc(g.name)}</th><td>${a.count}</td><td>${fmtInt(a.population)}</td><td>${fmtSigned(a.changePct, 1)}%</td><td>${fmtFixed(a.density, 1)}</td><td>${fmtFixed(a.averageAge, 1)}</td></tr>`;
  });
  const controls = `<div class="control-row">
    ${selectControl('pref-region', 'Region', regionOptions, state.prefRegion)}
    ${selectControl('pref-metric', 'Tile metric', Object.entries(prefMetrics).map(([k, m]) => [k, m.label]), state.prefMetric)}
    ${selectControl('pref-direction', 'Order', [['desc', 'High to low'], ['asc', 'Low to high']], state.prefDirection)}
    ${selectControl('pref-select', 'Prefecture', prefectures.map((p) => [p.code, `${p.nameEn} · ${p.code}`]), state.prefSelected)}
    <label class="field grow"><span>Search prefectures</span><input id="pref-search" type="search" placeholder="Name, Japanese name or code" value="${esc(state.prefSearch)}" autocomplete="off"></label>
  </div>`;
  return `${pageHead(routeMeta('regions'), '47 PREFECTURES · 2020')}
  ${controls}
  <div class="insight-strip">
    <div><span>Fastest decline · 2015–20</span><b>${esc(changeLeader.nameEn)} ${fmtSigned(changeLeader.changePct2015, 1)}%</b></div>
    <div><span>Density leader · 2020</span><b>${esc(densityLeader.nameEn)} ${fmtInt(densityLeader.density)}/km²</b></div>
    <div><span>Oldest · average age</span><b>${esc(ageLeader.nameEn)} ${fmtFixed(ageLeader.averageAge, 1)} y</b></div>
    <div><span>Highest female ratio</span><b>${esc(genderLeader.nameEn)} ${fmtFixed(genderRatio(genderLeader), 1)} / 100</b></div>
  </div>
  <div class="kpi-grid four">
    ${kpi('Showing', `${rows.length} / 47`, `${esc(regionGroups.find((g) => g.id === state.prefRegion)?.name ?? 'All regions')} · ${esc(metric.short)}`, [CENSUS, '2020'], [])}
    ${kpi('Population in view', fmtCompact(agg.population), `${fmtSigned(agg.change, 0)} since 2015`, [CENSUS, '2015–2020'], [])}
    ${kpi('Density in view', `${fmtFixed(agg.density, 1)} / km²`, `Across ${fmtInt(agg.area)} km²`, [CENSUS, '2020'], [])}
    ${kpi('Average age', fmtFixed(agg.averageAge, 2), `Weighted by 2020 population`, [CENSUS, '2020'], [])}
  </div>
  <div class="grid">
    ${panel('Prefecture tile cartogram', rows.length ? tileCartogram(regionGroups, rows, metric, qmap, selected.code) : '<div class="empty">No prefecture matches this search.</div>', [CENSUS, '2020 · tiles grouped by region, not drawn to geographic scale'], 'span-7')}
    ${panel(`Selected: ${selected.nameEn}`, table(['Measure', 'Value', 'Year'], [
      `<tr><th>Population</th><td>${fmtInt(selected.population2020)}</td><td>2020</td></tr>`,
      `<tr><th>Male / female</th><td>${fmtInt(selected.male2020)} / ${fmtInt(selected.female2020)}</td><td>2020</td></tr>`,
      `<tr><th>Population 2015</th><td>${fmtInt(selected.population2015)}</td><td>2015</td></tr>`,
      `<tr><th>Change</th><td class="${selected.change2015 < 0 ? 'neg' : 'pos'}">${fmtSigned(selected.change2015, 0)} (${fmtSigned(selected.changePct2015, 1)}%)</td><td>2015–20</td></tr>`,
      `<tr><th>Area</th><td>${fmtInt(selected.areaKm2)} km²</td><td>2020</td></tr>`,
      `<tr><th>Density</th><td>${fmtFixed(selected.density, 1)} / km²</td><td>2020</td></tr>`,
      `<tr><th>Average age</th><td>${fmtFixed(selected.averageAge, 1)}</td><td>2020</td></tr>`,
      `<tr><th>Median age</th><td>${fmtFixed(selected.medianAge, 1)}</td><td>2020</td></tr>`,
      `<tr><th>Name</th><td>${esc(selected.nameJa)}</td><td>2020</td></tr>`,
    ], 'detail-table'), [CENSUS, '2020 with 2015 comparison'], 'span-5')}
    ${panel('Regional blocks', table(['Region', 'Pref.', 'Population 2020', 'Change', 'Density', 'Avg age'], regionTable), [CENSUS, '2020; change from 2015'], 'span-12')}
  </div>`;
}

function explorer(state) {
  const code = indicators[state.explorerMetric] ? state.explorerMetric : 'SP.POP.TOTL';
  const info = indicators[code];
  const all = series[code];
  const available = years(all);
  let start = available.includes(state.explorerStart) ? state.explorerStart : available[0];
  let end = available.includes(state.explorerEnd) ? state.explorerEnd : available[available.length - 1];
  if (start > end) [start, end] = [end, start];
  const sliced = sliceYears(all, start, end);
  const base = sliced.length ? sliced[0][1] || 1 : 1;
  const indexed = state.explorerIndex ? sliced.map(([y, v]) => [y, (100 * v) / base]) : sliced;
  const fmt = (v) => (state.explorerIndex ? `${fmtFixed(v, 1)}` : fmtValue(v, info));
  const values = sliced.map((p) => p[1]);
  const stats = windowStats(code, start, end);
  const first = values[0];
  const last = values[values.length - 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const chart =
    state.explorerType === 'bar'
      ? barChart(indexed.slice(-24).map(([y, v]) => ({ label: String(y), value: v })), { format: fmt, labelChars: 6, labelW: 48, rowH: 23, width: 680 })
      : lineChart([{ name: info.short, values: indexed, color: 'var(--accent)' }], { height: 280, kind: state.explorerIndex ? 'number' : info.kind });
  const step = Math.max(1, Math.ceil(sliced.length / 12));
  const sample = sliced.filter((_, i) => i % step === 0 || i === sliced.length - 1);
  const rows = sample.map(([y, v]) => `<tr><th>${y}</th><td>${fmtValue(v, info)}</td><td>${state.explorerIndex ? fmtFixed((100 * v) / first, 1) : fmtFixed(v, info.digits)}</td></tr>`);
  const controls = `<div class="control-row">
    ${selectControl('explorer-metric', 'Indicator', indicatorOptions(), code)}
    ${selectControl('explorer-start', 'From year', available.map((y) => [y, y]), start)}
    ${selectControl('explorer-end', 'To year', available.map((y) => [y, y]), end)}
    <div class="field"><span>Chart</span>${segmented('chart-type', [['line', 'Line'], ['bar', 'Bars']], state.explorerType)}</div>
    <div class="field"><span>Scale</span>${segmented('scale', [['actual', 'Actual'], ['index', 'Index 100']], state.explorerIndex ? 'index' : 'actual')}</div>
  </div>`;
  return `${pageHead(routeMeta('explorer'), 'LOCAL TIME SERIES')}
  ${controls}
  <div class="derived-strip">
    ${derivedCard('Window change', stats && stats.changePct !== null ? `${fmtSigned(stats.changePct, 1)}%` : '—', `${start}–${end} · ${fmtValue(first, info)} → ${fmtValue(last, info)}`, values, 'var(--accent)')}
    ${derivedCard('Annualised rate', stats && stats.annualPct !== null ? `${fmtSigned(stats.annualPct, 2)}% / yr` : '—', stats ? `${stats.first[0]}–${stats.last[0]} · ${stats.span} years` : 'Not defined for this window', values, 'var(--gold)')}
    ${derivedCard('Peak in window', stats ? `${stats.peak[0]} · ${fmtValue(stats.peak[1], info)}` : '—', 'Highest embedded observation in view', values, 'var(--teal)')}
    ${derivedCard('Trough in window', stats ? `${stats.trough[0]} · ${fmtValue(stats.trough[1], info)}` : '—', 'Lowest embedded observation in view', values, 'var(--series-3)')}
  </div>
  <div class="grid">
    ${panel(`${info.short} · ${start}–${end}`, chart, [WDI, `${info.label} · ${available[0]}–${available[available.length - 1]} · observations ${sliced.length}`], 'span-8')}
    ${panel('Selected window', table(['Statistic', 'Value', 'Unit'], [
      `<tr><th>First · ${start}</th><td>${fmtValue(first, info)}</td><td>${esc(info.unit)}</td></tr>`,
      `<tr><th>Last · ${end}</th><td>${fmtValue(last, info)}</td><td>${esc(info.unit)}</td></tr>`,
      `<tr><th>Minimum</th><td>${fmtValue(min, info)}</td><td>${esc(info.unit)}</td></tr>`,
      `<tr><th>Maximum</th><td>${fmtValue(max, info)}</td><td>${esc(info.unit)}</td></tr>`,
      `<tr><th>Change</th><td>${fmtSigned(last - first, info.digits)}</td><td>${esc(info.unit)}</td></tr>`,
    ], 'detail-table'), [WDI, `${start}–${end}`], 'span-4')}
    ${panel('Sampled observations', table(['Year', 'Published value', state.explorerIndex ? 'Index' : 'Formatted'], rows), [WDI, `${start}–${end} · every ${step}${step === 1 ? '' : 'th'} observation`], 'span-7')}
    ${panel('Export this view', `<div class="button-row"><button type="button" class="btn" data-download="explorer" data-format="csv">Download CSV</button><button type="button" class="btn ghost" data-download="explorer" data-format="json">Download JSON</button></div><p class="prose">Files are built in the browser from the embedded series. Nothing is fetched.</p>`, [WDI, `${info.label} · ${start}–${end}`], 'span-5')}
  </div>`;
}

function rankRows(state) {
  const rows = selectPrefs({ region: state.rankRegion, query: state.rankQuery, metric: state.rankMetric, direction: state.rankDir });
  const get = prefMetrics[state.rankMetric]?.value ?? prefMetrics.population2020.value;
  const dir = state.rankDir === 'asc' ? 1 : -1;
  if (state.rankSort === 'name') rows.sort((a, b) => dir * a.nameEn.localeCompare(b.nameEn));
  else if (state.rankSort === 'region') rows.sort((a, b) => dir * regionName(a).localeCompare(regionName(b)) || get(b) - get(a));
  else if (state.rankSort === 'code') rows.sort((a, b) => dir * (a.code - b.code));
  else rows.sort((a, b) => dir * (get(a) - get(b)) || a.code - b.code);
  return rows;
}

function sortButton(state, id, label) {
  const active = state.rankSort === id;
  const arrow = active ? (state.rankDir === 'asc' ? ' ↑' : ' ↓') : '';
  return `<button type="button" class="th-btn${active ? ' on' : ''}" data-sort="${id}" aria-pressed="${active}">${label}${arrow}</button>`;
}

function rankings(state) {
  const metric = prefMetrics[state.rankMetric] ?? prefMetrics.population2020;
  const rows = rankRows(state).slice(0, 20);
  const body = rows.map((p, i) => `<tr><td class="rank-num">${i + 1}</td><td><button type="button" class="row-link" data-pref-goto="${p.code}">${esc(p.nameEn)}</button></td><td>${esc(regionName(p))}</td><td>${metric.format(metric.value(p))}</td><td>${fmtInt(p.population2020)}</td><td>${fmtFixed(p.averageAge, 1)}</td></tr>`);
  const controls = `<div class="control-row">
    ${selectControl('rank-metric', 'Rank by', Object.entries(prefMetrics).map(([k, m]) => [k, m.label]), state.rankMetric)}
    ${selectControl('rank-region', 'Region', regionOptions, state.rankRegion)}
    ${selectControl('rank-direction', 'Order', [['desc', 'High to low'], ['asc', 'Low to high']], state.rankDir)}
    ${selectControl('compare-country', 'Comparison country', countryOptions, state.compareCountry)}
    <label class="field grow"><span>Filter rankings</span><input id="rank-search" type="search" placeholder="Prefecture or region" value="${esc(state.rankQuery)}" autocomplete="off"></label>
  </div>`;
  return `${pageHead(routeMeta('rankings'), 'RANKINGS · COMPARISON')}
  ${controls}
  <div class="grid">
    ${panel(`${metric.label} · top ${rows.length}`, table([sortButton(state, 'rank', '#'), sortButton(state, 'name', 'Prefecture'), sortButton(state, 'region', 'Region'), sortButton(state, 'value', metric.short), sortButton(state, 'code', 'Population'), '<span>Average age</span>'], body, 'rank-table'), [CENSUS, '2020 · 2015 comparison for change metric'], 'span-7')}
    ${panel('Japan vs peer', compareTable(['NY.GDP.PCAP.CD', 'SP.DYN.LE00.IN', 'FP.CPI.TOTL.ZG', 'SL.UEM.TOTL.ZS', 'EN.GHG.CO2.PC.CE.AR5', 'EG.ELC.RNEW.ZS'], state.compareCountry), [WDI, 'Latest year shown in each row'], 'span-5')}
    ${panel('Income and longevity across 15 countries', scatter(['NY.GDP.PCAP.CD', 'SP.DYN.LE00.IN'], state.compareCountry), [WDI, `GDP per person ${latest('NY.GDP.PCAP.CD')[0]} · life expectancy ${latest('SP.DYN.LE00.IN')[0]}`], 'span-7')}
    ${panel('Export current league', `<div class="button-row"><button type="button" class="btn" data-download="ranking" data-format="csv">Download CSV</button><button type="button" class="btn ghost" data-download="ranking" data-format="json">Download JSON</button></div><p class="prose">Exports follow the metric, region, search and order shown above.</p>`, [CENSUS, '2020'], 'span-5')}
  </div>`;
}

function methodology(state) {
  const sources = meta.sources.map((s) => `<article class="source-card"><h3>${esc(s.name)}</h3><p>${esc(s.covers)}</p><code>${esc(s.url)}</code></article>`).join('');
  const dict = Object.entries(indicators).map(([code, info]) => {
    const [year, value] = latest(code);
    return `<tr><th>${esc(info.short)}</th><td><code>${esc(code)}</code></td><td>${fmtValue(value, info)}</td><td>${year}</td><td>${esc(info.unit)}</td></tr>`;
  });
  return `${pageHead(routeMeta('methodology'), 'PROVENANCE · EXPORTS')}
  <div class="grid">
    ${panel('Two primary sources', `<div class="source-grid">${sources}</div>`, null, 'span-12')}
    ${panel('Indicator dictionary', table(['Measure', 'Code', 'Japan latest', 'Year', 'Unit'], dict, 'dictionary-table'), [WDI, 'Latest available year per indicator'], 'span-7')}
    ${panel('Census fields', table(['Field', 'Meaning'], [
      '<tr><th>Population 2020</th><td>Counted residents in each prefecture, 2020.</td></tr>',
      '<tr><th>Male / female 2020</th><td>Sex split of the 2020 count.</td></tr>',
      '<tr><th>Population 2015</th><td>Comparable 2015 census count.</td></tr>',
      '<tr><th>Change</th><td>2020 count minus 2015 count; percent uses 2015 as base.</td></tr>',
      '<tr><th>Area and density</th><td>Area in km² and residents per km² from the source table.</td></tr>',
      '<tr><th>Average / median age</th><td>Reported age statistics for 2020, not modelled here.</td></tr>',
    ], 'detail-table'), [CENSUS, '2020'], 'span-5')}
    ${panel('Caveats', `<ol class="caveats">
      <li>World Bank series end in different years. Life expectancy and fertility end in 2024; renewable electricity and education spending end in 2021; population, GDP, inflation, growth and unemployment end in 2025. Every figure on the site carries its own year.</li>
      <li>The 2020 census prefecture table totals ${fmtInt(census.population)} residents. The WDI 2020 population is ${fmtInt(at('SP.POP.TOTL', 2020))}; different definitions and timing explain the gap. They are never mixed in one series.</li>
      <li>Regional average and median ages shown for grouped regions are population-weighted means of prefecture values. A weighted mean of medians is a summary, not a true pooled median.</li>
      <li>The prefecture mosaic groups tiles by region and code order. It is a cartogram, not a geographic map or an area-scaled cartogram.</li>
      <li>No household income, price-level or school-enrolment series appears in the supplied dataset, so those topics are described only with the indicators that exist.</li>
    </ol>`, [CENSUS, '2020'], 'span-6')}
    ${panel('Local exports', `<div class="export-grid">
      <button type="button" class="btn" data-download="all-series" data-format="csv">All series · CSV</button>
      <button type="button" class="btn ghost" data-download="all-series" data-format="json">All series · JSON</button>
      <button type="button" class="btn" data-download="prefectures" data-format="csv">Prefectures · CSV</button>
      <button type="button" class="btn ghost" data-download="prefectures" data-format="json">Prefectures · JSON</button>
      <button type="button" class="btn" data-download="countries" data-format="csv">Countries · CSV</button>
      <button type="button" class="btn ghost" data-download="countries" data-format="json">Countries · JSON</button>
    </div><p class="prose">Generated with browser Blob URLs from local data; no request is made. Dataset generated ${esc(meta.generated)}.</p>`, [CENSUS, '2020'], 'span-6')}
  </div>`;
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportData(state, which) {
  if (which === 'prefectures') {
    const rows = prefectures.map((p) => ({
      code: p.code,
      name_en: p.nameEn,
      name_ja: p.nameJa,
      region: regionName(p),
      population_2020: p.population2020,
      male_2020: p.male2020,
      female_2020: p.female2020,
      population_2015: p.population2015,
      change_2015_2020: p.change2015,
      change_pct: p.changePct2015,
      area_km2: p.areaKm2,
      density_per_km2: p.density,
      average_age: p.averageAge,
      median_age: p.medianAge,
    }));
    return { rows, name: 'japan-prefectures-2020' };
  }
  if (which === 'countries') {
    const rows = countryRows.flatMap((c) => Object.entries(c[2]).map(([code, [year, value]]) => ({ country: c[0], iso3: c[1], indicator: code, year, value })));
    return { rows, name: 'country-comparison-latest' };
  }
  if (which === 'all-series') {
    const rows = Object.entries(series).flatMap(([code, values]) => values.map(([year, value]) => ({ indicator: code, year, value })));
    return { rows, name: 'japan-all-series' };
  }
  if (which === 'ranking') {
    const metric = prefMetrics[state.rankMetric] ?? prefMetrics.population2020;
    const rows = rankRows(state).map((p, i) => ({ rank: i + 1, code: p.code, name_en: p.nameEn, region: regionName(p), metric: state.rankMetric, value: metric.value(p), population_2020: p.population2020 }));
    return { rows, name: `ranking-${state.rankMetric}` };
  }
  const code = indicators[state.explorerMetric] ? state.explorerMetric : 'SP.POP.TOTL';
  const info = indicators[code];
  const available = years(series[code]);
  const start = available.includes(state.explorerStart) ? state.explorerStart : available[0];
  const end = available.includes(state.explorerEnd) ? state.explorerEnd : available[available.length - 1];
  const rows = sliceYears(series[code], Math.min(start, end), Math.max(start, end)).map(([year, value]) => ({ indicator: code, label: info.label, year, value, unit: info.unit }));
  return { rows, name: `series-${code}-${Math.min(start, end)}-${Math.max(start, end)}` };
}

function downloadExport(state, which, format) {
  const { rows, name } = exportData(state, which);
  const text =
    format === 'json'
      ? JSON.stringify({ source: meta.sources, generated: meta.generated, rows }, null, 2)
      : [Object.keys(rows[0] ?? {}).join(','), ...rows.map((r) => Object.values(r).map(csvEscape).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([text], { type: format === 'json' ? 'application/json' : 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${name}.${format}`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function bindPage(root, state, update, route) {
  const controller = new AbortController();
  const signal = controller.signal;
  let searchTimer;
  root.addEventListener(
    'change',
    (event) => {
      const el = event.target;
      if (!(el instanceof HTMLSelectElement)) return;
      switch (el.id) {
        case 'pref-region': update({ prefRegion: el.value }); break;
        case 'pref-metric': update({ prefMetric: el.value }); break;
        case 'pref-direction': update({ prefDirection: el.value }); break;
        case 'pref-select': update({ prefSelected: Number(el.value) }); break;
        case 'explorer-metric': {
          const available = years(series[el.value]);
          update({ explorerMetric: el.value, explorerStart: available[0], explorerEnd: available[available.length - 1] });
          break;
        }
        case 'explorer-start': update({ explorerStart: Math.min(Number(el.value), state.explorerEnd) }); break;
        case 'explorer-end': update({ explorerEnd: Math.max(Number(el.value), state.explorerStart) }); break;
        case 'rank-metric': update({ rankMetric: el.value, rankSort: 'value' }); break;
        case 'rank-region': update({ rankRegion: el.value }); break;
        case 'rank-direction': update({ rankDir: el.value }); break;
        case 'compare-country': update({ compareCountry: el.value }); break;
      }
    },
    { signal },
  );
  root.addEventListener(
    'input',
    (event) => {
      const el = event.target;
      if (!(el instanceof HTMLInputElement)) return;
      clearTimeout(searchTimer);
      const key = el.id === 'rank-search' ? 'rankQuery' : el.id === 'pref-search' ? 'prefSearch' : null;
      if (!key) return;
      const value = el.value;
      const cursor = el.selectionStart;
      searchTimer = setTimeout(() => update({ [key]: value, __focus: el.id, __cursor: cursor }), 120);
    },
    { signal },
  );
  root.addEventListener(
    'click',
    (event) => {
      const button = event.target.closest('button');
      if (!button || !root.contains(button)) return;
      if (button.dataset.pref) update({ prefSelected: Number(button.dataset.pref) });
      else if (button.dataset.prefGoto) {
        update({ prefSelected: Number(button.dataset.prefGoto) });
        location.hash = '#/regions';
      } else if (button.dataset.chartType) update({ explorerType: button.dataset.chartType });
      else if (button.dataset.scale) update({ explorerIndex: button.dataset.scale === 'index' });
      else if (button.dataset.sort) {
        const id = button.dataset.sort;
        const dir = state.rankSort === id ? (state.rankDir === 'desc' ? 'asc' : 'desc') : id === 'value' ? 'desc' : 'asc';
        update({ rankSort: id, rankDir: dir });
      } else if (button.dataset.download) downloadExport(state, button.dataset.download, button.dataset.format);
    },
    { signal },
  );
  return () => {
    clearTimeout(searchTimer);
    controller.abort();
  };
}

export const pages = { overview, population, economy, prices, health, energy, regions, explorer, rankings, methodology };
