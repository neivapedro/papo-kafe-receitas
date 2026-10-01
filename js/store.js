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

const persist = () => write(KEY, items) && write(PENDING_KEY, [...pending]);

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

async function loadClient() {
  if (client || !cloudEnabled) return client;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  if (!client || !pending.size || !navigator.onLine) return;
  const rows = [...pending].map((id) => items[id]).filter(Boolean);
  const { error } = await client.from(TABLE).upsert(rows);
  if (error) return;
  rows.forEach((r) => pending.delete(r.id));
  persist();
}

async function pull() {
  const { data, error } = await client.from(TABLE).select('*');
  if (error) return false;
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
  await flush();
  if (await pull()) listener();
  await flush();
  subscribe();
}

export const store = {
  onChange(fn) { listener = fn; },

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
    startSync().catch(() => {});
    window.addEventListener('online', () => startSync().catch(() => {}));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') startSync().catch(() => {});
    });
    return 'nuvem';
  },

  async signIn(email, password) {
    await loadClient();
    const { error } = await client.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
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

  // Nome de quem entrou, tirado do e-mail do login (veja PEOPLE em config.js).
  me: () => read(ME_KEY, null),
};
