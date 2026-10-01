// Conta online (Supabase), para Pedro e Karoline verem as mesmas receitas.
// Enquanto os dois campos estiverem vazios, o app salva só no próprio aparelho.
// Passo a passo para preencher: veja o README.

export const SUPABASE_URL = 'https://oxxjsityxtgzliplerti.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_hDVb3o5YKhkOQaSxMUjVNA_52aEHR9t';

// Quem usa o app. Cada um entra com o próprio e-mail; o nome vem do cadastro
// no Supabase (supabase.sql, passo 2) e a inicial aparece na bolinha das receitas.
export const PEOPLE = [
  { name: 'Pedro', initial: 'P' },
  { name: 'Karoline', initial: 'K' },
];
