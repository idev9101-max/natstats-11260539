import { esc, axisValue } from './format.js';

const finite = (v) => Number.isFinite(Number(v));

function niceDomain(min, max) {
  if (!finite(min) || !finite(max)) return [0, 1];
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.08;
  return [min - pad, max + pad];
}

function lineTicks(lo, hi, count = 5) {
  const step = (hi - lo) / (count - 1);
  return Array.from({ length: count }, (_, i) => Math.round(lo + i * step));
}

export function lineChart(sets, opts = {}) {
  const width = opts.width ?? 720;
  const height = opts.height ?? 240;
  const pad = { l: opts.padLeft ?? 58, r: opts.padRight ?? 14, t: opts.padTop ?? 16, b: opts.padBottom ?? 32 };
  const clean = sets
    .map((s) => ({ ...s, pts: (s.values ?? []).filter((p) => finite(p[1]) && p[0] >= (opts.start ?? -Infinity) && p[0] <= (opts.end ?? Infinity)) }))
    .filter((s) => s.pts.length);
  if (!clean.length) return '<div class="empty">No observations in this year range.</div>';
  const all = clean.flatMap((s) => s.pts);
  const years = all.map((p) => p[0]);
  const values = all.map((p) => Number(p[1]));
  const [y0, y1] = niceDomain(Math.min(...values), Math.max(...values));
  const x0 = Math.min(...years);
  const x1 = Math.max(...years);
  const px = (year) => pad.l + ((year - x0) / (x1 - x0 || 1)) * (width - pad.l - pad.r);
  const py = (value) => pad.t + (1 - (Number(value) - y0) / (y1 - y0 || 1)) * (height - pad.t - pad.b);
  const yTicks = opts.yTicks ?? 5;
  const xTicks = opts.xTicks ?? 5;
  const gridY = Array.from({ length: yTicks }, (_, i) => y0 + ((y1 - y0) * i) / (yTicks - 1));
  const gridX = [...new Set(lineTicks(x0, x1, xTicks))];
  const aria = opts.aria ?? `${clean.map((s) => s.name).join(' and ')} over ${x0} to ${x1}`;
  let out = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(aria)}"><title>${esc(aria)}</title>`;
  out += gridY
    .map((v) => `<line class="grid" x1="${pad.l}" y1="${py(v).toFixed(1)}" x2="${width - pad.r}" y2="${py(v).toFixed(1)}"/><text class="axis-y" x="${pad.l - 8}" y="${(py(v) + 3).toFixed(1)}" text-anchor="end">${esc(axisValue(v, opts.kind))}</text>`)
    .join('');
  out += gridX
    .map((y) => `<line class="grid-vert" x1="${px(y).toFixed(1)}" y1="${pad.t}" x2="${px(y).toFixed(1)}" y2="${height - pad.b}"/><text class="axis-x" x="${px(y).toFixed(1)}" y="${height - 10}" text-anchor="middle">${y}</text>`)
    .join('');
  out += `<line class="axis-line" x1="${pad.l}" y1="${height - pad.b}" x2="${width - pad.r}" y2="${height - pad.b}"/>`;
  clean.forEach((s, i) => {
    const color = s.color ?? `var(--series-${Math.min(i, 4)})`;
    const d = s.pts.map((p, j) => `${j ? 'L' : 'M'}${px(p[0]).toFixed(1)} ${py(p[1]).toFixed(1)}`).join(' ');
    const last = s.pts[s.pts.length - 1];
    out += `<path class="series" d="${d}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    out += `<circle cx="${px(last[0]).toFixed(1)}" cy="${py(last[1]).toFixed(1)}" r="4" fill="${color}" stroke="var(--bg)" stroke-width="2"><title>${esc(s.name)} ${last[0]}: ${esc(s.format ? s.format(last[1]) : axisValue(last[1], opts.kind))}</title></circle>`;
  });
  return `${out}</svg>`;
}

export function barChart(items, opts = {}) {
  if (!items.length) return '<div class="empty">No matching rows.</div>';
  const width = opts.width ?? 640;
  const rowH = opts.rowH ?? 27;
  const labelW = opts.labelW ?? 132;
  const valueW = opts.valueW ?? 78;
  const height = items.length * rowH + 22;
  const plotX = labelW + 10;
  const plotW = width - plotX - valueW;
  const nums = items.map((i) => Number(i.value)).filter(finite);
  const min = Math.min(0, ...nums);
  const max = Math.max(0, ...nums);
  const span = max - min || 1;
  const x = (v) => plotX + ((Number(v) - min) / span) * plotW;
  const zero = x(0);
  const aria = opts.aria ?? 'Ranked bars';
  let out = `<svg class="chart-svg bars" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(aria)}"><title>${esc(aria)}</title>`;
  out += `<line class="grid" x1="${zero.toFixed(1)}" y1="4" x2="${zero.toFixed(1)}" y2="${items.length * rowH + 4}"/>`;
  items.forEach((item, i) => {
    const y = i * rowH + 5;
    const bx = Math.min(zero, x(item.value));
    const bw = Math.max(1.5, Math.abs(x(item.value) - zero));
    const color = item.color ?? 'var(--accent)';
    const value = opts.format ? opts.format(item.value) : axisValue(item.value, opts.kind);
    out += `<text class="bar-label" x="${labelW}" y="${y + 14}" text-anchor="end">${esc(String(item.label).slice(0, opts.labelChars ?? 20))}</text>`;
    out += `<rect class="bar" x="${bx.toFixed(1)}" y="${y + 3}" width="${bw.toFixed(1)}" height="${rowH - 10}" rx="2" fill="${color}"><title>${esc(item.label)}: ${esc(value)}</title></rect>`;
    out += `<text class="bar-value" x="${width - 4}" y="${y + 14}" text-anchor="end">${esc(value)}</text>`;
    if (item.detail) out += `<text class="bar-detail" x="${plotX + 2}" y="${y + 14}">${esc(item.detail)}</text>`;
  });
  return `${out}</svg>`;
}

