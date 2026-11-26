import { currentRoute, ensureHash, navHtml, routeMeta } from './router.js';
import { bindPage, pages } from './ui.js';

const defaults = {
  theme: 'ink',
  density: 'compact',
  prefMetric: 'population2020',
  prefRegion: 'all',
  prefDirection: 'desc',
  prefSearch: '',
  prefSelected: 13,
  explorerMetric: 'SP.POP.TOTL',
  explorerStart: 1960,
  explorerEnd: 2025,
  explorerType: 'line',
  explorerIndex: false,
  rankMetric: 'population2020',
  rankRegion: 'all',
  rankQuery: '',
  rankDir: 'desc',
  rankSort: 'value',
  compareCountry: 'DEU',
};

const storeKey = 'japan-ledger-view';
const readStore = () => {
  try {
    return JSON.parse(localStorage.getItem(storeKey) ?? '{}');
  } catch {
    return {};
  }
};

const state = { ...defaults, ...readStore() };
const app = document.getElementById('app');
const nav = document.getElementById('nav');
const themeButton = document.getElementById('theme-toggle');
const densityButton = document.getElementById('density-toggle');
let detach = () => {};

function save() {
  const copy = { ...state };
  for (const key of Object.keys(copy)) if (key.startsWith('__')) delete copy[key];
  try {
    localStorage.setItem(storeKey, JSON.stringify(copy));
  } catch {
    return;
  }
}

function applyChrome() {
  document.documentElement.dataset.theme = state.theme;
  document.documentElement.dataset.density = state.density;
  themeButton.textContent = state.theme === 'ink' ? 'Paper' : 'Ink';
  themeButton.setAttribute('aria-label', `Switch to ${state.theme === 'ink' ? 'paper' : 'ink'} theme`);
  themeButton.setAttribute('aria-pressed', String(state.theme === 'paper'));
  densityButton.textContent = state.density === 'compact' ? 'Roomy' : 'Compact';
  densityButton.setAttribute('aria-label', `Switch to ${state.density === 'compact' ? 'roomy' : 'compact'} density`);
  densityButton.setAttribute('aria-pressed', String(state.density === 'compact'));
}

function render(focus, cursor) {
  detach();
  window.__shotReady = false;
  const route = currentRoute();
  nav.innerHTML = navHtml(route);
  app.innerHTML = (pages[route] ?? pages.overview)(state);
  document.title = `${routeMeta(route).title} · Japan Ledger`;
  detach = bindPage(app, state, update, route);
  window.scrollTo(0, 0);
  requestAnimationFrame(() => {
    if (focus) {
      const el = document.getElementById(focus);
      if (el) {
        el.focus({ preventScroll: true });
        if (cursor != null && typeof el.setSelectionRange === 'function') el.setSelectionRange(cursor, cursor);
      }
    }
    window.__shotReady = true;
  });
}

function update(patch) {
  const focus = patch.__focus ?? document.activeElement?.id;
  const cursor = patch.__cursor;
  Object.assign(state, patch);
  for (const key of Object.keys(state)) if (key.startsWith('__')) delete state[key];
  save();
  render(focus, cursor);
}

themeButton.addEventListener('click', () => {
  state.theme = state.theme === 'ink' ? 'paper' : 'ink';
  save();
  applyChrome();
});
densityButton.addEventListener('click', () => {
  state.density = state.density === 'compact' ? 'roomy' : 'compact';
  save();
  applyChrome();
});
document.addEventListener('keydown', (event) => {
  if (event.key !== '/' || /^(INPUT|SELECT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')) return;
  const field = document.getElementById('rank-search') ?? document.getElementById('pref-search');
  if (field) {
    event.preventDefault();
    field.focus();
  }
});
window.addEventListener('hashchange', () => render());

window.__atlasState = state;
ensureHash();
applyChrome();
render();
