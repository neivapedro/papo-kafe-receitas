import { store, uid, cloudEnabled } from './store.js';
import { PEOPLE } from './config.js';

const app = document.getElementById('app');
const tabsEl = document.getElementById('tabs');
const toastEl = document.getElementById('toast');

let mode = 'local';    // 'local' | 'nuvem' | 'login' | 'local-offline'
let draft = null;      // receita sendo preenchida
let draftKey = null;   // rota dona do rascunho
let dirty = false;
let bestDraft = null;  // café sendo preenchido (aba Cafés)
let bestKey = null;
let bestFilter = '';   // método escolhido no filtro da aba Cafés ('' = todos)
let stockFilter = '';  // '' | 'casa' | 'acabou'

/* ---------- métodos e receitas de referência ---------- */

const GRINDS = ['fina', 'média-fina', 'média', 'média-grossa', 'grossa'];

// Sugestões de variedade (as já usadas pelo casal entram na lista automaticamente).
const VARIETIES = [
  'Catuaí Amarelo', 'Catuaí Vermelho', 'Mundo Novo', 'Bourbon Amarelo', 'Bourbon Vermelho',
  'Yellow Bourbon', 'Topázio', 'Arara', 'Acaiá', 'Catucaí', 'Obatã', 'Icatu', 'Rubi',
  'Geisha', 'Typica', 'Caturra', 'Pacamara', 'SL28', 'Maragogipe', 'Paraíso',
];

const METHODS = [
  {
    id: 'v60', name: 'V60', pours: true,
    ref: {
      coffee: 'Roberta Bagilli', score: '84',
      notes: 'Aroma de chocolate ao leite, notas sensoriais de fava de baunilha e mel.',
      dose: '16', grind: 'média-fina', water: '240', temp: '93', tmin: '2:40', tmax: '3:10',
      pours: [{ t: '0:00', g: '50' }, { t: '0:40', g: '130' }, { t: '1:10', g: '190' }, { t: '1:40', g: '240' }],
      obs: 'Faça movimentos circulares suaves, sem despejar diretamente nas paredes do filtro.',
    },
  },
  {
    id: 'prensa', name: 'Prensa francesa',
    ref: {
      coffee: 'Mundo Novo natural · Veroo', score: '',
      notes: 'Chocolate ao leite; conforme esfria, fava de baunilha e mel.',
      dose: '16', grind: 'grossa', water: '240', temp: '92', tmin: '4:30', tmax: '',
      steps: [
        { t: '0:00', x: 'Adicione toda a água e misture suavemente' },
        { t: '4:00', x: 'Quebre a camada da superfície' },
        { t: '4:30', x: 'Pressione devagar e sirva' },
      ],
      obs: 'Evite deixar o café no recipiente depois de pronto, para não continuar a extração.',
    },
  },
  {
    id: 'italiana', name: 'Cafeteira italiana',
    ref: {
      coffee: '', score: '', notes: '',
      dose: '15', grind: 'média-fina', water: '150', temp: '90', tmin: '4:00', tmax: '5:00',
      steps: [
        { t: 'antes', x: 'Água quente na base até a válvula; café no funil sem compactar' },
        { t: '0:00', x: 'Fogo baixo, tampa aberta' },
        { t: '~3:00', x: 'O café começa a subir devagar' },
        { t: '~4:30', x: 'Começou a borbulhar: tire do fogo e esfrie a base num pano úmido' },
      ],
      obs: 'Usar água já quente encurta o tempo no fogo e evita gosto de queimado.',
    },
  },
  {
    id: 'espresso', name: 'Espresso', waterLabel: 'Bebida', seconds: true,
    ref: {
      coffee: 'Mundo Novo natural · Veroo', score: '', notes: '',
      dose: '18', grind: 'fina', water: '40', temp: '93', tmin: '28', tmax: '32',
      steps: [
        { t: '0 s', x: 'Inicie a extração' },
        { t: '6–9 s', x: 'Observe as primeiras gotas' },
        { t: '28–32 s', x: 'Encerre ao atingir 38–40 g' },
      ],
      obs: '',
    },
  },
];
const methodOf = (id) => METHODS.find((m) => m.id === id);

/* ---------- ícones (traço de 1,5, mesma grade de 24) ---------- */

const ICON = {
  v60: '<path d="M3 6h18l-6 10H9z"/><path d="M6 19h12M10 16v3M14 16v3"/>',
  prensa: '<path d="M6 7h10v13H6z"/><path d="M16 9h2v7h-2"/><path d="M11 2v5M9 2h4M6 11h10"/>',
  italiana: '<path d="M8 3h8l1.2 7H6.8z"/><path d="M6.8 10h10.4"/><path d="M7 10l-1.3 10h12.6L17 10"/><path d="M17 4.5h2.2l-1.1 4.5"/><path d="M11 3V1.8h2V3"/>',
  espresso: '<path d="M4 3h16v9H4z"/><path d="M9 12v2M15 12v2"/><path d="M8 16h8v2a3 3 0 0 1-3 3h-2a3 3 0 0 1-3-3z"/><circle cx="8" cy="7" r="1.5"/><circle cx="12" cy="7" r="1.5"/>',
  bean: '<ellipse cx="12" cy="12" rx="6" ry="8.5" transform="rotate(30 12 12)"/><path d="M9 6c3 3 3 9 6 12"/>',
  grind: '<rect x="5" y="5" width="14" height="14" rx="1"/><path d="M5 9h14"/>',
  drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  temp: '<path d="M12 3v11"/><circle cx="12" cy="17.5" r="3.5"/><path d="M12 6h3M12 9h2"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/>',
  bag: '<path d="M7 3h10l1.5 5v13h-13V8z"/><path d="M5.5 8h13M10 3l-1 5M14 3l1 5"/><path d="M10 13c1-1.5 3-1.5 4 0"/>',
  star: '<path d="M12 3.3l2.6 5.5 6 .8-4.4 4.1 1.1 6-5.3-2.9-5.3 2.9 1.1-6-4.4-4.1 6-.8z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  chev: '<path d="M15 5l-7 7 7 7"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  again: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9"/><path d="M20 4v5h-5"/><path d="M20 12a8 8 0 0 1-14 5.3L4 15"/><path d="M4 20v-5h5"/>',
  thumb: '<path d="M7 11v9H4v-9z"/><path d="M7 11l4-7a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const svg = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const grains = (n, cls = '') => Array.from({ length: 5 }, (_, i) =>
  `<i class="grain ${cls} ${i < n ? '' : 'off'}"></i>`).join('');
const logo = (cls) => `
  <picture>
    <source srcset="img/logo-escuro.png" media="(prefers-color-scheme: dark)">
    <img class="${cls}" src="img/logo.png" alt="Papo Kafé" width="900" height="378">
  </picture>`;

