/**
 * HIGH ROLEPLAY — Mercado Negro
 * Publica a aba "Tabela Mercado Negro" no arquivo data/catalogo.json do GitHub.
 *
 * Cabeçalhos obrigatórios:
 * CATEGORIA | ITEM | VALOR PARCERIA | VALOR PISTA
 *
 * Opcionais:
 * STATUS | DESTAQUE | OBSERVAÇÃO | ORDEM
 */
const HIGH_SITE = {
  sheetName: 'Tabela Mercado Negro',
  githubPath: 'data/catalogo.json',
  branch: 'main'
};

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('HIGH • Mercado Negro')
    .addItem('Configurar GitHub', 'configurarGitHub')
    .addSeparator()
    .addItem('Validar tabela', 'validarTabela')
    .addItem('Publicar no site', 'publicarNoGitHub')
    .addToUi();
}

function configurarGitHub() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const owner = ui.prompt('GitHub', 'Usuário/organização dona do repositório:', ui.ButtonSet.OK_CANCEL);
  if (owner.getSelectedButton() !== ui.Button.OK) return;
  const repo = ui.prompt('GitHub', 'Nome do repositório:', ui.ButtonSet.OK_CANCEL);
  if (repo.getSelectedButton() !== ui.Button.OK) return;
  const token = ui.prompt('GitHub', 'Cole o Fine-grained token com Contents: Read and write:', ui.ButtonSet.OK_CANCEL);
  if (token.getSelectedButton() !== ui.Button.OK) return;
  props.setProperties({GH_OWNER: owner.getResponseText().trim(), GH_REPO: repo.getResponseText().trim(), GH_TOKEN: token.getResponseText().trim()});
  ui.alert('Configuração salva nas propriedades do Apps Script. O token não foi gravado em nenhuma célula.');
}

function validarTabela() {
  const data = montarCatalogo_();
  SpreadsheetApp.getUi().alert(`Tabela válida.\n\n${data.itens.length} itens prontos para publicação.\n${new Set(data.itens.map(i => i.categoria)).size} categorias.`);
}

function publicarNoGitHub() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('GH_OWNER');
  const repo = props.getProperty('GH_REPO');
  const token = props.getProperty('GH_TOKEN');
  if (!owner || !repo || !token) throw new Error('Execute primeiro HIGH • Mercado Negro > Configurar GitHub.');

  const catalogo = montarCatalogo_();
  const content = JSON.stringify(catalogo, null, 2);
  const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${HIGH_SITE.githubPath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  let sha = null;
  const get = UrlFetchApp.fetch(`${api}?ref=${encodeURIComponent(HIGH_SITE.branch)}`, {method:'get', headers, muteHttpExceptions:true});
  if (get.getResponseCode() === 200) sha = JSON.parse(get.getContentText()).sha;
  else if (get.getResponseCode() !== 404) throw new Error(`GitHub GET ${get.getResponseCode()}: ${get.getContentText()}`);

  const payload = {
    message: `Atualiza Mercado Negro • ${Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}`,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: HIGH_SITE.branch
  };
  if (sha) payload.sha = sha;

  const put = UrlFetchApp.fetch(api, {method:'put', headers, contentType:'application/json', payload:JSON.stringify(payload), muteHttpExceptions:true});
  if (![200,201].includes(put.getResponseCode())) throw new Error(`GitHub PUT ${put.getResponseCode()}: ${put.getContentText()}`);
  ui.alert(`Publicado com sucesso.\n\n${catalogo.itens.length} itens enviados para ${HIGH_SITE.githubPath}.\nO GitHub Pages atualiza após o novo commit ser publicado.`);
}

function montarCatalogo_() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(HIGH_SITE.sheetName);
  if (!sh) throw new Error(`Aba não encontrada: ${HIGH_SITE.sheetName}`);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) throw new Error('A tabela está vazia.');

  const headers = values[0].map(normalizar_);
  const idx = nome => headers.indexOf(normalizar_(nome));
  const required = ['CATEGORIA','ITEM','VALOR PARCERIA','VALOR PISTA'];
  const missing = required.filter(h => idx(h) < 0);
  if (missing.length) throw new Error(`Cabeçalhos obrigatórios ausentes: ${missing.join(', ')}`);

  const itens = values.slice(1).map((r, n) => {
    const categoria = String(r[idx('CATEGORIA')] || '').trim();
    const item = String(r[idx('ITEM')] || '').trim();
    if (!categoria || !item) return null;
    const status = idx('STATUS') >= 0 ? String(r[idx('STATUS')] || 'ativo').trim().toLowerCase() : 'ativo';
    const destaqueRaw = idx('DESTAQUE') >= 0 ? r[idx('DESTAQUE')] : false;
    const observacao = idx('OBSERVAÇÃO') >= 0 ? String(r[idx('OBSERVAÇÃO')] || '').trim() : '';
    const ordem = idx('ORDEM') >= 0 ? Number(r[idx('ORDEM')] || n + 1) : n + 1;
    return {
      categoria,
      item,
      parceria: numero_(r[idx('VALOR PARCERIA')]),
      pista: numero_(r[idx('VALOR PISTA')]),
      status: status || 'ativo',
      destaque: /^(sim|s|true|1|x)$/i.test(String(destaqueRaw).trim()) || destaqueRaw === true,
      observacao,
      ordem
    };
  }).filter(Boolean).sort((a,b) => a.categoria.localeCompare(b.categoria,'pt-BR') || a.ordem-b.ordem || a.item.localeCompare(b.item,'pt-BR'));

  const now = new Date();
  return {
    meta: {
      titulo: 'Mercado Negro',
      subtitulo: 'High Roleplay',
      atualizado_em: Utilities.formatDate(now, Session.getScriptTimeZone() || 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX"),
      moeda: 'BRL',
      aviso: 'Preços referentes exclusivamente à economia fictícia do High Roleplay / FiveM.'
    },
    itens,
    regras: {
      lavagem: [
        {titulo:'Secagem de dinheiro limpo', texto:'30% da máquina | 20% da lavagem | 50% do cliente'},
        {titulo:'Secagem de dinheiro sujo', texto:'15% da máquina | 10% da lavagem | 75% do cliente'}
      ]
    }
  };
}

function normalizar_(v) {
  return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
}

function numero_(v) {
  if (typeof v === 'number') return v;
  const s = String(v || '').replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Valor monetário inválido: ${v}`);
  return n;
}
