# Focus Tasks

Lista de tarefas pessoal (tags, projetos, timer, ruído branco, estatísticas, calendário, páginas de projeto e muito mais).

## Como usar em outro computador

**Opção 1, sem instalar nada:** baixe o arquivo [`index.html`](index.html) (botão "Download raw file" no GitHub) e abra com dois cliques. Funciona no Chrome, Edge, Firefox ou Safari, até sem internet (só as fontes precisam de internet).

**Opção 2, pelo link:** se o GitHub Pages estiver ativado neste repositório (Settings → Pages → Branch `main`, pasta `/ (root)`), o site abre em `https://<seu-usuario>.github.io/focus-tasks/`.

## Onde ficam os dados

Os dados ficam salvos **no navegador** (localStorage) de cada computador. Abrir em outro PC começa com a lista vazia; as tarefas não vão sozinhas de um computador para o outro.
Para sincronizar entre computadores e usar com outras pessoas de verdade (compartilhar, Send, My team), é preciso a versão com contas: veja [`codigo/SETUP.md`](codigo/SETUP.md) (Supabase, gratuito).

## Código

- `codigo/src/`: o código fonte (CSS e JS em arquivos pequenos, `page.html` com o HTML).
- `codigo/build.py`: junta tudo. `python3 codigo/build.py` gera `codigo/index.html` (versão do Claude) e `codigo/focus-tasks.html` (versão que abre sozinha). Copie `codigo/focus-tasks.html` para `index.html` na raiz para atualizar o site.
- `codigo/tests/`: testes automáticos (Node + Playwright).
- `codigo/CODEMAP.md`: onde fica cada funcionalidade.