/* ---------- utilidades ---------- */

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const num = (v) => {
  const n = parseFloat(String(v ?? '').trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};
const fmtNum = (n) => (n == null ? '' : String(Math.round(n * 10) / 10).replace('.', ','));
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const fmtDate = (ms) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

function ratio(r) {
  const d = num(r.dose); const w = num(r.water);
  return d && w ? `1:${fmtNum(w / d)}` : '';
}

function timeRange(r) {
  const unit = methodOf(r.method)?.seconds ? ' s' : '';
  if (r.tmin && r.tmax) return `${r.tmin}–${r.tmax}${unit}`;
  return r.tmin || r.tmax ? `${r.tmin || r.tmax}${unit}` : '';
}

// "040" → "0:40". Até 2 dígitos: segundos (despejos) ou minutos (tempo total).
function fmtTime(v, short) {
  const s = String(v || '').trim();
  if (!/^\d+$/.test(s)) return s;
  if (s.length <= 2) return short === 's' ? `0:${s.padStart(2, '0')}` : `${Number(s)}:00`;
  return `${Number(s.slice(0, -2))}:${s.slice(-2)}`;
}

const initialOf = (name) => PEOPLE.find((p) => p.name === name)?.initial || (name || '?').slice(0, 1).toUpperCase();
const byBubble = (name, big = false) => (name
  ? `<span class="by p${Math.max(0, PEOPLE.findIndex((p) => p.name === name))}${big ? ' big' : ''}" title="Cadastrada por ${esc(name)}">${esc(initialOf(name))}</span>` : '');

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('show'));
  clearTimeout(toast.t);
  toast.t = setTimeout(() => {
    toastEl.classList.remove('show');
    toast.t = setTimeout(() => { toastEl.hidden = true; }, 220);
  }, 2200);
}

function saved(ok) {
  if (!ok) toast('Não foi possível salvar no aparelho. Verifique o espaço livre.');
  return ok;
}

const recipes = () => store.list('receita');
const recipesOf = (m) => recipes().filter((r) => r.method === m).sort((a, b) => b.createdAt - a.createdAt);

/* ---------- folha de confirmação (substitui confirm) ---------- */

function confirmSheet(title, text, label) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `
      <div class="sheet-bg" data-r="no"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <span class="sheet-grab" aria-hidden="true"></span>
        <h2>${esc(title)}</h2>
        <p>${esc(text)}</p>
        <div class="sheet-actions">
          <button type="button" class="btn ghost" data-r="no">Cancelar</button>
          <button type="button" class="btn danger" data-r="yes">${esc(label)}</button>
        </div>
      </div>`;
    document.body.append(wrap);
    wrap.querySelector('.btn.ghost').focus();
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      wrap.remove();
      resolve(b.dataset.r === 'yes');
    });
  });
}

/* ---------- pedaços de tela ---------- */

// Telas de aba (root) têm título grande que encolhe para a barra ao rolar;
// telas internas têm barra compacta com voltar, título central e ação.
function bar(title, { back, icon, action, root } = {}) {
  return `
    <header class="bar ${root ? 'root' : ''}">
      <div class="bar-side">${back ? `<button class="iconbtn back" data-act="back" data-to="${esc(back)}" aria-label="Voltar">${svg('chev')}</button>` : ''}</div>
      <h1 class="bar-title">${icon ? svg(icon) : ''}<span>${esc(title)}</span></h1>
      <div class="bar-side end">${action || ''}</div>
    </header>
    ${root ? `<h1 class="large-title">${esc(title)}</h1>` : ''}`;
}

function starBtn(r, big = false) {
  return `<button class="star ${r.fav ? 'on' : ''} ${big ? 'big' : ''}" data-act="fav" data-id="${r.id}" aria-label="${r.fav ? 'Tirar das favoritas' : 'Marcar como favorita'}" aria-pressed="${!!r.fav}">${svg('star')}</button>`;
}

function emptyState({ icon, title, text = '', primary = '', secondary = '' }) {
  return `
    <div class="empty">
      <span class="empty-ic">${icon}</span>
      <h2>${esc(title)}</h2>
      ${text ? `<p>${esc(text)}</p>` : ''}
      ${primary || secondary ? `<div class="empty-actions">${primary}${secondary}</div>` : ''}
    </div>`;
}

const skeletonCards = (n = 3) => Array.from({ length: n }, () => `
  <div class="card skel-card" aria-hidden="true">
    <div class="card-main"><span class="skel w60"></span><span class="skel w40"></span><span class="skel w80"></span></div>
  </div>`).join('');

function recipeCard(r) {
  const meta = [r.dose && `${r.dose} g`, r.grind, r.water && `${r.water} g`, r.temp && `${r.temp} °C`].filter(Boolean).map(esc);
  const rt = ratio(r);
  if (rt) meta.push(`<b>${rt}</b>`);
  return `
    <article class="card" data-act="open" data-id="${r.id}">
      <div class="card-main">
        <div class="card-top"><h3 class="card-name">${esc(r.coffee)}</h3>${r.score ? `<span class="pts">${esc(r.score)} pts</span>` : ''}</div>
        ${r.variety ? `<div class="card-sub"><span class="variety">${svg('bean')}${esc(r.variety)}</span></div>` : ''}
        ${meta.length ? `<div class="meta">${meta.join(' · ')}</div>` : ''}
        ${r.rating || r.by ? `<div class="card-foot"><span class="rate">${r.rating ? grains(r.rating) : ''}</span>${byBubble(r.by)}</div>` : ''}
      </div>
      ${starBtn(r)}
    </article>`;
}

function renderTabs(active) {
  if (!active) { tabsEl.hidden = true; return; }
  const t = (key, href, icon, label) =>
    `<a href="${href}" class="${active === key ? 'on' : ''}"${active === key ? ' aria-current="page"' : ''}><span class="ti">${icon}</span><span>${label}</span></a>`;
  tabsEl.innerHTML = `<div class="tabs-in">${
    t('metodos', '#/', active === 'metodos' ? '<i class="grain"></i>' : svg('bean'), 'Métodos')
  }${t('favoritas', '#/favoritas', svg('star'), 'Favoritas')
  }${t('cafes', '#/cafes', svg('bag'), 'Cafés')}</div>`;
  tabsEl.hidden = false;
}

/* ---------- telas ---------- */

function renderHome() {
  const all = recipes();
  const me = store.me();
  const loading = store.loading();
  return `
    <section class="home">
      <a class="iconbtn avatar" href="#/ajustes" aria-label="Ajustes">${me ? byBubble(me, true) : svg('gear')}</a>
      <div class="hero">${logo('hero-logo')}<small>Receitas</small></div>
      <div class="methods">
        ${METHODS.map((m) => {
          const n = all.filter((r) => r.method === m.id).length;
          const count = loading ? '<span class="skel w60"></span>'
            : n === 0 ? 'Começar' : `<strong>${n}</strong> ${n === 1 ? 'receita' : 'receitas'}`;
          return `<a class="method ${!loading && n === 0 ? 'is-empty' : ''}" href="#/m/${m.id}"><span class="m-ic">${svg(m.id)}</span><b>${esc(m.name)}</b><small>${count}</small></a>`;
        }).join('')}
      </div>
    </section>`;
}

function renderList(m) {
  const list = recipesOf(m.id);
  const body = list.length ? list.map(recipeCard).join('')
    : store.loading() ? skeletonCards()
      : emptyState({
        icon: svg(m.id),
        title: `Nenhuma receita de ${m.name} ainda`,
        text: 'Comece do zero ou a partir da receita de referência deste método.',
        primary: `<a class="btn primary" href="#/m/${m.id}/nova">${svg('plus')}Nova receita</a>`,
        secondary: `<a class="btn secondary" href="#/m/${m.id}/referencia">Usar receita de referência</a>`,
      });
  return `
    ${bar(m.name, { back: '#/', icon: m.id })}
    <section class="content">
      <div class="list">${body}</div>
      ${list.length ? `<a class="btn primary block" href="#/m/${m.id}/nova">${svg('plus')}Nova receita de ${esc(m.name)}</a>` : ''}
    </section>`;
}

