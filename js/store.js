// Camada de dados.
// Sempre guarda uma cópia no aparelho (funciona sem internet).
// Com o Supabase configurado (js/config.js), sincroniza com a conta da casa:
// o que o Pedro salva aparece para a Karoline e vice-versa.

import { SUPABASE_URL, SUPABASE_ANON_KEY, PEOPLE } from './config.js';

const KEY = 'papo-kafe-receitas:v1';
const PENDING_KEY = 'papo-kafe-receitas:pendentes';
const ME_KEY = 'papo-kafe-receitas:eu';
const TABLE = 'itens';

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    }));

// Cada registro: { id, tipo: 'receita' | 'melhor', dados, apagado, atualizado_em }
const read = (k, fallback) => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
};

let items = read(KEY, {});
let pending = new Set(read(PENDING_KEY, []));
let client = null;
let listener = () => {};
let pulled = false; // já trouxe as receitas da conta nesta abertura?
let failed = false; // o último envio ou busca deu erro?
let statusListener = () => {};
let wired = false;
const bootAt = Date.now();
const notifyStatus = () => { try { statusListener(); } catch {} };

const persist = () => write(KEY, items) && write(PENDING_KEY, [...pending]);

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

async function loadClient() {
  if (client || !cloudEnabled) return client;
  // Biblioteca do Supabase guardada no próprio app (js/vendor), para abrir sem depender de CDN.
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = 'js/vendor/supabase.js';
      tag.onload = resolve;
      tag.onerror = reject;
      document.head.append(tag);
    });
  }
  client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return client;
}

function applyRemote(row) {
  if (pending.has(row.id)) return false;
  const local = items[row.id];
  if (local && local.atualizado_em > row.atualizado_em) return false;
  items[row.id] = { id: row.id, tipo: row.tipo, dados: row.dados, apagado: row.apagado, atualizado_em: row.atualizado_em };
  return true;
}

async function flush() {
  if (!client || !pending.size || !navigator.onLine) { notifyStatus(); return; }
  const rows = [...pending].map((id) => items[id]).filter(Boolean);
  const { error } = await client.from(TABLE).upsert(rows);
  failed = Boolean(error);
  if (!error) {
    rows.forEach((r) => pending.delete(r.id));
    persist();
  }
  notifyStatus();
}

async function pull() {
  const { data, error } = await client.from(TABLE).select('*');
  if (error) { failed = true; return false; }
  failed = false;
  let changed = false;
  data.forEach((row) => { changed = applyRemote(row) || changed; });
  persist();
  return changed;
}

let channel = null;
function subscribe() {
  if (channel) return;
  channel = client.channel('itens-casa')
    .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => {
      if (p.new && applyRemote(p.new)) { persist(); listener(); }
    })
    .subscribe();
}

// O nome fica no cadastro do usuário no Supabase (user_metadata.name).
function personOf(user) {
  const name = user?.user_metadata?.name;
  if (name) return PEOPLE.find((p) => p.name.toLowerCase() === name.toLowerCase())?.name || name;
  const nick = String(user?.email || '').split('@')[0];
  return nick ? nick[0].toUpperCase() + nick.slice(1) : null;
}

async function startSync() {
  try {
    await flush();
    const changed = await pull();
    const first = !pulled;
    pulled = true;
    if (changed || first) listener();
    await flush();
    subscribe();
  } catch {
    failed = true;
  } finally {
    pulled = true; // não deixa a tela em "carregando" se a busca falhar
    notifyStatus();
  }
}

export const store = {
  onChange(fn) { listener = fn; },
  onStatus(fn) { statusListener = fn; },

  // Situação da sincronização para os avisos da interface.
  status: () => ({
    cloud: cloudEnabled && Boolean(client),
    online: navigator.onLine,
    pending: pending.size,
    failed,
  }),

  // Devolve 'local', 'login' (precisa entrar) ou 'nuvem'.
  async init() {
    if (!cloudEnabled) return 'local';
    try {
      await loadClient();
    } catch {
      return 'local-offline'; // sem internet na primeira abertura: usa a cópia do aparelho
    }
    const { data } = await client.auth.getSession();
    if (!data.session) return 'login';
    write(ME_KEY, personOf(data.session.user));
    startSync();
    if (!wired) {
      wired = true;
      window.addEventListener('online', () => { notifyStatus(); startSync(); });
      window.addEventListener('offline', notifyStatus);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') startSync();
      });
    }
    return 'nuvem';
  },

  async signIn(email, password) {
    await loadClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (!error) return null;
    return !navigator.onLine || /fetch|network/i.test(`${error.name} ${error.message}`) ? 'rede' : 'senha';
  },

  async signOut() {
    if (client) await client.auth.signOut();
    try { localStorage.removeItem(ME_KEY); } catch {}
  },

  async userEmail() {
    if (!client) return null;
    const { data } = await client.auth.getSession();
    return data.session?.user?.email || null;
  },

  list(tipo) {
    return Object.values(items).filter((i) => i.tipo === tipo && !i.apagado).map((i) => i.dados);
  },

  get(id) {
    const i = items[id];
    return i && !i.apagado ? i.dados : null;
  },

  // Salva um ou vários registros do mesmo tipo.
  put(tipo, ...records) {
    const now = new Date().toISOString();
    records.forEach((dados) => {
      items[dados.id] = { id: dados.id, tipo, dados, apagado: false, atualizado_em: now };
      pending.add(dados.id);
    });
    const ok = persist();
    flush().catch(() => {});
    return ok;
  },

  remove(id) {
    const i = items[id];
    if (!i) return true;
    items[id] = { ...i, apagado: true, atualizado_em: new Date().toISOString() };
    pending.add(id);
    const ok = persist();
    flush().catch(() => {});
    return ok;
  },

  pendingCount: () => pending.size,

  // Primeira abertura com a conta online e nada guardado no aparelho ainda: a tela mostra "carregando"
  // (por no máximo 8 s, para não ficar presa se não houver internet).
  loading: () => cloudEnabled && !pulled && Object.keys(items).length === 0 && Date.now() - bootAt < 8000,

  // Nome de quem entrou, tirado do e-mail do login (veja PEOPLE em config.js).
  me: () => read(ME_KEY, null),
};
