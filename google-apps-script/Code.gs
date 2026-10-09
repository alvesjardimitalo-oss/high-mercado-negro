/**
 * HIGH ROLEPLAY — Mercado Negro
 * Publica a aba "Tabela Mercado Negro" no arquivo data/catalogo.json do GitHub.
 *
 * Cabeçalhos obrigatórios:
 * CATEGORIA | ITEM | VALOR PARCERIA | VALOR PISTA
 *
 * Opcionais:
 * STATUS | DESTAQUE | OBSERVAÇÃO | ORDEM | IMAGEM
 *
 * IMAGEM = nome do arquivo em assets/itens (ex.: ak102.png).
 * Se a coluna não existir ou a célula estiver vazia, o script mantém a imagem
 * que o item já tem no site publicado — assim nenhuma imagem some ao publicar.
 *
 * Regras de lavagem/secagem:
 * Se existir a aba "Regras Lavagem" (GRUPO | TIPO | TITULO | MAQUINA | LAVAGEM | CLIENTE,
 * opcionais ATIVO | IMAGEM), ela é usada. Senão, o script mantém as regras já publicadas.
 */
const HIGH_SITE = {
  sheetName: 'Tabela Mercado Negro',
  rulesSheetName: 'Regras Lavagem',
  githubPath: 'data/catalogo.json',
  branch: 'main'
};

// Usado só se não houver aba de regras nem regras já publicadas no site.
const REGRAS_PADRAO = [
  {grupo:'LAVAGEM', tipo:'DINHEIRO SUJO', titulo:'Lavagem de dinheiro sujo', maquina:10, lavagem:20, cliente:70, ativo:true, imagem:'dirtydollar.png'},
  {grupo:'SECAGEM', tipo:'DINHEIRO LIMPO MOLHADO', titulo:'Secagem de dinheiro limpo molhado', maquina:30, lavagem:20, cliente:50, ativo:true, imagem:'dollar.png'},
  {grupo:'SECAGEM', tipo:'DINHEIRO SUJO MOLHADO', titulo:'Secagem de dinheiro sujo molhado', maquina:15, lavagem:10, cliente:75, ativo:true, imagem:'dirtywetdollar.png'}
];

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
  let anterior = null;
  try { anterior = lerPublicado_().catalogo; } catch (e) { /* sem GitHub configurado: valida só a planilha */ }
  const data = montarCatalogo_(anterior);
  const semImagem = data.itens.filter(i => !i.imagem).map(i => `• ${i.categoria} — ${i.item}`);
  let msg = `Tabela válida.\n\n${data.itens.length} itens prontos para publicação.\n${new Set(data.itens.map(i => i.categoria)).size} categorias.\n${data.regras.lavagem.length} regras de lavagem/secagem.`;
  if (semImagem.length) msg += `\n\nItens sem imagem (${semImagem.length}) — preencha a coluna IMAGEM:\n${semImagem.slice(0, 15).join('\n')}${semImagem.length > 15 ? '\n…' : ''}`;
  if (!anterior) msg += '\n\n(Aviso: não foi possível ler o site publicado; imagens/regras atuais não foram consideradas na validação.)';
  SpreadsheetApp.getUi().alert(msg);
}

function publicarNoGitHub() {
  const ui = SpreadsheetApp.getUi();
  const {api, headers, sha, catalogo: anterior} = lerPublicado_();

  const catalogo = montarCatalogo_(anterior);
  const content = JSON.stringify(catalogo, null, 2);
  const payload = {
    message: `Atualiza Mercado Negro • ${Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm')}`,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: HIGH_SITE.branch
  };
  if (sha) payload.sha = sha;

  const put = UrlFetchApp.fetch(api, {method:'put', headers, contentType:'application/json', payload:JSON.stringify(payload), muteHttpExceptions:true});
  if (![200,201].includes(put.getResponseCode())) throw new Error(`GitHub PUT ${put.getResponseCode()}: ${put.getContentText()}`);
  const semImagem = catalogo.itens.filter(i => !i.imagem).length;
  ui.alert(`Publicado com sucesso.\n\n${catalogo.itens.length} itens enviados para ${HIGH_SITE.githubPath}.${semImagem ? `\n${semImagem} item(ns) sem imagem.` : ''}\nO GitHub Pages atualiza após o novo commit ser publicado.`);
}

/** Lê o catalogo.json publicado no GitHub (sha + conteúdo). */
function lerPublicado_() {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('GH_OWNER');
  const repo = props.getProperty('GH_REPO');
  const token = props.getProperty('GH_TOKEN');
  if (!owner || !repo || !token) throw new Error('Execute primeiro HIGH • Mercado Negro > Configurar GitHub.');

  const api = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${HIGH_SITE.githubPath}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  const get = UrlFetchApp.fetch(`${api}?ref=${encodeURIComponent(HIGH_SITE.branch)}`, {method:'get', headers, muteHttpExceptions:true});
  if (get.getResponseCode() === 404) return {api, headers, sha: null, catalogo: null};
  if (get.getResponseCode() !== 200) throw new Error(`GitHub GET ${get.getResponseCode()}: ${get.getContentText()}`);

  const file = JSON.parse(get.getContentText());
  let catalogo = null;
  try {
    if (file.content) {
      const texto = Utilities.newBlob(Utilities.base64Decode(file.content.replace(/\n/g, ''))).getDataAsString('UTF-8');
      catalogo = JSON.parse(texto);
    }
  } catch (e) { catalogo = null; }
  return {api, headers, sha: file.sha, catalogo};
}

