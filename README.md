# Receitas · Papo Kafé

Caderno de receitas de café: V60, prensa francesa, cafeteira italiana e espresso.
Cada receita guarda o café, os parâmetros (dose, moagem, água, temperatura, tempo),
os despejos ou o passo a passo, a nota de 1 a 5 grãos e a estrela de favorita.
Tem também o ranking dos **Melhores cafés**.

App web instalável (PWA). No iPhone: abra o link no Safari,
toque em **Compartilhar → Adicionar à Tela de Início**. O ícone aparece como **Receitas**.

## Estrutura

- `index.html`: página única do app
- `css/style.css`: visual (cores da logo Papo Kafé)
- `js/app.js`: telas e interações
- `js/store.js`: onde os dados são salvos (no aparelho e, com a conta ligada, no Supabase)
- `js/config.js`: endereço e chave pública do Supabase, e nomes de quem usa (Pedro e Karoline)
- `js/vendor/supabase.js`: biblioteca oficial do Supabase (supabase-js 2.117.2), guardada no app
- `supabase.sql`: cria a tabela compartilhada
- `sw.js`: funcionamento sem internet
- `manifest.webmanifest`, `icons/`, `img/`: instalação na tela de início e logo

## Ligar o compartilhamento (Pedro e Karoline)

Cada um entra com o próprio e-mail e senha. Tudo o que um cadastra aparece para o outro,
e a bolinha com a inicial (P ou K) mostra quem fez cada receita.

1. Crie uma conta grátis em <https://supabase.com> e um projeto novo (ex.: `papo-kafe`).
2. **SQL Editor → New query**: cole a primeira parte de `supabase.sql` (até o "PASSO 2") e clique em **Run**.
3. **Authentication → Users → Add user → Create new user**: crie o usuário do Pedro
   e o da Karoline (e-mail e senha, com "Auto Confirm User" marcado).
4. **SQL Editor**: rode o "PASSO 2" de `supabase.sql` com os e-mails de vocês, para gravar os nomes.
5. **Authentication → Sign In / Providers**: desligue **Allow new users to sign up**,
   para ninguém de fora conseguir criar conta.
6. **Project Settings → API Keys**: copie a **Project URL** e a chave **publishable** (ou "anon public")
   e cole em `js/config.js` (`SUPABASE_URL` e `SUPABASE_ANON_KEY`).
   Essa chave é feita para ficar no app; quem protege os dados é o login.