export function scatterChart(points, opts = {}) {
  const width = opts.width ?? 640;
  const height = opts.height ?? 270;
  const pad = { l: 56, r: 16, t: 18, b: 40 };
  const good = points.filter((p) => finite(p.x) && finite(p.y));
  if (!good.length) return '<div class="empty">No comparable observations.</div>';
  const xs = good.map((p) => Number(p.x));
  const ys = good.map((p) => Number(p.y));
  const [x0, x1] = niceDomain(Math.min(...xs), Math.max(...xs));
  const [y0, y1] = niceDomain(Math.min(...ys), Math.max(...ys));
  const px = (v) => pad.l + ((v - x0) / (x1 - x0 || 1)) * (width - pad.l - pad.r);
  const py = (v) => height - pad.b - ((v - y0) / (y1 - y0 || 1)) * (height - pad.t - pad.b);
  const aria = opts.aria ?? `${opts.xLabel} against ${opts.yLabel}`;
  let out = `<svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(aria)}"><title>${esc(aria)}</title>`;
  for (let i = 0; i <= 4; i++) {
    const gx = x0 + ((x1 - x0) * i) / 4;
    const gy = y0 + ((y1 - y0) * i) / 4;
    out += `<line class="grid" x1="${pad.l}" y1="${py(gy).toFixed(1)}" x2="${width - pad.r}" y2="${py(gy).toFixed(1)}"/><text class="axis-y" x="${pad.l - 8}" y="${(py(gy) + 3).toFixed(1)}" text-anchor="end">${esc(axisValue(gy, opts.yKind))}</text>`;
    out += `<line class="grid-vert" x1="${px(gx).toFixed(1)}" y1="${pad.t}" x2="${px(gx).toFixed(1)}" y2="${height - pad.b}"/><text class="axis-x" x="${px(gx).toFixed(1)}" y="${height - 20}" text-anchor="middle">${esc(axisValue(gx, opts.xKind))}</text>`;
  }
  out += `<line class="axis-line" x1="${pad.l}" y1="${height - pad.b}" x2="${width - pad.r}" y2="${height - pad.b}"/>`;
  out += `<line class="axis-line" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${height - pad.b}"/>`;
  good.forEach((p) => {
    const r = p.highlight ? 6 : 4;
    const cls = p.highlight ? 'dot focus-dot' : 'dot';
    out += `<circle class="${cls}" cx="${px(p.x).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="${r}"><title>${esc(p.label)}: ${esc(p.xText)}, ${esc(p.yText)}</title></circle>`;
    out += `<text class="dot-label" x="${(px(p.x) + r + 3).toFixed(1)}" y="${(py(p.y) + 3).toFixed(1)}">${esc(p.tag ?? '')}</text>`;
  });
  out += `<text class="axis-title" x="${(width / 2).toFixed(0)}" y="${height - 4}" text-anchor="middle">${esc(opts.xLabel ?? '')}</text>`;
  out += `<text class="axis-title" transform="translate(12 ${height / 2}) rotate(-90)" text-anchor="middle">${esc(opts.yLabel ?? '')}</text>`;
  return `${out}</svg>`;
}