function tag(icon, k, v, cls = '', sub = '') {
  return v ? `<div class="tag ${cls}"><span class="k">${icon ? svg(icon) : ''}${k}</span><span class="v">${esc(v)}</span>${sub ? `<span class="v-sub">${esc(sub)}</span>` : ''}</div>` : '';
}

function renderRecipe(r) {
  const m = methodOf(r.method);
  const inBest = coffees().find((b) => b.recipeId === r.id);
  let prev = 0;
  const pours = (r.pours || []).filter((p) => p.t || p.g).map((p) => {
    const g = num(p.g);
    const d = g != null ? g - prev : null;
    if (g != null) prev = g;
    return `<div><span class="t">${esc(p.t)}</span><span class="g">${p.g ? `${esc(p.g)} g` : ''}</span><span class="d">${d != null ? `+${fmtNum(d)}` : ''}</span></div>`;
  }).join('');
  const steps = (r.steps || []).filter((s) => s.t || s.x).map((s) =>
    `<div><span class="t">${esc(s.t)}</span><span>${esc(s.x)}</span><span></span></div>`).join('');
  return `
    ${bar(m.name, { back: `#/m/${m.id}`, icon: m.id, action: `<a class="act" href="#/r/${r.id}/editar">Editar</a>` })}
    <section class="view">
      <div class="vh">
        <div class="vh-text">
          <h2 class="name">${esc(r.coffee)}</h2>
          <div class="score">${r.score ? `<span>${esc(r.score)} pts</span>` : ''}${r.rating ? `<span class="rate">${grains(r.rating)}</span>` : ''}</div>
        </div>
        ${starBtn(r, true)}
      </div>
      ${r.variety ? `<div class="variety big">${svg('bean')}${esc(r.variety)}</div>` : ''}
      ${r.notes ? `<p class="sens">${esc(r.notes)}</p>` : ''}
      <h3 class="sec">Receita</h3>
      <div class="tags">
        ${tag('bean', 'Café', r.dose && `${r.dose} g`)}
        ${tag('drop', m.waterLabel || 'Água', r.water && `${r.water} g`)}
        ${tag('', 'Proporção', ratio(r), 'ratio')}
        ${tag('grind', 'Moagem', r.grind || (r.clicks ? '—' : ''), '', r.clicks ? `${r.clicks} cliques` : '')}
        ${tag('temp', 'Temp.', r.temp && `${r.temp} °C`)}
        ${tag('clock', 'Tempo', timeRange(r))}
      </div>
      ${pours ? `<h3 class="sec">Despejos</h3><div class="vsteps">${pours}</div>` : ''}
      ${steps ? `<h3 class="sec">Passo a passo</h3><div class="vsteps">${steps}</div>` : ''}
      ${r.obs ? `<div class="note"><b>Observação</b>${esc(r.obs)}</div>` : ''}
      <div class="actions">
        <a class="btn secondary" href="#/r/${r.id}/duplicar">${svg('copy')}Duplicar</a>
        ${inBest ? `<a class="btn secondary" href="#/c/${inBest.id}">${svg('bag')}Ver em Cafés</a>` : `<a class="btn secondary" href="#/cafes/novo/${r.id}">${svg('plus')}Cafés</a>`}
      </div>
      <p class="by-line">${r.by ? `${byBubble(r.by)} Cadastrada por ${esc(r.by)} · ` : ''}${fmtDate(r.createdAt)}</p>
      <button class="btn-text danger mid" data-act="del-recipe" data-id="${r.id}">Apagar receita</button>
    </section>`;
}

/* ---------- formulário da receita ---------- */

function newDraft(m, base) {
  const src = base || {};
  return {
    id: uid(), method: m.id, by: store.me() || '', createdAt: Date.now(),
    coffee: '', score: '', variety: '', notes: '', dose: '', grind: '', clicks: '', water: '', temp: '', tmin: '', tmax: '',
    obs: '', rating: 0, fav: false,
    ...structuredClone(src),
    pours: m.pours ? structuredClone(src.pours || [{ t: '0:00', g: '' }]) : undefined,
    steps: m.pours ? undefined : structuredClone(src.steps || [{ t: '0:00', x: '' }]),
  };
}

function inp(field, { ph = '', mode = 'text', time = '' } = {}) {
  const list = field === 'variety' ? ' list="variedades"' : '';
  return `<input class="in" data-f="${field}" value="${esc(draft[field] ?? '')}" placeholder="${esc(ph)}" inputmode="${mode}" autocomplete="off"${list}${time ? ` data-time="${time}"` : ''}>`;
}

// Campo com a unidade dentro, à direita (g, °C, cliques…): todas as bordas alinhadas.
const affix = (input, sfx, long = false) => `<span class="affix ${long ? 'long' : ''}">${input}<span class="sfx" aria-hidden="true">${sfx}</span></span>`;

function varietyList() {
  const used = [...recipes(), ...store.list('melhor')].map((x) => (x.variety || '').trim()).filter(Boolean);
  const all = [...new Map([...used, ...VARIETIES].map((v) => [norm(v), v])).values()]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return `<datalist id="variedades">${all.map((v) => `<option value="${esc(v)}">`).join('')}</datalist>`;
}

function pourHints() {
  let prev = 0;
  return draft.pours.map((p) => {
    const g = num(p.g);
    if (g == null) return '';
    const d = g - prev; prev = g;
    return `+${fmtNum(d)}`;
  });
}

const waterCheck = () => {
  const last = num(draft.pours?.at(-1)?.g); const water = num(draft.water);
  if (last == null || water == null) return '';
  return last === water ? '✓ bate com a água' : `faltam ${fmtNum(water - last)} g`;
};

// Moagem como régua de 5 pontos (fina → grossa); as opções são as mesmas de sempre.
function grindScale() {
  return `
    <div class="scale" role="radiogroup" aria-label="Moagem">
      <div class="scale-track">
        ${GRINDS.map((g) => `<button type="button" role="radio" aria-checked="${draft.grind === g}" aria-label="${g}" class="dot ${draft.grind === g ? 'on' : ''}" data-act="grind" data-v="${g}"><i></i></button>`).join('')}
      </div>
      <div class="scale-ends"><span>Fina</span><b data-live="grind">${esc(draft.grind || 'Toque para escolher')}</b><span>Grossa</span></div>
    </div>`;
}

function renderForm(m, title) {
  const ref = m.ref;
  const sec = m.seconds;
  const hints = m.pours ? pourHints() : [];
  const tmode = sec ? 'decimal' : 'numeric';
  return `
    ${bar(title, { back: 'back', icon: m.id, action: '<button class="act" data-act="save">Salvar</button>' })}
    <form class="content form" autocomplete="off" novalidate>
      <h2 class="sec">Café</h2>
      ${coffees().length ? `
        <label class="field"><span class="lbl">Usar um café cadastrado</span>
          <select class="in" data-use-coffee>
            <option value="">Escolher dos meus cafés…</option>
            ${coffees().map((c) => `<option value="${c.id}">${esc(c.coffee)}${c.variety ? ` · ${esc(c.variety)}` : ''}${(c.status || 'casa') === 'acabou' ? ' (acabou)' : ''}</option>`).join('')}
          </select></label>` : ''}
      <div class="row2 narrow-right">
        <label class="field"><span class="lbl">Café</span>${inp('coffee', { ph: ref.coffee || 'Nome do café' })}</label>
        <label class="field"><span class="lbl">Pontos</span>${inp('score', { ph: '84', mode: 'decimal' })}</label>
      </div>
      <label class="field"><span class="lbl">Variedade</span>${inp('variety', { ph: 'Catuaí Amarelo' })}</label>
      ${varietyList()}
      <label class="field"><span class="lbl">Notas sensoriais</span>
        <textarea class="in" data-f="notes" rows="2" placeholder="Chocolate ao leite, fava de baunilha e mel">${esc(draft.notes)}</textarea></label>

      <h2 class="sec">Receita</h2>
      <div class="row3">
        <label class="field"><span class="lbl">${svg('bean')}Café</span>${affix(inp('dose', { ph: ref.dose, mode: 'decimal' }), 'g')}</label>
        <label class="field"><span class="lbl">${svg('drop')}${m.waterLabel || 'Água'}</span>${affix(inp('water', { ph: ref.water, mode: 'decimal' }), 'g')}</label>
        <label class="field"><span class="lbl">${svg('temp')}Temp.</span>${affix(inp('temp', { ph: ref.temp, mode: 'decimal' }), '°C')}</label>
      </div>
      <div class="field"><span class="lbl">${svg('grind')}Moagem</span>${grindScale()}</div>
      <div class="row2">
        <label class="field"><span class="lbl">Cliques do moedor</span>${affix(inp('clicks', { ph: '18', mode: 'decimal' }), 'cliques', true)}</label>
        <div class="field"><span class="lbl">Proporção</span><span class="calc" data-live="ratio">${ratio(draft) || '—'}</span></div>
      </div>
      <div class="row2">
        <label class="field"><span class="lbl">${svg('clock')}Tempo total</span>${affix(inp('tmin', { ph: ref.tmin, mode: tmode, time: sec ? '' : 'm' }), sec ? 's' : 'min', !sec)}</label>
        <label class="field"><span class="lbl">Até (opcional)</span>${affix(inp('tmax', { ph: ref.tmax || '', mode: tmode, time: sec ? '' : 'm' }), sec ? 's' : 'min', !sec)}</label>
      </div>

      ${m.pours ? `
        <h2 class="sec">Despejos</h2>
        <div class="pour head" aria-hidden="true"><span class="lbl">Tempo</span><span class="lbl">Balança</span><span class="lbl">Despejo</span><span></span></div>
        ${draft.pours.map((p, i) => `
          <div class="pour">
            <input class="in" data-pour="${i}" data-k="t" value="${esc(p.t)}" placeholder="${esc(ref.pours[i]?.t || '')}" inputmode="numeric" data-time="s" aria-label="Tempo do despejo ${i + 1}">
            ${affix(`<input class="in" data-pour="${i}" data-k="g" value="${esc(p.g)}" placeholder="${esc(ref.pours[i]?.g || '')}" inputmode="decimal" aria-label="Balança no despejo ${i + 1}">`, 'g')}
            <span class="d" data-live="d${i}">${hints[i] || ''}</span>
            <button type="button" class="iconbtn rm" data-act="rm-pour" data-i="${i}" aria-label="Remover despejo ${i + 1}">${svg('x')}</button>
          </div>`).join('')}
        <div class="pour-foot">
          <button type="button" class="addline" data-act="add-pour">${svg('plus')}Despejo</button>
          <span class="check-water" data-live="check">${waterCheck()}</span>
        </div>` : `
        <h2 class="sec">Passo a passo</h2>
        ${draft.steps.map((s, i) => `
          <div class="step-row">
            <input class="in" data-step="${i}" data-k="t" value="${esc(s.t)}" placeholder="${esc(ref.steps[i]?.t || '')}" aria-label="Tempo do passo ${i + 1}">
            <textarea class="in" data-step="${i}" data-k="x" rows="2" placeholder="${esc(ref.steps[i]?.x || 'O que fazer')}" aria-label="O que fazer no passo ${i + 1}">${esc(s.x)}</textarea>
            <button type="button" class="iconbtn rm" data-act="rm-step" data-i="${i}" aria-label="Remover passo ${i + 1}">${svg('x')}</button>
          </div>`).join('')}
        <button type="button" class="addline" data-act="add-step">${svg('plus')}Passo</button>`}

      <h2 class="sec">Depois de provar</h2>
      <div class="field"><span class="lbl">Minha nota</span>
        <div class="rateline" role="radiogroup" aria-label="Minha nota">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${draft.rating === n}" aria-label="${n} de 5" data-act="rate" data-v="${n}"><i class="grain ${n <= draft.rating ? '' : 'off'}"></i></button>`).join('')}
        </div>
      </div>
      <label class="field"><span class="lbl">Observação</span>
        <textarea class="in" data-f="obs" rows="3" placeholder="${esc(ref.obs || 'Ex.: ficou doce; da próxima vez, 1 clique mais fino')}">${esc(draft.obs)}</textarea></label>
      <button type="button" class="favrow" data-act="draft-fav" aria-pressed="${draft.fav}"><span>Favorita</span><span class="star ${draft.fav ? 'on' : ''}">${svg('star')}</span></button>
      <div class="savebar"><button type="button" class="btn primary block" data-act="save">Salvar receita</button></div>
    </form>`;
}

function updateLive() {
  const m = methodOf(draft.method);
  const r = app.querySelector('[data-live="ratio"]');
  if (r) r.textContent = ratio(draft) || '—';
  if (!m.pours) return;
  pourHints().forEach((h, i) => {
    const el = app.querySelector(`[data-live="d${i}"]`);
    if (el) el.textContent = h;
  });
  const c = app.querySelector('[data-live="check"]');
  if (c) c.textContent = waterCheck();
}

function saveDraft() {
  if (!draft.coffee.trim()) {
    toast('Dê um nome ao café para salvar.');
    app.querySelector('[data-f="coffee"]')?.focus();
    return;
  }
  const clean = { ...draft, coffee: draft.coffee.trim(), variety: (draft.variety || '').trim(), updatedAt: Date.now() };
  if (clean.pours) clean.pours = clean.pours.filter((p) => p.t || p.g);
  if (clean.steps) clean.steps = clean.steps.filter((s) => s.t || s.x);
  if (!saved(store.put('receita', clean))) return;
  dirty = false; draft = null; draftKey = null;
  toast('Receita salva');
  location.replace(`#/r/${clean.id}`);
}

