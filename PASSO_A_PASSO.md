# PASSO A PASSO — PUBLICAR E ATUALIZAR

## 1. Criar o repositório
1. No GitHub, crie um repositório, por exemplo `high-mercado-negro`.
2. Envie todo o conteúdo desta pasta para a raiz do repositório.
3. Confirme que `index.html` está na raiz.

## 2. Ativar o GitHub Pages
1. Abra o repositório > **Settings** > **Pages**.
2. Em **Build and deployment**, selecione **Deploy from a branch**.
3. Selecione a branch `main` e a pasta `/(root)`.
4. Salve.

## 3. Levar a planilha para Google Sheets
1. Importe `Tabela_Mercado_Negro_High_2026_Editavel.xlsx` no Google Drive/Sheets ou monte a aba com os mesmos cabeçalhos.
2. A aba usada pelo script precisa se chamar exatamente `Tabela Mercado Negro`.
3. As quatro primeiras colunas mínimas são CATEGORIA, ITEM, VALOR PARCERIA e VALOR PISTA.
4. Se quiser, adicione STATUS, DESTAQUE, OBSERVAÇÃO e ORDEM.

## 4. Instalar o Apps Script
1. Na planilha: **Extensões > Apps Script**.
2. Apague o conteúdo de `Code.gs` e cole o conteúdo de `google-apps-script/Code.gs` deste pacote.
3. Em Configurações do projeto, use o fuso `America/Sao_Paulo`.
4. Salve e recarregue a planilha.
5. Aparecerá o menu **HIGH • Mercado Negro**.

## 5. Criar token restrito no GitHub
Crie um Fine-grained Personal Access Token limitado SOMENTE ao repositório do Mercado Negro e com permissão **Contents: Read and write**. Não dê acesso a outros repositórios.

## 6. Conectar a planilha ao GitHub
1. Na planilha: **HIGH • Mercado Negro > Configurar GitHub**.
2. Informe seu usuário/organização do GitHub.
3. Informe o nome do repositório.
4. Cole o token.
5. Na primeira execução o Google pedirá autorização do script.

## 7. Publicar uma atualização
1. Edite itens ou valores normalmente.
2. Clique **HIGH • Mercado Negro > Validar tabela**.
3. Clique **HIGH • Mercado Negro > Publicar no site**.
4. O script atualiza `data/catalogo.json` no GitHub criando um commit.
5. O GitHub Pages publica a nova versão após processar o commit.

## Fluxo final
PLANILHA → PUBLICAR NO SITE → GITHUB COMMIT → GITHUB PAGES → SITE ATUALIZADO

## Importante
- Não publique o token no GitHub.
- Se o repositório mudar de nome, execute Configurar GitHub novamente.
- Se a branch não for `main`, altere `branch` no começo de `Code.gs`.
- Itens com STATUS `inativo` permanecem no JSON, mas não aparecem no site.