export function sparkline(values, opts = {}) {
  const good = values.filter(finite);
  if (good.length < 2) return '';
  const width = opts.width ?? 120;
  const height = opts.height ?? 34;
  const min = Math.min(...good);
  const max = Math.max(...good);
  const px = (i) => (i / (good.length - 1)) * (width - 4) + 2;
  const py = (v) => height - 3 - ((v - min) / (max - min || 1)) * (height - 8);
  const d = good.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');
  const color = opts.color ?? 'var(--accent)';
  return `<svg class="spark" viewBox="0 0 ${width} ${height}" aria-hidden="true"><path d="${d}" fill="none" stroke="${color}" stroke-width="2"/><circle cx="${px(good.length - 1).toFixed(1)}" cy="${py(good[good.length - 1]).toFixed(1)}" r="3" fill="${color}"/></svg>`;
}

export function tileCartogram(groups, rows, metric, qmap, selected) {
  return `<div class="cartogram">${groups
    .map((g) => {
      const members = rows.filter((p) => g.codes.includes(p.code));
      if (!members.length) return '';
      const tiles = members
        .map((p) => {
          const value = metric.value(p);
          const q = qmap.get(p.code) ?? 0;
          const abbr = p.nameEn.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
          return `<button type="button" class="tile q${q}${p.code === selected ? ' selected' : ''}" data-pref="${p.code}" aria-pressed="${p.code === selected}" title="${esc(p.nameEn)}: ${esc(metric.format(value))}"><span>${abbr}</span><small>${esc(metric.format(value))}</small></button>`;
        })
        .join('');
      return `<div class="map-region"><div class="map-region-title">${esc(g.name)}<span>${members.length}</span></div><div class="map-tiles">${tiles}</div></div>`;
    })
    .join('')}</div>`;
}

export function prefHeatmap(rows, metric, qmap) {
  if (!rows.length) return '<div class="empty">No prefectures in view.</div>';
  const ordered = [...rows].sort((a, b) => a.code - b.code);
  const values = ordered.map((p) => metric.value(p));
  const tiles = ordered
    .map((p) => {
      const value = metric.value(p);
      const q = qmap.get(p.code) ?? 0;
      const abbr = p.nameEn.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase();
      return `<span class="mini-tile q${q}" title="${esc(p.nameEn)} (${p.code}): ${esc(metric.format(value))}"><b>${abbr}</b></span>`;
    })
    .join('');
  const ramp = Array.from({ length: 6 }, (_, i) => `<i class="q${i}"></i>`).join('');
  return `<div class="mini-heat">${tiles}</div><div class="mini-heat-legend"><span>${esc(metric.format(Math.min(...values)))}</span><span class="ramp">${ramp}</span><span>${esc(metric.format(Math.max(...values)))}</span></div>`;
}