/* ---------- favoritas ---------- */

function renderFavs() {
  const favs = recipes().filter((r) => r.fav);
  const groups = METHODS.map((m) => ({ m, list: favs.filter((r) => r.method === m.id).sort((a, b) => b.createdAt - a.createdAt) }))
    .filter((g) => g.list.length);
  const body = groups.length ? groups.map(({ m, list }) => `
      <h2 class="grp">${svg(m.id)}${esc(m.name)}</h2>
      <div class="list">${list.map(recipeCard).join('')}</div>`).join('')
    : store.loading() ? `<div class="list">${skeletonCards()}</div>`
      : emptyState({
        icon: svg('star'),
        title: 'Nenhuma favorita ainda',
        text: 'Toque na estrela de uma receita e ela aparece aqui, junto com as favoritas dos outros métodos.',
        primary: '<a class="btn secondary" href="#/">Ver métodos</a>',
      });
  return `
    ${bar('Favoritas', { root: true })}
    <section class="content">${body}</section>`;
}

/* ---------- cafés: o que temos (ou tivemos) em casa e o pódio de cada método ---------- */

const MEDALS = ['', '1º', '2º', '3º'];
const coffees = () => store.list('melhor').sort((a, b) => a.createdAt - b.createdAt);
const coffeeOf = (id) => store.list('melhor').find((c) => c.id === id);

