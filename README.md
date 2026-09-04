# High Roleplay — Mercado Negro no GitHub Pages

Site estático, responsivo e data-driven. O visual está no GitHub Pages; os preços ficam em `data/catalogo.json`.

## Estrutura
- `index.html` — portal e categorias
- `categoria.html` — página única que renderiza qualquer categoria
- `assets/style.css` — identidade visual
- `assets/app.js` — busca, filtros e renderização
- `data/catalogo.json` — fonte de dados publicada pela planilha
- `google-apps-script/Code.gs` — botão/menu para publicar a planilha no GitHub

## Como editar sem IA
Na planilha Google, use a aba `Tabela Mercado Negro` com pelo menos:

`CATEGORIA | ITEM | VALOR PARCERIA | VALOR PISTA`

Colunas opcionais:

`STATUS | DESTAQUE | OBSERVAÇÃO | ORDEM`

- STATUS: `ativo`, `inativo` ou `revisar`
- DESTAQUE: `SIM` para realçar
- OBSERVAÇÃO: aparece abaixo do item
- ORDEM: controla a posição dentro da categoria

Depois use o menu: **HIGH • Mercado Negro > Publicar no site**.

## Segurança
Nunca coloque o token do GitHub em uma célula ou arquivo do repositório. O script salva o token em Script Properties.
