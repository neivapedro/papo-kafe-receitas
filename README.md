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
- `js/config.js`: chaves do Supabase e nomes de quem usa (Pedro e Karoline)
- `supabase.sql`: cria a tabela compartilhada
- `sw.js`: funcionamento sem internet
- `manifest.webmanifest`, `icons/`, `img/`: instalação na tela de início e logo

## Ligar o compartilhamento (Pedro e Karoline)

Sem esta etapa, o app funciona normalmente, mas cada celular guarda só as próprias receitas.

1. Crie uma conta grátis em <https://supabase.com> e um projeto novo (ex.: `papo-kafe`).
2. **SQL Editor → New query**: cole o conteúdo de `supabase.sql` e clique em **Run**.
3. **Authentication → Users → Add user → Create new user**: crie um usuário para o Pedro
   e outro para a Karoline (e-mail e senha, com "Auto Confirm User" marcado).
4. **Authentication → Sign In / Providers**: desligue **Allow new users to sign up**,
   para ninguém de fora conseguir criar conta.
5. **Project Settings → API**: copie a **Project URL** e a chave **anon public**
   e cole em `js/config.js` (`SUPABASE_URL` e `SUPABASE_ANON_KEY`).
   A chave anon é feita para ficar no app; quem protege os dados é o login.

Depois disso, cada um entra com o próprio e-mail e senha, e as receitas aparecem nos dois celulares.