// Métodos para os quais o café é indicado. Itens antigos, sem a lista, herdam o método da receita.
function bestMethods(b) {
  if (Array.isArray(b.methods)) return b.methods;
  const r = b.recipeId ? store.get(b.recipeId) : null;
  return r ? [r.method] : [];
}

function methodChips(selected, act) {
  return METHODS.map((m) => {
    const on = selected.includes(m.id);
    return `<button type="button" class="mchip ${on ? 'on' : ''}" data-act="${act}" data-v="${m.id}" aria-pressed="${on}">${svg(m.id)}${esc(m.name)}</button>`;
  }).join('');
}

// Antes havia um ranking único (rank). Em cada método indicado, os três primeiros
// desse ranking viram 1º, 2º e 3º do pódio; o resto fica sem medalha.
function migrateCoffees() {
  const all = store.list('melhor');
  const legacy = all.filter((c) => !c.podium)
    .sort((a, b) => (a.rank ?? 1e9) - (b.rank ?? 1e9) || a.createdAt - b.createdAt);
  if (!legacy.length) return;
  const out = legacy.map((c) => ({ ...c, methods: bestMethods(c), podium: {}, status: c.status || 'casa' }));
  METHODS.forEach((m) => {
    const taken = new Set(all.filter((c) => c.podium?.[m.id]).map((c) => c.podium[m.id]));
    let pos = 1;
    out.filter((c) => c.methods.includes(m.id)).forEach((c) => {
      while (taken.has(pos)) pos += 1;
      if (pos <= 3) { c.podium[m.id] = pos; taken.add(pos); }
    });
  });
  store.put('melhor', ...out);
}

// Coloca o café na posição do pódio (0 tira a medalha). Quem estava ali desce uma
// posição, até achar um lugar vazio; quem passa do 3º perde a medalha.
function setPodium(id, method, pos) {
  const all = coffees();
  const slots = [null, null, null, null];
  all.forEach((c) => {
    const p = c.podium?.[method];
    if (p && c.id !== id && !slots[p]) slots[p] = c.id;
  });
  if (pos) {
    let carry = id;
    for (let p = pos; p <= 3 && carry; p += 1) [slots[p], carry] = [carry, slots[p]];
  }
  const changed = [];
  all.forEach((c) => {
    const np = Math.max(0, slots.indexOf(c.id));
    if (np === (c.podium?.[method] || 0)) return;
    const podium = { ...(c.podium || {}) };
    if (np) podium[method] = np; else delete podium[method];
    const ms = bestMethods(c);
    changed.push({ ...c, podium, methods: np && !ms.includes(method) ? [...ms, method] : ms });
  });
  if (changed.length) saved(store.put('melhor', ...changed));
}

function podiumButtons(c, method, act) {
  const cur = act === 'draft-podium' ? (bestDraft.podium[method] || 0) : (c.podium?.[method] || 0);
  const m = methodOf(method);
  return [1, 2, 3].map((p) => `<button type="button" class="medal-btn p${p} ${cur === p ? 'on' : ''}" data-act="${act}" data-id="${c.id}" data-m="${method}" data-v="${p}" aria-pressed="${cur === p}" aria-label="${p}º lugar na ${esc(m.name)}">${p}º</button>`).join('');
}

