import { store, uid, cloudEnabled } from './store.js';
import { PEOPLE } from './config.js';

const app = document.getElementById('app');
const tabsEl = document.getElementById('tabs');
const toastEl = document.getElementById('toast');

let mode = 'local';    // 'local' | 'nuvem' | 'login' | 'local-offline'
let draft = null;      // receita sendo preenchida
let draftKey = null;   // rota dona do rascunho
let dirty = false;
let bestDraft = null;  // item dos melhores sendo preenchido
let bestKey = null;
let bestFilter = '';   // método escolhido no filtro dos melhores ('' = todos)

/* ---------- métodos e receitas de referência ---------- */

const GRINDS = ['fina', 'média-fina', 'média', 'média-grossa', 'grossa'];

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

/* ---------- ícones ---------- */

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
  medal: '<path d="M8 2l2.5 6M16 2l-2.5 6"/><circle cx="12" cy="14.5" r="6"/><path d="M12 11.5l.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2-1.5-1.4 2-.3z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/>',
  grip: '<path d="M7 7h10M7 12h10M7 17h10"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
};
const svg = (k, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const grains = (n, cls = '') => Array.from({ length: 5 }, (_, i) =>
  `<i class="grain ${cls} ${i < n ? '' : 'off'}"></i>`).join('');

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
const byBubble = (name) => (name
  ? `<span class="by p${Math.max(0, PEOPLE.findIndex((p) => p.name === name))}" title="Cadastrada por ${esc(name)}">${esc(initialOf(name))}</span>` : '');

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toast.t);
  toast.t = setTimeout(() => { toastEl.hidden = true; }, 2200);
}

function saved(ok) {
  if (!ok) toast('Não foi possível salvar no aparelho. Verifique o espaço livre.');
  return ok;
}

const recipes = () => store.list('receita');
const best = () => store.list('melhor').sort((a, b) => a.rank - b.rank);
const recipesOf = (m) => recipes().filter((r) => r.method === m).sort((a, b) => b.createdAt - a.createdAt);

/* ---------- folha de confirmação (substitui confirm) ---------- */

function confirmSheet(title, text, label) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `
      <div class="sheet-bg" data-r="no"></div>
      <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <h2>${esc(title)}</h2>
        <p>${esc(text)}</p>
        <div class="sheet-actions">
          <button type="button" class="btn ghost" data-r="no">Cancelar</button>
          <button type="button" class="btn danger" data-r="yes">${esc(label)}</button>
        </div>
      </div>`;
    document.body.append(wrap);
    wrap.addEventListener('click', (e) => {
      const b = e.target.closest('[data-r]');
      if (!b) return;
      wrap.remove();
      resolve(b.dataset.r === 'yes');
    });
  });
}

/* ---------- pedaços de tela ---------- */

function bar(title, { back, icon, action } = {}) {
  return `
    <header class="bar">
      ${back ? `<button class="back" data-act="back" data-to="${esc(back)}" aria-label="Voltar">‹</button>` : ''}
      <h1>${icon ? svg(icon) : ''}<span>${esc(title)}</span></h1>
      ${action || ''}
    </header>`;
}

function recipeCard(r) {
  const meta = [r.dose && `${r.dose} g`, r.grind, r.water && `${r.water} g`, r.temp && `${r.temp} °C`, ratio(r)].filter(Boolean).join(' · ');
  return `
    <article class="card" data-act="open" data-id="${r.id}">
      <div class="card-main">
        <div class="card-name">${byBubble(r.by)}<span>${esc(r.coffee)}</span>${r.score ? `<span class="pts">${esc(r.score)} pts</span>` : ''}</div>
        ${meta ? `<div class="meta">${esc(meta)}</div>` : ''}
        ${r.rating ? `<div class="rate">${grains(r.rating)}</div>` : ''}
      </div>
      <button class="star ${r.fav ? 'on' : ''}" data-act="fav" data-id="${r.id}" aria-label="${r.fav ? 'Tirar das favoritas' : 'Marcar como favorita'}" aria-pressed="${!!r.fav}">${r.fav ? '★' : '☆'}</button>
    </article>`;
}

