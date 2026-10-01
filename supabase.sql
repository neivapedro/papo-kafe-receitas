-- Rode isto uma vez no Supabase: SQL Editor → New query → colar → Run.
-- Cria a tabela compartilhada da casa (receitas e melhores cafés).

create table if not exists public.itens (
  id uuid primary key,
  tipo text not null check (tipo in ('receita', 'melhor')),
  dados jsonb not null,
  apagado boolean not null default false,
  atualizado_em timestamptz not null default now()
);

alter table public.itens enable row level security;

-- Só quem tem login (Pedro e Karoline) lê e grava. Ninguém de fora acessa.
create policy "casa lê" on public.itens for select to authenticated using (true);
create policy "casa cria" on public.itens for insert to authenticated with check (true);
create policy "casa altera" on public.itens for update to authenticated using (true) with check (true);

-- Atualização ao vivo: o que um salva aparece na hora no celular do outro.
alter publication supabase_realtime add table public.itens;

-- ---------------------------------------------------------------
-- PASSO 2: rode só DEPOIS de criar os dois usuários
-- (Authentication → Users → Add user).
-- Troque os e-mails abaixo pelos de vocês. Isto grava o nome de cada um,
-- que vira a bolinha P ou K nas receitas. Os e-mails ficam só no Supabase.
-- ---------------------------------------------------------------
-- update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"name": "Pedro"}'
--   where email = 'EMAIL_DO_PEDRO';
-- update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || '{"name": "Karoline"}'
--   where email = 'EMAIL_DA_KAROLINE';