function renderCafes() {
  migrateCoffees();
  const all = coffees();
  const status = (c) => c.status || 'casa';
  const list = all.filter((c) => (!bestFilter || bestMethods(c).includes(bestFilter)) && (!stockFilter || status(c) === stockFilter));
  const rank = (c) => (bestFilter ? c.podium?.[bestFilter] || 9 : Math.min(9, ...Object.values(c.podium || {})));
  list.sort((a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt);
  const fm = methodOf(bestFilter);
  const count = (s) => all.filter((c) => !s || status(c) === s).length;
  const seg = (v, label) => `<button type="button" role="radio" aria-checked="${stockFilter === v}" class="${stockFilter === v ? 'on' : ''}" data-act="stock-filter" data-v="${v}">${label} <span class="cnt">${count(v)}</span></button>`;
  const cards = list.map((c) => {
    const ms = bestMethods(c).map(methodOf).filter(Boolean);
    const medals = bestFilter ? '' : METHODS.filter((m) => c.podium?.[m.id])
      .sort((a, b) => c.podium[a.id] - c.podium[b.id])
      .map((m) => `<span class="medal p${c.podium[m.id]}">${MEDALS[c.podium[m.id]]} ${esc(m.name)}</span>`).join('');
    return `
      <li class="cafe ${status(c) === 'acabou' ? 'gone' : ''} ${bestFilter ? 'with-podium' : ''}" data-id="${c.id}">
        <a class="cafe-body" href="#/c/${c.id}">
          <span class="card-top"><span class="card-name">${esc(c.coffee)}</span>${c.score ? `<span class="pts">${esc(c.score)} pts</span>` : ''}</span>
          ${c.variety || ms.length ? `<span class="card-sub">${c.variety ? `<span class="variety">${svg('bean')}${esc(c.variety)}</span>` : ''}${ms.length ? `<span class="m-icons" title="Indicado para ${esc(ms.map((m) => m.name).join(', '))}">${ms.map((m) => svg(m.id)).join('')}</span>` : ''}</span>` : ''}
          ${c.why ? `<span class="clamp2">${esc(c.why)}</span>` : ''}
          <span class="card-foot">
            <span class="foot-l">${medals}<span class="stock ${status(c)}">${status(c) === 'casa' ? 'Em casa' : 'Acabou'}</span></span>
            <span class="foot-r">
              ${c.buyAgain ? `<span class="ok-ic" title="Compraria de novo">${svg('again')}</span>` : ''}
              ${c.recommend ? `<span class="ok-ic" title="Indicaria">${svg('thumb')}</span>` : ''}
              ${c.rating ? `<span class="rate">${grains(c.rating)}</span>` : ''}
              ${byBubble(c.by)}
            </span>
          </span>
        </a>
        ${bestFilter ? `<div class="podium-inline" role="group" aria-label="Pódio ${esc(fm.name)}">${podiumButtons(c, bestFilter, 'podium')}</div>` : ''}
      </li>`;
  }).join('');
  const body = list.length ? `<ol class="cafe-list">${cards}</ol>`
    : store.loading() ? `<div class="list">${skeletonCards()}</div>`
      : all.length ? emptyState({ icon: svg('bag'), title: 'Nenhum café com esse filtro', text: 'Troque o método ou o estoque escolhido acima.' })
        : emptyState({
          icon: svg('bag'),
          title: 'Nenhum café cadastrado',
          text: 'Cadastre aqui os cafés que vocês têm ou já tomaram, com ou sem receita.',
          primary: `<a class="btn primary" href="#/cafes/novo">${svg('plus')}Adicionar café</a>`,
        });
  return `
    ${bar('Cafés', { root: true, action: `<a class="iconbtn act-ic" href="#/cafes/novo" aria-label="Adicionar café">${svg('plus')}</a>` })}
    <section class="content">
      ${all.length ? `
        <div class="filter-row">
          <div class="mchips filter" role="group" aria-label="Filtrar por método">
            <button type="button" class="mchip ${bestFilter ? '' : 'on'}" data-act="best-filter" data-v="" aria-pressed="${!bestFilter}">Todos</button>
            ${methodChips(bestFilter ? [bestFilter] : [], 'best-filter')}
          </div>
        </div>
        <div class="segctl" role="radiogroup" aria-label="Estoque">${seg('', 'Todos')}${seg('casa', 'Em casa')}${seg('acabou', 'Acabaram')}</div>
        <p class="mini hint">${bestFilter ? `Pódio da ${esc(fm.name)}: toque em 1º, 2º ou 3º. Quem estava na posição desce uma.` : 'Escolha um método para ver e montar o pódio dele.'}</p>` : ''}
      ${body}
      ${list.length ? `<a class="btn primary block" href="#/cafes/novo">${svg('plus')}Adicionar café</a>` : ''}
    </section>`;
}

function newCoffee(recipeId) {
  const r = recipeId ? store.get(recipeId) : null;
  return {
    id: uid(), by: store.me() || '', createdAt: Date.now(), recipeId: r ? r.id : null,
    coffee: r ? r.coffee : '', score: r ? r.score : '', variety: r ? r.variety || '' : '', why: r ? r.notes : '',
    where: '', methods: r ? [r.method] : bestFilter ? [bestFilter] : [], podium: {},
    status: 'casa', roastDate: '', qty: '', rating: r ? r.rating || 0 : 0, buyAgain: false, recommend: false,
  };
}

function renderCoffeeForm(isNew) {
  const b = bestDraft;
  const binp = (f, ph, mode = 'text', type = 'text') => `<input class="in" type="${type}" data-b="${f}" value="${esc(b[f] || '')}" placeholder="${esc(ph)}" inputmode="${mode}" autocomplete="off">`;
  return `
    ${bar(isNew ? 'Novo café' : 'Editar café', { back: 'back', icon: 'bag', action: '<button class="act" data-act="save-best">Salvar</button>' })}
    <form class="content form" autocomplete="off" novalidate>
      <h2 class="sec">Café</h2>
      <div class="row2 narrow-right">
        <label class="field"><span class="lbl">Café</span>${binp('coffee', 'Nome do café')}</label>
        <label class="field"><span class="lbl">Pontos</span>${binp('score', '86', 'decimal')}</label>
      </div>
      <label class="field"><span class="lbl">Variedade</span><input class="in" data-b="variety" value="${esc(b.variety || '')}" placeholder="Catuaí Amarelo" list="variedades" autocomplete="off"></label>
      ${varietyList()}
      <label class="field"><span class="lbl">Notas sensoriais e comentários</span>
        <textarea class="in" data-b="why" rows="3" placeholder="Doce, limpo, chocolate ao leite…">${esc(b.why)}</textarea></label>
      <label class="field"><span class="lbl">Onde comprar (opcional)</span>${binp('where', 'Torrefação, loja, assinatura…')}</label>

      <h2 class="sec">Estoque</h2>
      <div class="segctl" role="radiogroup" aria-label="Estoque">
        <button type="button" role="radio" aria-checked="${b.status === 'casa'}" class="${b.status === 'casa' ? 'on' : ''}" data-act="cafe-status" data-v="casa">Em casa</button>
        <button type="button" role="radio" aria-checked="${b.status === 'acabou'}" class="${b.status === 'acabou' ? 'on' : ''}" data-act="cafe-status" data-v="acabou">Acabou</button>
      </div>
      <div class="row2">
        <label class="field"><span class="lbl">Data de torra</span>${binp('roastDate', '', 'text', 'date')}</label>
        <label class="field"><span class="lbl">Quantidade</span>${binp('qty', '250 g')}</label>
      </div>

      <h2 class="sec">O que achamos</h2>
      <div class="field"><span class="lbl">Minha nota</span>
        <div class="rateline" role="radiogroup" aria-label="Minha nota">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${b.rating === n}" aria-label="${n} de 5" data-act="cafe-rate" data-v="${n}"><i class="grain ${n <= b.rating ? '' : 'off'}"></i></button>`).join('')}
        </div>
      </div>
      <div class="checks">
        <label class="check"><input type="checkbox" data-b="buyAgain" ${b.buyAgain ? 'checked' : ''}><span>${svg('again')}Compraria de novo</span></label>
        <label class="check"><input type="checkbox" data-b="recommend" ${b.recommend ? 'checked' : ''}><span>${svg('thumb')}Indicaria</span></label>
      </div>

      <h2 class="sec">Indicado para</h2>
      <div class="mchips" role="group" aria-label="Indicado para">${methodChips(b.methods, 'best-method')}</div>
      ${b.methods.length ? `
        <div class="podium-rows">
          ${METHODS.filter((m) => b.methods.includes(m.id)).map((m) => `
            <div class="podium-row"><span class="lbl">${svg(m.id)}Pódio ${esc(m.name)}</span><div class="podium-inline" role="group" aria-label="Pódio ${esc(m.name)}">${podiumButtons(b, m.id, 'draft-podium')}</div></div>`).join('')}
        </div>
        <p class="mini">Opcional. Se a posição já for de outro café, ele desce uma.</p>` : '<p class="mini">Marque os métodos em que este café vai bem. Pode ser mais de um.</p>'}

      <div class="savebar"><button type="button" class="btn primary block" data-act="save-best">Salvar café</button></div>
      ${isNew ? '' : '<button type="button" class="btn-text danger mid" data-act="del-best">Excluir café</button>'}
    </form>`;
}

function saveCoffee() {
  const b = bestDraft;
  if (!b.coffee.trim()) {
    toast('Digite o nome do café.');
    app.querySelector('[data-b="coffee"]')?.focus();
    return;
  }
  const stored = coffeeOf(b.id);
  const rec = {
    id: b.id, by: b.by, createdAt: b.createdAt, recipeId: b.recipeId || null,
    coffee: b.coffee.trim(), score: b.score, variety: (b.variety || '').trim(), why: b.why, where: b.where,
    methods: METHODS.map((m) => m.id).filter((id) => b.methods.includes(id)),
    podium: { ...(stored?.podium || {}) },
    status: b.status, roastDate: b.roastDate, qty: b.qty, rating: b.rating,
    buyAgain: b.buyAgain, recommend: b.recommend,
  };
  if (!saved(store.put('melhor', rec))) return;
  METHODS.forEach((m) => {
    const want = rec.methods.includes(m.id) ? b.podium[m.id] || 0 : 0;
    if (want !== (rec.podium[m.id] || 0)) setPodium(rec.id, m.id, want);
  });
  dirty = false; bestDraft = null; bestKey = null;
  toast('Café salvo');
  location.replace('#/cafes');
}

/* ---------- ajustes e entrada ---------- */

function renderLogin() {
  return `
    <section class="center">
      ${logo('logo-sm')}
      <h1>Entrar</h1>
      <form class="login" data-form="login" novalidate>
        <label class="field"><span class="lbl">E-mail</span><input class="in" name="email" type="email" autocomplete="username" inputmode="email" required></label>
        <label class="field"><span class="lbl">Senha</span><input class="in" name="password" type="password" autocomplete="current-password" required></label>
        <p class="err" role="alert" hidden></p>
        <button class="btn primary block" type="submit">Entrar</button>
      </form>
    </section>`;
}

async function renderSettings() {
  const email = mode === 'nuvem' ? await store.userEmail() : null;
  const pend = store.pendingCount();
  const online = navigator.onLine;
  const sync = mode !== 'nuvem'
    ? { dot: 'off', t: cloudEnabled ? 'Sem conexão' : 'Só neste celular', s: cloudEnabled ? 'A sincronização volta sozinha quando houver internet.' : 'As receitas ficam salvas apenas neste aparelho.' }
    : pend ? { dot: 'wait', t: online ? 'Sincronizando…' : 'Aguardando internet', s: `${pend} ${pend === 1 ? 'alteração' : 'alterações'} para enviar.` }
      : { dot: 'ok', t: 'Tudo sincronizado', s: 'As receitas são as mesmas nos celulares do Pedro e da Karoline.' };
  return `
    ${bar('Ajustes', { back: '#/' })}
    <section class="content">
      <h2 class="group-title">Conta</h2>
      <div class="group">
        ${mode === 'nuvem' ? `
          <div class="cell">${byBubble(store.me(), true)}<div><b>${esc(store.me() || '')}</b><small>${esc(email || '')}</small></div></div>` : `
          <div class="cell"><span class="cell-ic">${svg('gear')}</span><div><b>Conta online não configurada</b><small>Para o Pedro e a Karoline verem as mesmas receitas, a conta online precisa estar ligada.</small></div></div>`}
      </div>
      <h2 class="group-title">Sincronização</h2>
      <div class="group">
        <div class="cell"><i class="dot ${sync.dot}" aria-hidden="true"></i><div><b>${sync.t}</b><small>${sync.s}</small></div></div>
      </div>
      ${mode === 'nuvem' ? '<div class="group"><button class="cell danger" data-act="logout">Sair da conta</button></div>' : ''}
    </section>`;
}

/* ---------- rotas ---------- */

function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  return parts;
}

const isFormRoute = (p) => (p[0] === 'm' && (p[2] === 'nova' || p[2] === 'referencia'))
  || (p[0] === 'r' && (p[2] === 'editar' || p[2] === 'duplicar'))
  || (p[0] === 'cafes' && p[1] === 'novo') || p[0] === 'c';

// Profundidade de cada tela: decide se a transição entra pela direita, volta ou só troca de aba.
function depthOf(p) {
  if (!p.length || p[0] === 'favoritas' || (p[0] === 'cafes' && !p[1])) return 0;
  if (p[0] === 'm') return p[2] ? 2 : 1;
  if (p[0] === 'r') return p[2] ? 3 : 2;
  return 1; // ajustes, cafés/novo, c/:id
}

async function render({ keepScroll = false } = {}) {
  const y = window.scrollY;
  const p = route();
  const key = p.join('/');
  let html = ''; let tab = null;

  if (mode === 'login') {
    html = renderLogin();
  } else if (!p.length) {
    html = renderHome(); tab = 'metodos';
  } else if (p[0] === 'm' && methodOf(p[1])) {
    const m = methodOf(p[1]);
    if (p[2] === 'nova' || p[2] === 'referencia') {
      if (draftKey !== key) { draft = newDraft(m, p[2] === 'referencia' ? m.ref : null); draftKey = key; dirty = p[2] === 'referencia'; }
      html = renderForm(m, `Nova · ${m.name}`);
    } else {
      html = renderList(m); tab = 'metodos';
    }
  } else if (p[0] === 'r' && store.get(p[1])) {
    const r = store.get(p[1]);
    const m = methodOf(r.method);
    if (p[2] === 'editar') {
      if (draftKey !== key) { draft = newDraft(m, r); draft.id = r.id; draft.createdAt = r.createdAt; draft.by = r.by; draftKey = key; dirty = false; }
      html = renderForm(m, `Editar · ${m.name}`);
    } else if (p[2] === 'duplicar') {
      if (draftKey !== key) {
        draft = newDraft(m, { ...r, fav: false, rating: 0 });
        draft.id = uid(); draft.createdAt = Date.now(); draft.by = store.me() || '';
        draftKey = key; dirty = true;
      }
      html = renderForm(m, `Cópia · ${m.name}`);
    } else {
      html = renderRecipe(r);
    }
  } else if (p[0] === 'favoritas') {
    html = renderFavs(); tab = 'favoritas';
  } else if (p[0] === 'melhores' || p[0] === 'b') {
    location.replace(p[0] === 'b' ? `#/c/${p[1]}` : '#/cafes'); // endereços antigos
    return;
  } else if (p[0] === 'cafes' && p[1] === 'novo') {
    if (bestKey !== key) { bestDraft = newCoffee(p[2]); bestKey = key; dirty = !!p[2]; }
    html = renderCoffeeForm(true);
  } else if (p[0] === 'cafes') {
    html = renderCafes(); tab = 'cafes';
  } else if (p[0] === 'c' && coffeeOf(p[1])) {
    if (bestKey !== key) {
      const c = coffeeOf(p[1]);
      bestDraft = {
        status: 'casa', roastDate: '', qty: '', rating: 0, variety: '', where: '', why: '',
        ...structuredClone(c), methods: [...bestMethods(c)], podium: { ...(c.podium || {}) },
      };
      bestKey = key; dirty = false;
    }
    html = renderCoffeeForm(false);
  } else if (p[0] === 'ajustes') {
    html = await renderSettings();
  } else {
    location.replace('#/');
    return;
  }

  if (!isFormRoute(p)) { draft = null; draftKey = null; bestDraft = null; bestKey = null; dirty = false; }
  app.innerHTML = html;
  app.classList.toggle('wide', mode !== 'login' && (!p.length || (p[0] === 'cafes' && !p[1])));
  renderTabs(tab);
  document.body.classList.toggle('has-tabs', !!tab);
  document.body.classList.toggle('has-savebar', !!app.querySelector('.savebar'));
  window.scrollTo(0, keepScroll ? y : 0);
  onScroll();
}