function montarCatalogo_(anterior) {
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

  // Imagens já publicadas: por categoria+item e, como reserva, só pelo item.
  const imgPorChave = {}, imgPorItem = {};
  ((anterior && anterior.itens) || []).forEach(i => {
    if (!i || !i.imagem) return;
    imgPorChave[`${normalizar_(i.categoria)}|${normalizar_(i.item)}`] = i.imagem;
    if (!imgPorItem[normalizar_(i.item)]) imgPorItem[normalizar_(i.item)] = i.imagem;
  });

  const itens = values.slice(1).map((r, n) => {
    const categoria = String(r[idx('CATEGORIA')] || '').trim();
    const item = String(r[idx('ITEM')] || '').trim();
    if (!categoria || !item) return null;
    const status = idx('STATUS') >= 0 ? String(r[idx('STATUS')] || 'ativo').trim().toLowerCase() : 'ativo';
    const destaqueRaw = idx('DESTAQUE') >= 0 ? r[idx('DESTAQUE')] : false;
    const observacao = idx('OBSERVAÇÃO') >= 0 ? String(r[idx('OBSERVAÇÃO')] || '').trim() : '';
    const ordem = idx('ORDEM') >= 0 ? Number(r[idx('ORDEM')] || n + 1) : n + 1;
    const imagemCelula = idx('IMAGEM') >= 0 ? String(r[idx('IMAGEM')] || '').trim() : '';
    const imagem = imagemCelula
      || imgPorChave[`${normalizar_(categoria)}|${normalizar_(item)}`]
      || imgPorItem[normalizar_(item)]
      || '';
    return {
      categoria,
      item,
      parceria: numero_(r[idx('VALOR PARCERIA')]),
      pista: numero_(r[idx('VALOR PISTA')]),
      status: status || 'ativo',
      destaque: /^(sim|s|true|1|x)$/i.test(String(destaqueRaw).trim()) || destaqueRaw === true,
      observacao,
      ordem,
      imagem
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
      lavagem: montarRegras_(anterior)
    }
  };
}

/** Regras: aba "Regras Lavagem" > regras já publicadas > REGRAS_PADRAO. */
function montarRegras_(anterior) {
  const sh = SpreadsheetApp.getActive().getSheetByName(HIGH_SITE.rulesSheetName);
  if (sh) {
    const values = sh.getDataRange().getValues();
    const headers = (values[0] || []).map(normalizar_);
    const idx = nome => headers.indexOf(normalizar_(nome));
    const req = ['GRUPO','TIPO','TITULO','MAQUINA','LAVAGEM','CLIENTE'];
    const faltando = req.filter(h => idx(h) < 0);
    if (faltando.length) throw new Error(`Aba "${HIGH_SITE.rulesSheetName}": cabeçalhos ausentes: ${faltando.join(', ')}`);
    const regras = values.slice(1).filter(r => String(r[idx('TITULO')] || '').trim()).map(r => ({
      grupo: String(r[idx('GRUPO')] || '').trim().toUpperCase(),
      tipo: String(r[idx('TIPO')] || '').trim().toUpperCase(),
      titulo: String(r[idx('TITULO')] || '').trim(),
      maquina: percentual_(r[idx('MAQUINA')]),
      lavagem: percentual_(r[idx('LAVAGEM')]),
      cliente: percentual_(r[idx('CLIENTE')]),
      ativo: idx('ATIVO') >= 0 ? !/^(nao|não|n|false|0)$/i.test(String(r[idx('ATIVO')]).trim()) : true,
      imagem: idx('IMAGEM') >= 0 ? String(r[idx('IMAGEM')] || '').trim() : ''
    }));
    if (regras.length) return regras.map(comTexto_);
  }
  const publicadas = anterior && anterior.regras && anterior.regras.lavagem;
  if (Array.isArray(publicadas) && publicadas.length) return publicadas;
  return REGRAS_PADRAO.map(comTexto_);
}

function comTexto_(r) {
  return Object.assign({}, r, {texto: `${r.maquina}% da máquina | ${r.lavagem}% da lavagem | ${r.cliente}% do cliente`});
}

function percentual_(v) {
  if (typeof v === 'number') return v > 0 && v <= 1 ? Math.round(v * 100) : v; // aceita 0,3 formatado como 30%
  return numero_(String(v || '').replace('%', ''));
}

function normalizar_(v) {
  return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toUpperCase();
}

function numero_(v) {
  if (typeof v === 'number') return v;
  const s = String(v || '').replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Valor monetário inválido: ${v}`);
  return n;
}