function renderTabs(active) {
  if (!active) { tabsEl.hidden = true; return; }
  const t = (key, href, icon, label) =>
    `<a href="${href}" class="${active === key ? 'on' : ''}"${active === key ? ' aria-current="page"' : ''}>${icon}<span>${label}</span></a>`;
  tabsEl.innerHTML =
    t('metodos', '#/', '<i class="grain"></i>', 'Métodos') +
    t('favoritas', '#/favoritas', `<span class="s">${active === 'favoritas' ? '★' : '☆'}</span>`, 'Favoritas') +
    t('melhores', '#/melhores', svg('medal'), 'Melhores');
  tabsEl.hidden = false;
}

/* ---------- telas ---------- */

function renderHome() {
  const all = recipes();
  return `
    <section class="home">
      <a class="gear" href="#/ajustes" aria-label="Ajustes">${svg('gear')}</a>
      <div class="hero"><img src="img/logo.png" alt="Papo Kafé" width="900" height="378"><small>Receitas</small></div>
      <div class="methods">
        ${METHODS.map((m) => {
          const n = all.filter((r) => r.method === m.id).length;
          return `<a class="method" href="#/m/${m.id}">${svg(m.id)}<b>${esc(m.name)}</b><small>${n === 0 ? 'nenhuma ainda' : n === 1 ? '1 receita' : `${n} receitas`}</small></a>`;
        }).join('')}
      </div>
    </section>`;
}

function renderList(m) {
  const list = recipesOf(m.id);
  return `
    ${bar(m.name, { back: '#/', icon: m.id })}
    <section class="content">
      ${list.length ? list.map(recipeCard).join('') : `
        <div class="empty">
          <p>Nenhuma receita de ${esc(m.name)} ainda.</p>
          <a class="link" href="#/m/${m.id}/referencia">Começar pela receita de referência</a>
        </div>`}
      <a class="fab" href="#/m/${m.id}/nova">+ Nova receita de ${esc(m.name)}</a>
    </section>`;
}

function tag(icon, k, v, cls = '') {
  return v ? `<div class="tag ${cls}"><span class="k">${icon ? svg(icon) : ''}${k}</span><span class="v">${esc(v)}</span></div>` : '';
}