/* ---------- barra que ganha linha ao rolar ---------- */

function onScroll() {
  document.body.classList.toggle('scrolled', window.scrollY > 4);
  document.body.classList.toggle('past-title', window.scrollY > 44);
}
window.addEventListener('scroll', onScroll, { passive: true });

/* ---------- eventos ---------- */

app.addEventListener('input', (e) => {
  const t = e.target;
  if (draft && t.dataset.f) { draft[t.dataset.f] = t.value; dirty = true; updateLive(); }
  if (draft && t.dataset.pour) { draft.pours[t.dataset.pour][t.dataset.k] = t.value; dirty = true; updateLive(); }
  if (draft && t.dataset.step) { draft.steps[t.dataset.step][t.dataset.k] = t.value; dirty = true; }
  if (bestDraft && t.dataset.b) {
    bestDraft[t.dataset.b] = t.type === 'checkbox' ? t.checked : t.value;
    dirty = true;
  }
});

// "Usar um café cadastrado" na receita: preenche nome, pontos, variedade e notas.
app.addEventListener('change', (e) => {
  const sel = e.target.closest('[data-use-coffee]');
  if (!sel || !draft || !sel.value) return;
  const c = coffeeOf(sel.value);
  Object.assign(draft, { coffee: c.coffee, score: c.score || '', variety: c.variety || '', notes: c.why || draft.notes });
  dirty = true;
  render({ keepScroll: true });
});

