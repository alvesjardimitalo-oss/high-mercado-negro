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

`STATUS | DESTAQUE | OBSERVAÇÃO | ORDEM | IMAGEM`

- STATUS: `ativo`, `inativo` (some do site), `revisar` (selo EM REVISÃO) ou `indisponivel` (selo INDISPONÍVEL, preço riscado e sem botão de orçamento)
- DESTAQUE: `SIM` para realçar
- OBSERVAÇÃO: aparece abaixo do item
- ORDEM: controla a posição dentro da categoria
- IMAGEM: nome do arquivo em `assets/itens` (ex.: `ak102.png`). Se ficar vazia, o item mantém a imagem que já tem no site.

### Regras de lavagem (opcional)
Crie a aba `Regras Lavagem` com `GRUPO | TIPO | TITULO | MAQUINA | LAVAGEM | CLIENTE` (opcionais `ATIVO | IMAGEM`).
Sem essa aba, a publicação mantém as regras que já estão no site.

### Imagens novas
Envie o PNG para `assets/itens` no GitHub (nome sem espaços nem acentos) e coloque o mesmo nome na coluna IMAGEM.

### Aviso no topo do site e link de denúncia (opcional)
Crie a aba `Config` com duas colunas (`CHAVE | VALOR`):

| CHAVE | VALOR |
|---|---|
| AVISO | Texto da faixa amarela no topo do site (deixe vazio para tirar a faixa) |
| LINK_DENUNCIA | Link do canal/ticket de denúncia (aparece em "Como funciona") |

Sem a aba, a publicação mantém os valores atuais.

Depois use o menu: **HIGH • Mercado Negro > Publicar no site**.

## O que acontece ao publicar
- O script compara com o site atual: itens com preço alterado ganham o selo **▲ SUBIU / ▼ CAIU** e itens novos o selo **NOVO** (os selos somem sozinhos após 15 dias).
- As mudanças ficam registradas em `historico.html`, com data e nome de quem publicou (as 40 publicações mais recentes).
- Se o segredo `DISCORD_WEBHOOK` estiver configurado no repositório, o GitHub gera uma **imagem com as mudanças** e posta no Discord (`.github/workflows/discord-aviso.yml` + `tools/discord/aviso.py`). Para reenviar: Actions > *Aviso de reajuste no Discord* > Run workflow.
- Antes de publicar, o script mostra avisos: item duplicado, pista abaixo da parceria, valor zerado, status desconhecido e imagem que não existe no repositório.

## Recursos do site
- Favoritos (☆), orçamento com texto pronto para o Discord, link direto de cada item (`tabela.html?q=ITEM&c=categoria`, `tabela.html?fav=1`).
- Calculadora de lavagem em `categoria.html?c=lavagem#calculadora`.
- Página `como-funciona.html` com as regras de parceria/pista e denúncia (texto editável direto no HTML).
- Prévia ao colar o link no Discord (`assets/og-image.png`) e instalação como app no celular (`manifest.webmanifest` + `sw.js`).

## Segurança
Nunca coloque o token do GitHub em uma célula ou arquivo do repositório. O script salva o token em Script Properties.


## Ações Blipadas

- Página: `acoes-blipadas.html`
- Dados publicados: `data/acoes-blipadas.json`
- Fonte de dados: aba `AÇÕES BLIPADAS` da planilha Mercado Negro.
- O botão **HIGH • Mercado Negro > Publicar no site** publica também as ações, após instalar a versão atualizada de `google-apps-script/Code.gs` no Apps Script vinculado à planilha.
- Localizações vazias aparecem como **Localização a confirmar**. Não inventar localizações.
- Equipamentos usam as imagens de `assets/itens` quando disponíveis.
- A página calcula lucro estimado com 30% de lavagem sobre a premiação suja, menos o custo total de equipamentos.

### Instalação do script atualizado

1. Abra a planilha Mercado Negro e acesse **Extensões > Apps Script**.
2. Faça uma cópia de segurança do conteúdo atual de `Code.gs`.
3. Substitua o conteúdo do arquivo vinculado pelo código completo de [google-apps-script/Code.gs](google-apps-script/Code.gs) e salve.
4. Volte à planilha e recarregue a página.
5. Use **HIGH • Mercado Negro > Validar tabela** e, em seguida, **Publicar no site**.
6. Confira a página `acoes-blipadas.html` e o arquivo `data/acoes-blipadas.json` no GitHub.

O token GitHub permanece nas propriedades do Apps Script; não o cole na planilha nem no repositório. Caso haja outros arquivos ou personalizações locais no projeto Apps Script, revise antes de substituir.

### Guia de operações — atualização de interface

O guia mantém a planilha como fonte de preços, kits, prêmios e regras. A atualização inclui:

- Cards por local agrupados pela ação, entrada por porte e dossiês com fotos e coordenadas.
- Busca específica por localização; filtros por equipe exata cadastrada, armamento e orçamento total do kit.
- Ordenação por nome, custo, lucro mínimo e retorno percentual sobre custo.
- Favoritos salvos no navegador e comparação de até três locais.
- Checklist por local durante a sessão, compartilhamento de link e cópia do planejamento para Discord.
- Lavagem obtida de `meta.taxa_lavagem` (padrão 0,30); divisão do lucro entre participantes permitidos. A seleção de equipe não reduz o custo do kit publicado.
- Regras por localização têm prioridade sobre as regras gerais. Dados ausentes não são tratados como valores zerados.

Os cálculos puros ficam em `assets/acoes-core.mjs`. Verificação: `node tools/test-acoes.mjs`.
