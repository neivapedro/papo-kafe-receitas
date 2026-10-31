# Receitas · Papo Kafé

Caderno de receitas de café: V60, prensa francesa, cafeteira italiana e espresso.
Cada receita guarda o café, os parâmetros (dose, moagem, água, temperatura, tempo),
os despejos ou o passo a passo, a nota de 1 a 5 grãos e a estrela de favorita.
Tem também o ranking dos **Melhores cafés**.

App web instalável (PWA). No iPhone: abra o link no Safari,
toque em **Compartilhar → Adicionar à Tela de Início**. O ícone aparece como **Receitas**.

## Estrutura

- `index.html`: página única do app (também carrega as telas de abertura do iPhone)
- `css/style.css`: visual (cores da logo Papo Kafé, tema claro e escuro, tamanhos em `rem`)
- `js/app.js`: telas e interações (inclui o modo preparo)
- `js/store.js`: onde os dados são salvos (no aparelho e, com a conta ligada, no Supabase)
- `js/config.js`: endereço e chave pública do Supabase, e nomes de quem usa (Pedro e Karoline)
- `js/vendor/supabase.js`: biblioteca oficial do Supabase (supabase-js 2.117.2), guardada no app
- `fonts/`: Outfit e Figtree (variáveis, só o alfabeto latino), hospedadas no app
- `img/`: logo (WebP sem perdas, versões clara e escura) e o grão em vetor
- `splash/`: telas de abertura do iPhone e do iPad, em claro e escuro
- `supabase.sql`: cria a tabela compartilhada
- `sw.js`: abre na hora e funciona sem internet (veja abaixo)
- `manifest.webmanifest`, `icons/`: instalação na tela de início

## Publicar uma mudança

O app abre sempre pela cópia guardada no aparelho e baixa a versão nova em segundo plano.
Para o celular perceber que existe versão nova, **aumente o número em `sw.js`**
(`const VERSION = 'v10'` → `'v11'`) em toda publicação. Quando a versão nova termina de baixar,
aparece o aviso "Nova versão disponível · Atualizar". Sem tocar no aviso, ela entra
sozinha na próxima vez que o app for fechado e aberto.

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