function renderRecipe(r) {
  const m = methodOf(r.method);
  const inBest = best().find((b) => b.recipeId === r.id);
  const grind = [r.grind, r.clicks && `${r.clicks} cl.`].filter(Boolean).join(' · ');
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
        <div>
          <h2 class="name">${esc(r.coffee)}</h2>
          <div class="score">${r.score ? `${esc(r.score)} pts` : ''}${r.rating ? `<span class="rate">${grains(r.rating)}</span>` : ''}</div>
        </div>
        <button class="star big ${r.fav ? 'on' : ''}" data-act="fav" data-id="${r.id}" aria-label="${r.fav ? 'Tirar das favoritas' : 'Marcar como favorita'}" aria-pressed="${!!r.fav}">${r.fav ? '★' : '☆'}</button>
      </div>
      ${r.notes ? `<p class="sens">${esc(r.notes)}</p>` : ''}
      <h3 class="vsec">Receita</h3>
      <div class="tags">
        ${tag('bean', 'Café', r.dose && `${r.dose} g`)}
        ${tag('drop', m.waterLabel || 'Água', r.water && `${r.water} g`)}
        ${tag('', 'Proporção', ratio(r), 'ratio')}
        ${tag('grind', 'Moagem', grind)}
        ${tag('temp', 'Temp.', r.temp && `${r.temp} °C`)}
        ${tag('clock', 'Tempo', timeRange(r))}
      </div>
      ${pours ? `<h3 class="vsec">Despejos</h3><div class="vsteps">${pours}</div>` : ''}
      ${steps ? `<h3 class="vsec">Passo a passo</h3><div class="vsteps">${steps}</div>` : ''}
      ${r.obs ? `<div class="note"><b>Observação</b>${esc(r.obs)}</div>` : ''}
      <div class="vact">
        <a href="#/r/${r.id}/duplicar">Duplicar</a>
        ${inBest ? `<a href="#/b/${inBest.id}">${svg('medal')} ${inBest.rank}º nos melhores</a>` : `<a href="#/melhores/novo/${r.id}">✚ Melhores</a>`}
        <button data-act="del-recipe" data-id="${r.id}">Apagar</button>
      </div>
      <p class="by-line">${r.by ? `${byBubble(r.by)} cadastrada por ${esc(r.by)} · ` : ''}${fmtDate(r.createdAt)}</p>
    </section>`;
}

/* ---------- formulário da receita ---------- */

function newDraft(m, base) {
  const src = base || {};
  return {
    id: uid(), method: m.id, by: store.me() || '', createdAt: Date.now(),
    coffee: '', score: '', notes: '', dose: '', grind: '', clicks: '', water: '', temp: '', tmin: '', tmax: '',
    obs: '', rating: 0, fav: false,
    ...structuredClone(src),
    pours: m.pours ? structuredClone(src.pours || [{ t: '0:00', g: '' }]) : undefined,
    steps: m.pours ? undefined : structuredClone(src.steps || [{ t: '0:00', x: '' }]),
  };
}

function inp(field, { ph = '', mode = 'text', time = '', cls = '' } = {}) {
  return `<input class="in ${cls}" data-f="${field}" value="${esc(draft[field])}" placeholder="${esc(ph)}" inputmode="${mode}" autocomplete="off"${time ? ` data-time="${time}"` : ''}>`;
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

function renderForm(m, title) {
  const ref = m.ref;
  const sec = m.seconds;
  const hints = m.pours ? pourHints() : [];
  const last = m.pours ? num(draft.pours.at(-1)?.g) : null;
  const water = num(draft.water);
  return `
    ${bar(title, { back: 'back', icon: m.id, action: '<button class="act" data-act="save">Salvar</button>' })}
    <form class="content form" autocomplete="off" novalidate>
      <h2 class="sec">Café</h2>
      <div class="row2 narrow-right">
        <label class="field"><span class="lbl">Café</span>${inp('coffee', { ph: ref.coffee || 'Nome do café' })}</label>
        <label class="field"><span class="lbl">Pontos</span>${inp('score', { ph: '84', mode: 'decimal' })}</label>
      </div>
      <label class="field"><span class="lbl">Notas sensoriais</span>
        <textarea class="in" data-f="notes" rows="2" placeholder="Chocolate ao leite, fava de baunilha e mel">${esc(draft.notes)}</textarea></label>

      <h2 class="sec">Receita</h2>
      <label class="param">${svg('bean')}<span class="lbl">Café</span><span class="unit">${inp('dose', { ph: ref.dose, mode: 'decimal' })}<span>g</span></span></label>
      <div class="param top">${svg('grind')}<span class="lbl">Moagem</span>
        <div class="field">
          <div class="seg" role="radiogroup" aria-label="Moagem">
            ${GRINDS.map((g) => `<button type="button" role="radio" aria-checked="${draft.grind === g}" class="${draft.grind === g ? 'on' : ''}" data-act="grind" data-v="${g}">${g}</button>`).join('')}
          </div>
          <span class="unit">${inp('clicks', { ph: '18', mode: 'decimal' })}<span>cliques</span></span>
        </div>
      </div>
      <label class="param">${svg('drop')}<span class="lbl">${m.waterLabel || 'Água'}</span><span class="unit">${inp('water', { ph: ref.water, mode: 'decimal' })}<span>g</span></span></label>
      <label class="param">${svg('temp')}<span class="lbl">Temp.</span><span class="unit">${inp('temp', { ph: ref.temp, mode: 'decimal' })}<span>°C</span></span></label>
      <div class="param">${svg('clock')}<span class="lbl">Tempo</span>
        <span class="unit">${inp('tmin', { ph: ref.tmin, mode: sec ? 'decimal' : 'numeric', time: sec ? '' : 'm' })}<span>a</span>${inp('tmax', { ph: ref.tmax || 'opcional', mode: sec ? 'decimal' : 'numeric', time: sec ? '' : 'm' })}<span>${sec ? 's' : 'min'}</span></span>
      </div>
      <div class="calc"><span>Proporção</span><b data-live="ratio">${ratio(draft) || '—'}</b></div>

      ${m.pours ? `
        <h2 class="sec">Despejos</h2>
        <div class="pour head"><span class="lbl">Tempo</span><span class="lbl">Balança</span><span class="lbl">Despejo</span><span></span></div>
        ${draft.pours.map((p, i) => `
          <div class="pour">
            <input class="in" data-pour="${i}" data-k="t" value="${esc(p.t)}" placeholder="${esc(ref.pours[i]?.t || '')}" inputmode="numeric" data-time="s">
            <span class="unit"><input class="in" data-pour="${i}" data-k="g" value="${esc(p.g)}" placeholder="${esc(ref.pours[i]?.g || '')}" inputmode="decimal"><span>g</span></span>
            <span class="d" data-live="d${i}">${hints[i] || ''}</span>
            <button type="button" class="rm" data-act="rm-pour" data-i="${i}" aria-label="Remover despejo">${svg('x')}</button>
          </div>`).join('')}
        <div class="pour-foot">
          <button type="button" class="addline" data-act="add-pour">+ despejo</button>
          <span class="check-water" data-live="check">${last != null && water != null ? (last === water ? '✓ bate com a água' : `faltam ${fmtNum(water - last)} g`) : ''}</span>
        </div>` : `
        <h2 class="sec">Passo a passo</h2>
        ${draft.steps.map((s, i) => `
          <div class="step-row">
            <input class="in" data-step="${i}" data-k="t" value="${esc(s.t)}" placeholder="${esc(ref.steps[i]?.t || '')}">
            <textarea class="in" data-step="${i}" data-k="x" rows="2" placeholder="${esc(ref.steps[i]?.x || 'O que fazer')}">${esc(s.x)}</textarea>
            <button type="button" class="rm" data-act="rm-step" data-i="${i}" aria-label="Remover passo">${svg('x')}</button>
          </div>`).join('')}
        <button type="button" class="addline" data-act="add-step">+ passo</button>`}

      <h2 class="sec">Depois de provar</h2>
      <div class="field"><span class="lbl">Minha nota</span>
        <div class="rateline" role="radiogroup" aria-label="Minha nota">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="${draft.rating === n}" aria-label="${n} de 5" data-act="rate" data-v="${n}"><i class="grain ${n <= draft.rating ? '' : 'off'}"></i></button>`).join('')}
        </div>
      </div>
      <label class="field"><span class="lbl">Observação</span>
        <textarea class="in" data-f="obs" rows="3" placeholder="${esc(ref.obs || 'Ex.: ficou doce; da próxima vez, 1 clique mais fino')}">${esc(draft.obs)}</textarea></label>
      <button type="button" class="favrow" data-act="draft-fav" aria-pressed="${draft.fav}"><span>Favorita</span><span class="star ${draft.fav ? 'on' : ''}">${draft.fav ? '★' : '☆'}</span></button>
      <button type="button" class="fab" data-act="save">Salvar receita</button>
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
  const last = num(draft.pours.at(-1)?.g); const water = num(draft.water);
  if (c) c.textContent = last != null && water != null ? (last === water ? '✓ bate com a água' : `faltam ${fmtNum(water - last)} g`) : '';
}

function saveDraft() {
  if (!draft.coffee.trim()) {
    toast('Dê um nome ao café para salvar.');
    app.querySelector('[data-f="coffee"]')?.focus();
    return;
  }
  const clean = { ...draft, coffee: draft.coffee.trim(), updatedAt: Date.now() };
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
  return `
    ${bar('Favoritas')}
    <section class="content">
      ${groups.length ? groups.map(({ m, list }) => `
        <h2 class="grp">${svg(m.id)}${esc(m.name)}</h2>
        ${list.map(recipeCard).join('')}`).join('') : `
        <div class="empty"><p>Nenhuma favorita ainda. Toque na ☆ de uma receita para ela aparecer aqui.</p></div>`}
    </section>`;
}

/* ---------- melhores cafés ---------- */

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

function renderBest() {
  const all = best();
  const list = bestFilter ? all.filter((b) => bestMethods(b).includes(bestFilter)) : all;
  const fm = methodOf(bestFilter);
  return `
    ${bar('Melhores cafés', { icon: 'medal', action: '<a class="act" href="#/melhores/novo">+ Adicionar</a>' })}
    <section class="content">
      ${all.length ? `
        <div class="mchips filter" role="group" aria-label="Filtrar por método">
          <button type="button" class="mchip ${bestFilter ? '' : 'on'}" data-act="best-filter" data-v="" aria-pressed="${!bestFilter}">Todos</button>
          ${methodChips(bestFilter ? [bestFilter] : [], 'best-filter')}
        </div>` : ''}
      ${list.length ? `
        <ol class="best-list">
          ${list.map((b, i) => {
            const ms = bestMethods(b).map(methodOf).filter(Boolean);
            return `
              <li class="best" data-id="${b.id}">
                <span class="pos">${i + 1}</span>
                <a class="best-body" href="#/b/${b.id}">
                  <span class="n">${byBubble(b.by)}<span>${esc(b.coffee)}</span>${b.score ? `<span class="pts">${esc(b.score)} pts</span>` : ''}</span>
                  ${b.why ? `<span class="s">${esc(b.why)}</span>` : ''}
                  ${ms.length ? `<span class="for">Indicado para ${ms.map((m) => `<span class="for-m">${svg(m.id)}${esc(m.name)}</span>`).join('')}</span>` : ''}
                  <span class="flags">
                    <span class="src">${b.recipeId ? 'da receita' : '✎ digitado'}</span>
                    ${b.buyAgain ? '<span class="flag">compraria de novo</span>' : ''}
                    ${b.recommend ? '<span class="flag">indicaria</span>' : ''}
                  </span>
                </a>
                ${bestFilter ? '<span></span>' : `<span class="grip" aria-label="Arrastar para mudar a posição" role="button" tabindex="0">${svg('grip')}</span>`}
              </li>`;
          }).join('')}
        </ol>
        <p class="mini">${bestFilter ? `Ranking dos melhores para ${esc(fm.name)}. Para mudar a ordem, volte para “Todos”.` : 'Segure ≡ e arraste para mudar a ordem do ranking.'}</p>` : bestFilter ? `
        <div class="empty"><p>Nenhum café indicado para ${esc(fm.name)} ainda.</p></div>` : `
        <div class="empty"><p>Ainda não tem nenhum café aqui. Adicione os cafés que vocês indicariam e comprariam de novo.</p></div>`}
      <a class="fab" href="#/melhores/novo">+ Adicionar café</a>
    </section>`;
}

function newBest(recipeId) {
  const r = recipeId ? store.get(recipeId) : null;
  return {
    id: uid(), by: store.me() || '', createdAt: Date.now(),
    source: 'receita',
    recipeId: r ? r.id : null,
    coffee: r ? r.coffee : '', score: r ? r.score : '', why: r ? r.notes : '',
    methods: r ? [r.method] : bestFilter ? [bestFilter] : [],
    where: '', buyAgain: true, recommend: true, rank: null, q: '',
  };
}

function pickRecipe(r) {
  bestDraft.recipeId = r.id;
  bestDraft.coffee = r.coffee;
  bestDraft.score = r.score || '';
  if (!bestDraft.why) bestDraft.why = r.notes || '';
  if (!bestDraft.methods.length) bestDraft.methods = [r.method];
}

function renderBestForm(isNew) {
  const b = bestDraft;
  const q = norm(b.q);
  const all = recipes().sort((x, y) => x.coffee.localeCompare(y.coffee, 'pt-BR'))
    .filter((r) => !q || norm(r.coffee).includes(q));
  const binp = (f, ph, mode = 'text') => `<input class="in" data-b="${f}" value="${esc(b[f])}" placeholder="${esc(ph)}" inputmode="${mode}" autocomplete="off">`;
  return `
    ${bar(isNew ? 'Adicionar café' : 'Editar café', { back: 'back', icon: 'medal', action: '<button class="act" data-act="save-best">Salvar</button>' })}
    <form class="content form" autocomplete="off" novalidate>
      <div class="toggle" role="tablist">
        <button type="button" role="tab" aria-selected="${b.source === 'receita'}" class="${b.source === 'receita' ? 'on' : ''}" data-act="source" data-v="receita">Escolher de uma receita</button>
        <button type="button" role="tab" aria-selected="${b.source === 'nome'}" class="${b.source === 'nome' ? 'on' : ''}" data-act="source" data-v="nome">Digitar o nome</button>
      </div>
      ${b.source === 'receita' ? `
        ${recipes().length ? `
          <label class="field"><span class="lbl">Buscar nas receitas</span>${binp('q', 'Nome do café…', 'search')}</label>
          <div class="pick">
            ${all.map((r) => `
              <button type="button" class="${b.recipeId === r.id ? 'sel' : ''}" data-act="pick" data-id="${r.id}">
                ${svg(r.method)}<span>${esc(r.coffee)} <small>· ${esc(methodOf(r.method).name)}${r.score ? ` · ${esc(r.score)} pts` : ''}</small></span><span class="chk">${b.recipeId === r.id ? '✓' : ''}</span>
              </button>`).join('') || '<p class="mini">Nenhuma receita com esse nome.</p>'}
          </div>
          <p class="mini">Nome, pontuação e notas vêm da receita. Dá para editar abaixo.</p>` : `
          <p class="mini">Você ainda não tem receitas salvas. Use “Digitar o nome”.</p>`}` : ''}
      <h2 class="sec">Sobre o café</h2>
      <div class="row2 narrow-right">
        <label class="field"><span class="lbl">Café</span>${binp('coffee', 'Nome do café')}</label>
        <label class="field"><span class="lbl">Pontos</span>${binp('score', '86', 'decimal')}</label>
      </div>
      <div class="field"><span class="lbl">Indicado para qual método</span>
        <div class="mchips" role="group" aria-label="Indicado para">${methodChips(b.methods, 'best-method')}</div>
        <span class="mini">Pode marcar mais de um.</span>
      </div>
      <label class="field"><span class="lbl">Por que está entre os melhores</span>
        <textarea class="in" data-b="why" rows="3" placeholder="Doce, limpo, chocolate ao leite…">${esc(b.why)}</textarea></label>
      <label class="field"><span class="lbl">Onde comprar (opcional)</span>${binp('where', 'Torrefação, loja, assinatura…')}</label>
      <label class="check"><input type="checkbox" data-b="buyAgain" ${b.buyAgain ? 'checked' : ''}><span>Compraria de novo</span></label>
      <label class="check"><input type="checkbox" data-b="recommend" ${b.recommend ? 'checked' : ''}><span>Indicaria</span></label>
      <button type="button" class="fab" data-act="save-best">Salvar</button>
      ${isNew ? '' : `<button type="button" class="btn-text danger" data-act="del-best">Tirar dos melhores</button>`}
    </form>`;
}

function saveBest() {
  const b = bestDraft;
  if (!b.coffee.trim()) {
    toast(b.source === 'receita' && !b.recipeId ? 'Escolha uma receita ou digite o nome do café.' : 'Digite o nome do café.');
    return;
  }
  if (!b.methods.length) {
    toast('Marque para qual método você indica este café.');
    return;
  }
  const list = best();
  const rec = {
    id: b.id, by: b.by, createdAt: b.createdAt,
    recipeId: b.source === 'receita' ? b.recipeId : null,
    coffee: b.coffee.trim(), score: b.score, why: b.why, where: b.where,
    methods: METHODS.map((m) => m.id).filter((id) => b.methods.includes(id)),
    buyAgain: b.buyAgain, recommend: b.recommend,
    rank: b.rank ?? (list.length ? Math.max(...list.map((x) => x.rank)) + 1 : 1),
  };
  if (!saved(store.put('melhor', rec))) return;
  dirty = false; bestDraft = null; bestKey = null;
  toast('Salvo nos melhores');
  location.replace('#/melhores');
}

/* ---------- ajustes, entrada e quem sou eu ---------- */

function renderLogin() {
  return `
    <section class="center">
      <img class="logo-sm" src="img/logo.png" alt="Papo Kafé" width="900" height="378">
      <h1>Entrar</h1>
      <form class="login" data-form="login" novalidate>
        <label class="field"><span class="lbl">E-mail</span><input class="in" name="email" type="email" autocomplete="username" inputmode="email" required></label>
        <label class="field"><span class="lbl">Senha</span><input class="in" name="password" type="password" autocomplete="current-password" required></label>
        <p class="err" hidden></p>
        <button class="fab" type="submit">Entrar</button>
      </form>
    </section>`;
}

async function renderSettings() {
  const email = mode === 'nuvem' ? await store.userEmail() : null;
  const pend = store.pendingCount();
  return `
    ${bar('Ajustes', { back: '#/' })}
    <section class="content">
      <h2 class="sec">Conta</h2>
      ${mode === 'nuvem' ? `
        <p>Conectado como <b>${esc(store.me() || '')}</b> (${esc(email || '')}). As receitas são as mesmas nos celulares do Pedro e da Karoline.</p>
        ${pend ? `<p class="mini">${pend} alteração(ões) aguardando internet para sincronizar.</p>` : '<p class="mini">Tudo sincronizado.</p>'}
        <button class="btn-text danger" data-act="logout">Sair da conta</button>` : `
        <p>As receitas estão salvas só neste celular.</p>
        <p class="mini">${cloudEnabled ? 'Sem internet no momento; a sincronização volta sozinha.' : 'Para o Pedro e a Karoline verem as mesmas receitas, falta ligar a conta online (veja o README do projeto).'}</p>`}
    </section>`;
}

/* ---------- arrastar no ranking ---------- */

function enableDrag() {
  const list = app.querySelector('.best-list');
  if (!list) return;
  let item = null;
  let startY = 0;
  list.addEventListener('pointerdown', (e) => {
    const grip = e.target.closest('.grip');
    if (!grip) return;
    e.preventDefault();
    item = grip.closest('.best');
    startY = e.clientY;
    item.classList.add('dragging');
    grip.setPointerCapture(e.pointerId);
  });
  list.addEventListener('pointermove', (e) => {
    if (!item) return;
    item.style.transform = `translateY(${e.clientY - startY}px)`;
    const siblings = [...list.children].filter((li) => li !== item);
    const after = siblings.find((li) => {
      const r = li.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    const before = item.getBoundingClientRect().top;
    if (after) { if (after !== item.nextElementSibling) list.insertBefore(item, after); } else if (item !== list.lastElementChild) list.append(item);
    startY += item.getBoundingClientRect().top - before;
    item.style.transform = `translateY(${e.clientY - startY}px)`;
  });
  const end = () => {
    if (!item) return;
    item.classList.remove('dragging');
    item.style.transform = '';
    item = null;
    const ids = [...list.children].map((li) => li.dataset.id);
    const byId = Object.fromEntries(best().map((b) => [b.id, b]));
    const changed = ids.map((id, i) => ({ ...byId[id], rank: i + 1 })).filter((b) => byId[b.id].rank !== b.rank);
    if (changed.length) saved(store.put('melhor', ...changed));
    render({ keepScroll: true });
  };
  list.addEventListener('pointerup', end);
  list.addEventListener('pointercancel', end);
  // teclado: setas sobem e descem o café
  list.addEventListener('keydown', (e) => {
    const grip = e.target.closest('.grip');
    if (!grip || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
    e.preventDefault();
    const ids = best().map((b) => b.id);
    const i = ids.indexOf(grip.closest('.best').dataset.id);
    const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    const byId = Object.fromEntries(best().map((b) => [b.id, b]));
    saved(store.put('melhor', ...ids.map((id, k) => ({ ...byId[id], rank: k + 1 }))));
    render({ keepScroll: true });
    app.querySelectorAll('.grip')[j]?.focus();
  });
}

/* ---------- rotas ---------- */

function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean);
  return parts;
}

const isFormRoute = (p) => (p[0] === 'm' && (p[2] === 'nova' || p[2] === 'referencia'))
  || (p[0] === 'r' && (p[2] === 'editar' || p[2] === 'duplicar'))
  || (p[0] === 'melhores' && p[1] === 'novo') || p[0] === 'b';

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
  } else if (p[0] === 'melhores' && p[1] === 'novo') {
    if (bestKey !== key) { bestDraft = newBest(p[2]); bestKey = key; dirty = false; }
    html = renderBestForm(true);
  } else if (p[0] === 'melhores') {
    html = renderBest(); tab = 'melhores';
  } else if (p[0] === 'b' && store.list('melhor').find((b) => b.id === p[1])) {
    if (bestKey !== key) {
      const b = store.list('melhor').find((x) => x.id === p[1]);
      bestDraft = { ...b, methods: [...bestMethods(b)], source: b.recipeId ? 'receita' : 'nome', q: '' };
      bestKey = key; dirty = false;
    }
    html = renderBestForm(false);
  } else if (p[0] === 'ajustes') {
    html = await renderSettings();
  } else {
    location.replace('#/');
    return;
  }

  if (!isFormRoute(p)) { draft = null; draftKey = null; bestDraft = null; bestKey = null; dirty = false; }
  app.innerHTML = html;
  renderTabs(tab);
  document.body.classList.toggle('has-tabs', !!tab);
  enableDrag();
  window.scrollTo(0, keepScroll ? y : 0);
}

/* ---------- eventos ---------- */

app.addEventListener('input', (e) => {
  const t = e.target;
  if (draft && t.dataset.f) { draft[t.dataset.f] = t.value; dirty = true; updateLive(); }
  if (draft && t.dataset.pour) { draft.pours[t.dataset.pour][t.dataset.k] = t.value; dirty = true; updateLive(); }
  if (draft && t.dataset.step) { draft.steps[t.dataset.step][t.dataset.k] = t.value; dirty = true; }
  if (bestDraft && t.dataset.b) {
    const k = t.dataset.b;
    bestDraft[k] = t.type === 'checkbox' ? t.checked : t.value;
    if (k !== 'q') dirty = true;
    if (k === 'q') {
      render({ keepScroll: true }).then(() => {
        const q = app.querySelector('[data-b="q"]');
        q?.focus(); q?.setSelectionRange(q.value.length, q.value.length);
      });
    }
  }
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
    render({ keepScroll: true });
  } else if (act === 'back') {
    goBack(el.dataset.to);
  } else if (act === 'grind') {
    draft.grind = draft.grind === el.dataset.v ? '' : el.dataset.v; dirty = true;
    app.querySelectorAll('[data-act="grind"]').forEach((b) => {
      const on = b.dataset.v === draft.grind;
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
    });
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
    const s = el.querySelector('.star'); s.classList.toggle('on', draft.fav); s.textContent = draft.fav ? '★' : '☆';
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
  } else if (act === 'source') {
    bestDraft.source = el.dataset.v;
    if (el.dataset.v === 'nome') bestDraft.recipeId = null;
    render({ keepScroll: true });
  } else if (act === 'pick') {
    pickRecipe(store.get(el.dataset.id)); dirty = true;
    render({ keepScroll: true });
  } else if (act === 'best-method') {
    const v = el.dataset.v;
    bestDraft.methods = bestDraft.methods.includes(v) ? bestDraft.methods.filter((x) => x !== v) : [...bestDraft.methods, v];
    dirty = true;
    const on = bestDraft.methods.includes(v);
    el.classList.toggle('on', on); el.setAttribute('aria-pressed', on);
  } else if (act === 'best-filter') {
    bestFilter = bestFilter === el.dataset.v ? '' : el.dataset.v;
    render({ keepScroll: true });
  } else if (act === 'save-best') {
    saveBest();
  } else if (act === 'del-best') {
    if (!(await confirmSheet('Tirar dos melhores?', `“${bestDraft.coffee}” sai do ranking. A receita, se houver, continua salva.`, 'Tirar'))) return;
    saved(store.remove(bestDraft.id));
    const rest = best();
    saved(store.put('melhor', ...rest.map((b, i) => ({ ...b, rank: i + 1 }))));
    dirty = false;
    location.replace('#/melhores');
  } else if (act === 'logout') {
    await store.signOut();
    mode = 'login';
    render();
  }
});

window.addEventListener('hashchange', () => render());

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