app.addEventListener('focusout', (e) => {
  const t = e.target;
  if (!t.dataset?.time || !draft) return;
  const v = fmtTime(t.value, t.dataset.time);
  if (v === t.value) return;
  t.value = v;
  if (t.dataset.f) draft[t.dataset.f] = v;
  if (t.dataset.pour) draft.pours[t.dataset.pour].t = v;
});

app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.dataset.form !== 'login') return;
  const err = form.querySelector('.err');
  const btn = form.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = 'Entrando…';
  const msg = await store.signIn(form.email.value.trim(), form.password.value);
  btn.disabled = false; btn.textContent = 'Entrar';
  if (msg) {
    err.textContent = msg === 'rede'
      ? 'Sem conexão com a internet. Tente de novo quando estiver online.'
      : 'E-mail ou senha não conferem. Confira e tente de novo.';
    err.hidden = false;
    return;
  }
  mode = await store.init();
  render();
});

const goBack = async (to) => {
  if (dirty && !(await confirmSheet('Sair sem salvar?', 'O que você preencheu nesta tela vai se perder.', 'Sair sem salvar'))) return;
  dirty = false;
  if (to && to !== 'back') location.hash = to;
  else if (history.length > 1) history.back();
  else location.hash = '#/';
};

// Estrela recém-marcada dá um pequeno "pulo" depois que a tela é redesenhada.
const popStar = (id) => app.querySelectorAll(`.star[data-id="${id}"].on`).forEach((s) => s.classList.add('pop'));

app.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;

  if (act === 'open') {
    if (e.target.closest('.star')) return;
    location.hash = `#/r/${el.dataset.id}`;
  } else if (act === 'fav') {
    e.stopPropagation();
    const r = store.get(el.dataset.id);
    if (!r) return;
    saved(store.put('receita', { ...r, fav: !r.fav }));
    toast(r.fav ? 'Tirada das favoritas' : 'Adicionada às favoritas');
    await render({ keepScroll: true });
    popStar(r.id);
  } else if (act === 'back') {
    goBack(el.dataset.to);
  } else if (act === 'grind') {
    draft.grind = draft.grind === el.dataset.v ? '' : el.dataset.v; dirty = true;
    app.querySelectorAll('[data-act="grind"]').forEach((b) => {
      const on = b.dataset.v === draft.grind;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
    });
    const lbl = app.querySelector('[data-live="grind"]');
    if (lbl) lbl.textContent = draft.grind || 'Toque para escolher';
  } else if (act === 'rate') {
    const v = Number(el.dataset.v);
    draft.rating = draft.rating === v ? 0 : v; dirty = true;
    app.querySelectorAll('[data-act="rate"]').forEach((b) => {
      const n = Number(b.dataset.v);
      b.querySelector('.grain').classList.toggle('off', n > draft.rating);
      b.setAttribute('aria-checked', n === draft.rating);
    });
  } else if (act === 'draft-fav') {
    draft.fav = !draft.fav; dirty = true;
    el.setAttribute('aria-pressed', draft.fav);
    const s = el.querySelector('.star');
    s.classList.toggle('on', draft.fav);
    s.classList.toggle('pop', draft.fav);
  } else if (act === 'add-pour') {
    draft.pours.push({ t: '', g: '' }); dirty = true;
    await render({ keepScroll: true });
    app.querySelector(`[data-pour="${draft.pours.length - 1}"][data-k="t"]`)?.focus();
  } else if (act === 'rm-pour') {
    draft.pours.splice(Number(el.dataset.i), 1);
    if (!draft.pours.length) draft.pours.push({ t: '', g: '' });
    dirty = true; render({ keepScroll: true });
  } else if (act === 'add-step') {
    draft.steps.push({ t: '', x: '' }); dirty = true;
    await render({ keepScroll: true });
    app.querySelector(`[data-step="${draft.steps.length - 1}"][data-k="t"]`)?.focus();
  } else if (act === 'rm-step') {
    draft.steps.splice(Number(el.dataset.i), 1);
    if (!draft.steps.length) draft.steps.push({ t: '', x: '' });
    dirty = true; render({ keepScroll: true });
  } else if (act === 'save') {
    saveDraft();
  } else if (act === 'del-recipe') {
    const r = store.get(el.dataset.id);
    if (!(await confirmSheet('Apagar receita?', `A receita de “${r.coffee}” será apagada nos dois celulares.`, 'Apagar'))) return;
    saved(store.remove(r.id));
    toast('Receita apagada');
    location.replace(`#/m/${r.method}`);
  } else if (act === 'best-method') {
    const v = el.dataset.v;
    bestDraft.methods = bestDraft.methods.includes(v) ? bestDraft.methods.filter((x) => x !== v) : [...bestDraft.methods, v];
    dirty = true;
    render({ keepScroll: true });
  } else if (act === 'best-filter') {
    bestFilter = bestFilter === el.dataset.v ? '' : el.dataset.v;
    render({ keepScroll: true });
  } else if (act === 'stock-filter') {
    stockFilter = el.dataset.v;
    render({ keepScroll: true });
  } else if (act === 'podium') {
    const c = coffeeOf(el.dataset.id);
    const m = el.dataset.m;
    const v = Number(el.dataset.v);
    const pos = c.podium?.[m] === v ? 0 : v;
    setPodium(c.id, m, pos);
    toast(pos ? `${c.coffee}: ${MEDALS[pos]} na ${methodOf(m).name}` : `${c.coffee} saiu do pódio`);
    render({ keepScroll: true });
  } else if (act === 'draft-podium') {
    const m = el.dataset.m;
    const v = Number(el.dataset.v);
    bestDraft.podium[m] = bestDraft.podium[m] === v ? 0 : v;
    dirty = true;
    render({ keepScroll: true });
  } else if (act === 'cafe-status') {
    bestDraft.status = el.dataset.v; dirty = true;
    render({ keepScroll: true });
  } else if (act === 'cafe-rate') {
    const v = Number(el.dataset.v);
    bestDraft.rating = bestDraft.rating === v ? 0 : v; dirty = true;
    render({ keepScroll: true });
  } else if (act === 'save-best') {
    saveCoffee();
  } else if (act === 'del-best') {
    if (!(await confirmSheet('Excluir café?', `“${bestDraft.coffee}” sai da lista de cafés nos dois celulares. As receitas continuam salvas.`, 'Excluir'))) return;
    saved(store.remove(bestDraft.id));
    dirty = false;
    toast('Café excluído');
    location.replace('#/cafes');
  } else if (act === 'logout') {
    await store.signOut();
    mode = 'login';
    render();
  }
});

// Transição entre telas: entra pela direita ao avançar, pela esquerda ao voltar, fade entre abas.
let lastDepth = depthOf(route());
window.addEventListener('hashchange', () => {
  const d = depthOf(route());
  const dir = d > lastDepth ? 'fwd' : d < lastDepth ? 'back' : 'tab';
  lastDepth = d;
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    render();
    return;
  }
  document.documentElement.dataset.nav = dir;
  document.startViewTransition(() => render());
});

store.onChange(() => {
  // não atrapalha quem está preenchendo um formulário
  if (!isFormRoute(route())) render({ keepScroll: true });
});

(async () => {
  render();
  mode = await store.init();
  render();
})();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  // Quando uma versão nova do app é instalada, recarrega uma vez para já usá-la.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !isFormRoute(route())) location.reload();
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then((reg) => document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    }))
    .catch(() => {});
}
