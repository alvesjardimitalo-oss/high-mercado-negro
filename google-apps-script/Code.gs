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
 * STATUS: ativo | inativo (some do site) | revisar (selo "EM REVISÃO") | indisponivel (selo "INDISPONÍVEL")
 * IMAGEM: nome do arquivo em assets/itens (ex.: ak102.png). Vazia = mantém a imagem já publicada.
 *
 * Aba opcional "Regras Lavagem":
 *   GRUPO | TIPO | TITULO | MAQUINA | LAVAGEM | CLIENTE (opcionais ATIVO | IMAGEM)
 *   Sem a aba, mantém as regras já publicadas.
 *
 * Aba opcional "Config" (coluna A = CHAVE, coluna B = VALOR):
 *   AVISO          → faixa de aviso no topo do site (vazio = sem faixa)
 *   LINK_DENUNCIA  → link para abrir denúncia/ticket (página "Como funciona")
 *   Sem a aba, mantém os valores já publicados.
 *
 * A cada publicação o script compara com o site atual e registra:
 *   - selo ▲ SUBIU / ▼ CAIU / NOVO nos itens que mudaram (some depois de 15 dias)
 *   - histórico de mudanças (página historico.html)
 *   - quem publicou
 *   - (o aviso com imagem no Discord é enviado pelo GitHub — veja .github/workflows/discord-aviso.yml)
 */
const HIGH_SITE = {
  sheetName: 'Tabela Mercado Negro',
  rulesSheetName: 'Regras Lavagem',
  configSheetName: 'Config',
  githubPath: 'data/catalogo.json',
  imagesPath: 'assets/itens',
  branch: 'main',
  historicoMax: 40           // publicações com mudança guardadas no histórico
};

const STATUS_VALIDOS = ['ativo', 'inativo', 'revisar', 'indisponivel'];

// Usado só se não houver aba de regras nem regras já publicadas no site.
const REGRAS_PADRAO = [
  {grupo:'LAVAGEM', tipo:'DINHEIRO SUJO', titulo:'Lavagem de dinheiro sujo', maquina:10, lavagem:20, cliente:70, ativo:true, imagem:'dirtydollar.png'},
  {grupo:'SECAGEM', tipo:'DINHEIRO LIMPO MOLHADO', titulo:'Secagem de dinheiro limpo molhado', maquina:30, lavagem:20, cliente:50, ativo:true, imagem:'dollar.png'},
  {grupo:'SECAGEM', tipo:'DINHEIRO SUJO MOLHADO', titulo:'Secagem de dinheiro sujo molhado', maquina:15, lavagem:10, cliente:75, ativo:true, imagem:'dirtywetdollar.png'}
];

/* ───────────────────────────── MENU ───────────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('HIGH • Mercado Negro')
    .addItem('Configurar GitHub', 'configurarGitHub')
    .addItem('Definir meu nome', 'definirMeuNome')
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

function definirMeuNome() {
  const ui = SpreadsheetApp.getUi();
  const atual = PropertiesService.getUserProperties().getProperty('HMN_NOME') || '';
  const r = ui.prompt('Seu nome', `Nome que fica registrado nas publicações (ex.: Ítalo • Auxiliar Ilegal).\nAtual: ${atual || '(não definido)'}`, ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const nome = r.getResponseText().trim();
  if (!nome) return;
  PropertiesService.getUserProperties().setProperty('HMN_NOME', nome);
  ui.alert(`Nome salvo: ${nome}`);
}

/* ─────────────────────────── AÇÕES ─────────────────────────── */

function validarTabela() {
  let pub = null, imagens = null;
  try { pub = lerPublicado_(); imagens = listarImagens_(pub); } catch (e) { /* sem GitHub: valida só a planilha */ }
  const res = montarCatalogo_(pub && pub.catalogo, {imagens, por: nomePublicador_(false)});
  const data = res.catalogo;
  let msg = `Tabela válida.\n\n${data.itens.length} itens • ${new Set(data.itens.map(i => i.categoria)).size} categorias • ${data.regras.lavagem.length} regras de lavagem.`;
  msg += `\n\nMudanças em relação ao site: ${res.mudancas.length ? resumoMudancas_(res.mudancas, 12) : 'nenhuma.'}`;
  msg += res.avisos.length ? `\n\n⚠ AVISOS (${res.avisos.length}):\n${res.avisos.slice(0, 20).join('\n')}${res.avisos.length > 20 ? '\n…' : ''}` : '\n\n✓ Nenhum aviso.';
  if (!pub) msg += '\n\n(Não foi possível ler o site publicado; variações e imagens não foram conferidas.)';
  SpreadsheetApp.getUi().alert(msg);
}

function publicarNoGitHub() {
  const ui = SpreadsheetApp.getUi();
  const por = nomePublicador_(true);
  if (!por) return;

  const pub = lerPublicado_();
  let imagens = null;
  try { imagens = listarImagens_(pub); } catch (e) { imagens = null; }
  const res = montarCatalogo_(pub.catalogo, {imagens, por});

  if (res.avisos.length) {
    const ok = ui.alert('Avisos encontrados',
      `${res.avisos.slice(0, 15).join('\n')}${res.avisos.length > 15 ? '\n…' : ''}\n\nPublicar mesmo assim?`, ui.ButtonSet.YES_NO);
    if (ok !== ui.Button.YES) return;
  }

  // Publica as ações antes do catálogo para evitar anunciar sucesso parcial.
  publicarAcoesBlipadas_(pub);

  const content = JSON.stringify(res.catalogo, null, 2);
  const payload = {
    message: `Atualiza Mercado Negro • ${agora_('dd/MM/yyyy HH:mm')} • por ${por}${res.mudancas.length ? ` • ${res.mudancas.length} mudança(s)` : ''}`,
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: HIGH_SITE.branch
  };
  if (pub.sha) payload.sha = pub.sha;

  const put = UrlFetchApp.fetch(pub.api, {method:'put', headers: pub.headers, contentType:'application/json', payload:JSON.stringify(payload), muteHttpExceptions:true});
  if (![200,201].includes(put.getResponseCode())) throw new Error(`GitHub PUT ${put.getResponseCode()}: ${put.getContentText()}`);

  ui.alert(`Publicado com sucesso.\n\n${res.catalogo.itens.length} itens enviados.\n${res.mudancas.length ? res.mudancas.length + ' mudança(s) registrada(s) no histórico.\nO aviso com imagem será postado no Discord pelo GitHub em 1–2 minutos.' : 'Nenhuma mudança de preço (sem aviso no Discord).'}\n\nO site atualiza em 1–2 minutos.`);
}

/* ─────────────────────────── GITHUB ─────────────────────────── */

function credenciais_() {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('GH_OWNER');
  const repo = props.getProperty('GH_REPO');
  const token = props.getProperty('GH_TOKEN');
  if (!owner || !repo || !token) throw new Error('Execute primeiro HIGH • Mercado Negro > Configurar GitHub.');
  return {owner, repo, headers: {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  }};
}

/** Lê o catalogo.json publicado no GitHub (sha + conteúdo). */
function lerPublicado_() {
  const {owner, repo, headers} = credenciais_();
  const base = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/`;
  const api = base + HIGH_SITE.githubPath;
  const get = UrlFetchApp.fetch(`${api}?ref=${encodeURIComponent(HIGH_SITE.branch)}`, {method:'get', headers, muteHttpExceptions:true});
  if (get.getResponseCode() === 404) return {api, base, headers, sha: null, catalogo: null};
  if (get.getResponseCode() !== 200) throw new Error(`GitHub GET ${get.getResponseCode()}: ${get.getContentText()}`);

  const file = JSON.parse(get.getContentText());
  let catalogo = null;
  try {
    let b64 = file.content;
    if (!b64 && file.download_url) {           // arquivo > 1 MB: a API não manda o conteúdo inline
      catalogo = JSON.parse(UrlFetchApp.fetch(file.download_url, {headers}).getContentText());
    } else if (b64) {
      catalogo = JSON.parse(Utilities.newBlob(Utilities.base64Decode(b64.replace(/\n/g, ''))).getDataAsString('UTF-8'));
    }
  } catch (e) { catalogo = null; }
  return {api, base, headers, sha: file.sha, catalogo};
}

/** Lista os arquivos de assets/itens no GitHub (para conferir a coluna IMAGEM). */
function listarImagens_(pub) {
  const r = UrlFetchApp.fetch(`${pub.base}${HIGH_SITE.imagesPath}?ref=${encodeURIComponent(HIGH_SITE.branch)}`, {method:'get', headers: pub.headers, muteHttpExceptions:true});
  if (r.getResponseCode() !== 200) return null;
  return JSON.parse(r.getContentText()).filter(f => f.type === 'file').map(f => f.name);
}

/* ─────────────────────────── CATÁLOGO ─────────────────────────── */

function montarCatalogo_(anterior, opts) {
  opts = opts || {};
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

  const agoraIso = agora_("yyyy-MM-dd'T'HH:mm:ssXXX");
  const anteriores = (anterior && anterior.itens) || [];
  const antPorChave = {}, imgPorItem = {};
  anteriores.forEach(i => {
    if (!i) return;
    antPorChave[chave_(i.categoria, i.item)] = i;
    if (i.imagem && !imgPorItem[normalizar_(i.item)]) imgPorItem[normalizar_(i.item)] = i.imagem;
  });

  const avisos = [];
  const vistos = {};
  const renomes = detectarRenomes_(values.slice(1), idx, anteriores);

  const itens = values.slice(1).map((r, n) => {
    const linha = n + 2;
    const categoria = String(r[idx('CATEGORIA')] || '').trim();
    const item = String(r[idx('ITEM')] || '').trim();
    if (!categoria || !item) return null;

    let status = idx('STATUS') >= 0 ? normalizar_(r[idx('STATUS')] || 'ativo').toLowerCase() : 'ativo';
    if (!status) status = 'ativo';
    if (STATUS_VALIDOS.indexOf(status) < 0) { avisos.push(`• Linha ${linha} (${item}): STATUS "${r[idx('STATUS')]}" desconhecido — tratado como ativo.`); status = 'ativo'; }

    const destaqueRaw = idx('DESTAQUE') >= 0 ? r[idx('DESTAQUE')] : false;
    const observacao = idx('OBSERVAÇÃO') >= 0 ? String(r[idx('OBSERVAÇÃO')] || '').trim() : '';
    const ordem = idx('ORDEM') >= 0 ? Number(r[idx('ORDEM')] || n + 1) : n + 1;
    const parceria = numero_(r[idx('VALOR PARCERIA')], linha);
    const pista = numero_(r[idx('VALOR PISTA')], linha);

    const k = chave_(categoria, item);
    if (vistos[k]) avisos.push(`• Linha ${linha}: "${item}" está duplicado em ${categoria} (já aparece na linha ${vistos[k]}).`);
    vistos[k] = linha;

    const ant = antPorChave[k] || renomes[k];
    const imagemCelula = idx('IMAGEM') >= 0 ? String(r[idx('IMAGEM')] || '').trim() : '';
    const imagem = imagemCelula || (ant && ant.imagem) || imgPorItem[normalizar_(item)] || '';

    if (status !== 'inativo') {
      if (!parceria || !pista) avisos.push(`• Linha ${linha} (${item}): valor de parceria ou pista está zerado/vazio.`);
      if (pista && parceria && pista < parceria) avisos.push(`• Linha ${linha} (${item}): pista (${moeda_(pista)}) está ABAIXO da parceria (${moeda_(parceria)}).`);
      if (!imagem) avisos.push(`• Linha ${linha} (${item}): sem imagem.`);
      else if (opts.imagens && opts.imagens.indexOf(imagem) < 0) avisos.push(`• Linha ${linha} (${item}): imagem "${imagem}" não existe em ${HIGH_SITE.imagesPath} (atenção a maiúsculas/minúsculas).`);
    }

    // Variação de preço (selo SUBIU/CAIU/NOVO no site). Se o preço não mudou, mantém a última variação.
    let variacao = (ant && ant.variacao) || null;
    if (ant) {
      if (Number(ant.parceria) !== parceria || Number(ant.pista) !== pista)
        variacao = {parceria_antes: Number(ant.parceria), pista_antes: Number(ant.pista), em: agoraIso};
    } else if (anterior) {
      variacao = {novo: true, em: agoraIso};
    }

    const out = {categoria, item, parceria, pista, status, destaque: /^(sim|s|true|1|x)$/i.test(String(destaqueRaw).trim()) || destaqueRaw === true, observacao, ordem, imagem};
    if (variacao) out.variacao = variacao;
    return out;
  }).filter(Boolean).sort((a,b) => a.categoria.localeCompare(b.categoria,'pt-BR') || a.ordem-b.ordem || a.item.localeCompare(b.item,'pt-BR'));

  const mudancas = anterior ? calcularMudancas_(anteriores, itens, renomes) : [];

  let historico = (anterior && Array.isArray(anterior.historico)) ? anterior.historico.slice() : [];
  if (mudancas.length) historico.unshift({em: agoraIso, por: opts.por || '', mudancas});
  historico = historico.slice(0, HIGH_SITE.historicoMax);

  const regrasLavagem = montarRegras_(anterior, avisos);
  const config = lerConfig_();
  const metaAnt = (anterior && anterior.meta) || {};

  return {
    avisos,
    mudancas,
    catalogo: {
      meta: {
        titulo: 'Mercado Negro',
        subtitulo: 'High Roleplay',
        atualizado_em: agoraIso,
        publicado_por: opts.por || metaAnt.publicado_por || '',
        moeda: 'BRL',
        aviso: 'Preços referentes exclusivamente à economia fictícia do High Roleplay / FiveM.',
        alerta: config ? (config.AVISO || '') : (metaAnt.alerta || ''),
        link_denuncia: config ? (config.LINK_DENUNCIA || '') : (metaAnt.link_denuncia || '')
      },
      itens,
      regras: {lavagem: regrasLavagem},
      historico
    }
  };
}

/** Compara o site atual com a planilha: preços alterados, itens novos, removidos, renomeados e status. */
function calcularMudancas_(anteriores, atuais, renomes) {
  renomes = renomes || {};
  const visivel = i => i && i.status !== 'inativo';
  const antMap = {}, atuMap = {}, usados = {};
  anteriores.filter(visivel).forEach(i => antMap[chave_(i.categoria, i.item)] = i);
  atuais.filter(visivel).forEach(i => atuMap[chave_(i.categoria, i.item)] = i);
  const out = [];
  Object.keys(atuMap).forEach(k => {
    const n = atuMap[k];
    let a = antMap[k], de = '';
    if (!a && renomes[k] && visivel(renomes[k])) { a = renomes[k]; de = a.item; }
    if (a) usados[chave_(a.categoria, a.item)] = true;
    const extra = de ? {renomeado_de: de} : {};
    if (!a) out.push({tipo:'novo', categoria:n.categoria, item:n.item, parceria:n.parceria, pista:n.pista});
    else if (Number(a.parceria) !== n.parceria || Number(a.pista) !== n.pista)
      out.push(Object.assign({tipo:'alterado', categoria:n.categoria, item:n.item, parceria_antes:Number(a.parceria), pista_antes:Number(a.pista), parceria:n.parceria, pista:n.pista}, extra));
    else if ((a.status || 'ativo') !== n.status)
      out.push(Object.assign({tipo:'status', categoria:n.categoria, item:n.item, status_antes:a.status || 'ativo', status:n.status, parceria:n.parceria, pista:n.pista}, extra));
    else if (de)
      out.push({tipo:'renomeado', categoria:n.categoria, item:n.item, renomeado_de:de, parceria:n.parceria, pista:n.pista});
  });
  Object.keys(antMap).forEach(k => {
    if (!atuMap[k] && !usados[k]) { const a = antMap[k]; out.push({tipo:'removido', categoria:a.categoria, item:a.item, parceria_antes:Number(a.parceria), pista_antes:Number(a.pista)}); }
  });
  return out;
}

/** Item que sumiu e item que apareceu na MESMA categoria com a MESMA imagem = renomeação.
 *  Só vale quando o par é único (evita confundir itens que dividem a mesma imagem). */
function detectarRenomes_(linhas, idx, anteriores) {
  if (idx('IMAGEM') < 0 || !anteriores.length) return {};
  const novasChaves = {}, novos = [];
  linhas.forEach(r => {
    const cat = String(r[idx('CATEGORIA')] || '').trim(), item = String(r[idx('ITEM')] || '').trim();
    if (!cat || !item) return;
    const k = chave_(cat, item);
    novasChaves[k] = true;
    novos.push({k, cat: normalizar_(cat), img: String(r[idx('IMAGEM')] || '').trim()});
  });
  const antChaves = {};
  anteriores.forEach(a => antChaves[chave_(a.categoria, a.item)] = true);
  const orfaos = anteriores.filter(a => !novasChaves[chave_(a.categoria, a.item)] && a.imagem);
  const semPar = novos.filter(n => !antChaves[n.k] && n.img);
  const out = {};
  semPar.forEach(n => {
    const cand = orfaos.filter(a => normalizar_(a.categoria) === n.cat && a.imagem === n.img);
    const concorrentes = semPar.filter(x => x.cat === n.cat && x.img === n.img);
    if (cand.length === 1 && concorrentes.length === 1) out[n.k] = cand[0];
  });
  return out;
}

/** Aba "Config": coluna A = chave, coluna B = valor. Retorna null se a aba não existir. */
function lerConfig_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(HIGH_SITE.configSheetName);
  if (!sh) return null;
  const out = {};
  sh.getDataRange().getValues().forEach(r => {
    const k = normalizar_(r[0]).replace(/\s+/g, '_');
    if (k && k !== 'CHAVE') out[k] = String(r[1] == null ? '' : r[1]).trim();
  });
  return out;
}

/** Regras: aba "Regras Lavagem" > regras já publicadas > REGRAS_PADRAO.
 *  Aceita variações de cabeçalho (ex.: "% MÁQUINA", "MAQUINA (%)", "CLIENTE %", "NOME")
 *  e cabeçalho fora da linha 1. Se não reconhecer a aba, mantém as regras publicadas e avisa. */
function montarRegras_(anterior, avisos) {
  avisos = avisos || [];
  const publicadas = anterior && anterior.regras && anterior.regras.lavagem;
  const reserva = () => (Array.isArray(publicadas) && publicadas.length) ? publicadas : REGRAS_PADRAO.map(comTexto_);
  const sh = SpreadsheetApp.getActive().getSheetByName(HIGH_SITE.rulesSheetName);
  if (!sh) return reserva();

  const values = sh.getDataRange().getValues();
  const limpa = v => normalizar_(v).replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const ALIASES = {
    grupo:   ['GRUPO', 'CATEGORIA', 'SECAO'],
    tipo:    ['TIPO', 'DINHEIRO', 'MODALIDADE'],
    titulo:  ['TITULO', 'NOME', 'DESCRICAO', 'REGRA'],
    maquina: ['MAQUINA', 'MAQ'],
    lavagem: ['LAVAGEM', 'LAVADOR', 'LAVANDERIA', 'SECAGEM'],
    cliente: ['CLIENTE', 'DONO'],
    ativo:   ['ATIVO', 'STATUS'],
    imagem:  ['IMAGEM', 'IMG', 'ICONE']
  };

  // Procura a linha de cabeçalho nas 10 primeiras linhas.
  let hRow = -1, col = {};
  for (let r = 0; r < Math.min(10, values.length) && hRow < 0; r++) {
    const hs = values[r].map(limpa), usadas = {}, achou = {};
    const pega = (campo, exato) => {
      if (achou[campo] !== undefined) return;
      for (const a of ALIASES[campo]) {
        const i = hs.findIndex((h, k) => !usadas[k] && h && (exato ? h === a : (' ' + h + ' ').indexOf(' ' + a + ' ') >= 0));
        if (i >= 0) { achou[campo] = i; usadas[i] = true; return; }
      }
    };
    const campos = Object.keys(ALIASES);
    campos.forEach(c => pega(c, true));   // primeiro nomes exatos
    campos.forEach(c => pega(c, false));  // depois "contém" (ex.: "% MÁQUINA")
    if (achou.maquina !== undefined && achou.cliente !== undefined) { hRow = r; col = achou; }
  }

  if (hRow < 0 || col.lavagem === undefined) {
    avisos.push(`• Aba "${HIGH_SITE.rulesSheetName}": não encontrei as colunas de MÁQUINA / LAVAGEM / CLIENTE. Mantidas as regras que já estão no site.`);
    return reserva();
  }

  const txt = (r, c) => col[c] === undefined ? '' : String(r[col[c]] == null ? '' : r[col[c]]).trim();
  const regras = [];
  values.slice(hRow + 1).forEach((r, n) => {
    const grupo = txt(r, 'grupo').toUpperCase(), tipo = txt(r, 'tipo').toUpperCase();
    let titulo = txt(r, 'titulo');
    if (!titulo && !tipo && !grupo) return;            // linha vazia
    // Linhas sem nenhuma porcentagem são notas/rodapé da aba (ex.: "Fonte…", "Referência…"): ignora.
    const semPct = ['maquina', 'lavagem', 'cliente'].every(c => String(r[col[c]] == null ? '' : r[col[c]]).trim() === '' || Number(r[col[c]]) === 0);
    if (semPct) return;
    if (!titulo) titulo = [grupo, tipo].filter(Boolean).join(' de ').toLowerCase().replace(/^./, c => c.toUpperCase());
    try {
      const st = txt(r, 'ativo');
      const regra = {
        grupo, tipo, titulo,
        maquina: percentual_(r[col.maquina]),
        lavagem: percentual_(r[col.lavagem]),
        cliente: percentual_(r[col.cliente]),
        ativo: !/^(nao|não|n|false|0|inativo)$/i.test(st),
        imagem: txt(r, 'imagem')
      };
      if (regra.maquina + regra.lavagem + regra.cliente !== 100)
        avisos.push(`• Regras Lavagem, linha ${hRow + n + 2} (${titulo}): percentuais somam ${regra.maquina + regra.lavagem + regra.cliente}% (deveria ser 100%).`);
      regras.push(regra);
    } catch (e) {
      avisos.push(`• Regras Lavagem, linha ${hRow + n + 2}: percentual inválido — linha ignorada.`);
    }
  });

  // Imagem vazia na aba: reaproveita a imagem já publicada para a mesma regra.
  (publicadas || []).forEach(p => regras.forEach(r => {
    if (!r.imagem && p.imagem && normalizar_(p.titulo) === normalizar_(r.titulo)) r.imagem = p.imagem;
  }));

  return regras.length ? regras.map(comTexto_) : reserva();
}

/* ─────────────────────────── RESUMO DAS MUDANÇAS ─────────────────────────── */

function linhaMudanca_(m, semCategoria) {
  const cat = (semCategoria ? '' : ` (${m.categoria})`) + (m.renomeado_de ? ` _(antes: ${m.renomeado_de})_` : '');
  if (m.tipo === 'renomeado') return `✏️ **${m.item}**${cat} — só mudou o nome`;
  if (m.tipo === 'novo') return `🆕 **${m.item}**${cat} — Parceria ${moeda_(m.parceria)} • Pista ${moeda_(m.pista)}`;
  if (m.tipo === 'removido') return `🗑️ ~~${m.item}~~${cat} saiu da tabela`;
  if (m.tipo === 'status') {
    if (m.status === 'indisponivel') return `⛔ **${m.item}**${cat} está INDISPONÍVEL no momento`;
    if (m.status === 'revisar') return `🔎 **${m.item}**${cat} está EM REVISÃO — o valor pode mudar`;
    return `✅ **${m.item}**${cat} voltou a ficar disponível — Parceria ${moeda_(m.parceria)} • Pista ${moeda_(m.pista)}`;
  }
  const seta = (m.pista - m.pista_antes || m.parceria - m.parceria_antes) > 0 ? '🔺' : '🔻';
  const partes = [];
  if (m.parceria !== m.parceria_antes) partes.push(`Parceria ${moeda_(m.parceria_antes)} → **${moeda_(m.parceria)}**`);
  else partes.push(`Parceria ${moeda_(m.parceria)}`);
  if (m.pista !== m.pista_antes) partes.push(`Pista ${moeda_(m.pista_antes)} → **${moeda_(m.pista)}**`);
  else partes.push(`Pista ${moeda_(m.pista)}`);
  return `${seta} **${m.item}**${cat} — ${partes.join(' • ')}`;
}

function resumoMudancas_(mudancas, max) {
  const n = t => mudancas.filter(m => m.tipo === t).length;
  const cab = `${n('alterado')} preço(s) alterado(s), ${n('novo')} item(ns) novo(s), ${n('removido')} removido(s), ${n('renomeado')} renomeado(s), ${n('status')} mudança(s) de status`;
  const lista = mudancas.slice(0, max).map(m => '  ' + linhaMudanca_(m).replace(/\*\*|~~/g, ''));
  return `${cab}\n${lista.join('\n')}${mudancas.length > max ? '\n  …' : ''}`;
}

/* ─────────────────────────── UTILITÁRIOS ─────────────────────────── */

function nomePublicador_(perguntar) {
  const up = PropertiesService.getUserProperties();
  let nome = up.getProperty('HMN_NOME');
  if (!nome && perguntar) {
    const ui = SpreadsheetApp.getUi();
    const r = ui.prompt('Seu nome', 'Primeira publicação neste usuário: qual nome deve ficar registrado?\n(ex.: Ítalo • Auxiliar Ilegal — dá para trocar depois em "Definir meu nome")', ui.ButtonSet.OK_CANCEL);
    if (r.getSelectedButton() !== ui.Button.OK || !r.getResponseText().trim()) return '';
    nome = r.getResponseText().trim();
    up.setProperty('HMN_NOME', nome);
  }
  return nome || '';
}

function comTexto_(r) {
  return Object.assign({}, r, {texto: `${r.maquina}% da máquina | ${r.lavagem}% da lavagem | ${r.cliente}% do cliente`});
}

function percentual_(v) {
  if (typeof v === 'number') return v > 0 && v <= 1 ? Math.round(v * 100) : v; // aceita 0,3 formatado como 30%
  return numero_(String(v || '').replace('%', ''));
}

function chave_(categoria, item) {
  return `${normalizar_(categoria)}|${normalizar_(item)}`;
}

function agora_(fmt) {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'America/Sao_Paulo', fmt);
}

function moeda_(n) {
  return 'R$ ' + Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function normalizar_(v) {
  return String(v || '').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toUpperCase();
}

function numero_(v, linha) {
  if (typeof v === 'number') return v;
  const s = String(v || '').replace(/R\$/gi,'').replace(/\s/g,'').replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'');
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Valor monetário inválido${linha ? ` na linha ${linha}` : ''}: ${v}`);
  return n;
}

/* ───────────────────── AÇÕES BLIPADAS ─────────────────────
 * Aba: AÇÕES BLIPADAS. Publica em data/acoes-blipadas.json
 * Mantém a publicação do catálogo original inalterada.
 * Localizações vazias não são inventadas.
 */
function publicarAcoesBlipadas_(pub) {
  const sh = SpreadsheetApp.getActive().getSheetByName('AÇÕES BLIPADAS');
  if (!sh) return; // Compatível com instalações antigas sem a nova aba.
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return;
  const headers = values[0].map(normalizar_);
  const col = nome => headers.indexOf(normalizar_(nome));
  const txt = (r, nome) => col(nome) < 0 ? '' : String(r[col(nome)] || '').trim();
  const num = (r, nome) => col(nome) < 0 ? 0 : numero_(r[col(nome)]);
  const required = ['AÇÃO','PRÊMIO MÍNIMO (SUJO)','PRÊMIO MÁXIMO (SUJO)','CUSTO TOTAL'];
  const missing = required.filter(x => col(x) < 0);
  if (missing.length) throw new Error('AÇÕES BLIPADAS: cabeçalhos ausentes: ' + missing.join(', '));
  const acoes = values.slice(1).filter(r => txt(r, 'AÇÃO')).map(r => {
    const itens = [];
    for (let n = 1; n <= 4; n++) {
      const nome = txt(r, 'ITEM ' + n);
      const quantidade = num(r, 'QTD ' + n);
      if (nome && quantidade > 0) itens.push({nome, quantidade});
    }
    return {
      nome: txt(r, 'AÇÃO'),
      localizacao: txt(r, 'LOCALIZAÇÃO'),
      status: txt(r, 'STATUS') || 'ativo',
      premio_min: num(r, 'PRÊMIO MÍNIMO (SUJO)'),
      premio_max: num(r, 'PRÊMIO MÁXIMO (SUJO)'),
      custo: num(r, 'CUSTO TOTAL'),
      buff: num(r, 'BUFF'),
      nerf: num(r, 'NERF'),
      itens,
      observacao: txt(r, 'OBSERVAÇÃO'),
      imagem: txt(r, 'IMAGEM')
    };
  });
  // Regras oficiais da Ammu-Nation: opções habilitadas no painel da cidade.
  acoes.filter(a => String(a.nome).trim().toUpperCase() === 'AMMUNATION').forEach(a => {
    a.policiais_minimos = 3;
    a.regras_confronto = [{invasores:2,policiais:3,refens:0},{invasores:3,policiais:4,refens:0}];
  });
  // Antena PISTOLA: configurações habilitadas no painel da cidade.
  acoes.filter(a => String(a.nome).trim().toUpperCase() === 'ANTENA PISTOLA').forEach(a => {
    a.policiais_minimos = 2;
    a.regras_confronto = [{invasores:2,policiais:2,refens:0},{invasores:3,policiais:3,refens:0},{invasores:4,policiais:4,refens:0}];
    a.cooldown_segundos = 1200;
    a.tempo_maximo_minutos = 15;
  });
  // Assalto a Paleto: configuração oficial apresentada no painel.
  acoes.filter(a => String(a.nome).trim().toUpperCase() === 'ASSALTO A PALETO').forEach(a => {
    a.policiais_minimos = 17;
    a.regras_confronto = [{invasores:15,policiais:17,refens:0}];
    a.pendrive_exigido = 'safependrive';
    a.cooldown_segundos = 5000;
    a.tempo_maximo_minutos = 30;
  });
  // Coordenadas em aba própria: múltiplos locais por modalidade.
  const locSheet = SpreadsheetApp.getActive().getSheetByName('LOCAIS DE ROUBO');
  const locais = locSheet ? locSheet.getDataRange().getValues().slice(1).filter(r => r[0]).map(r => ({nome:String(r[0]).trim(),x:Number(r[1]),y:Number(r[2]),z:Number(r[3]),descricao:String(r[5]||'').trim(),imagem:String(r[6]||'').trim()})) : [];
  const normal = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const alias = {'AÇOUGUE E GALINHEIRO':'Galinheiro','MACDONALD E FAST FOOD':'Fast Food','ANTENA PISTOLA':'Antena','ASSALTO A PALETO':'Assalto a Paleto 2','FLECCA':'Fleeca'};
  acoes.forEach(a => {
    const chave = normal(alias[a.nome] || a.nome);
    a.locais = locais.filter(l => normal(l.nome) === chave || (normal(a.nome) === 'ACOUGUEEGALINHEIRO' && normal(l.nome) === 'ACOUGUE')).map(l => {
      const item = {nome:l.nome,x:l.x,y:l.y,z:l.z,descricao:l.descricao,imagem:l.imagem};
      if (normal(l.nome) === 'ACOUGUE' && normal(a.nome) === 'ACOUGUEEGALINHEIRO') {
        item.policiais_minimos = 8;
        item.regras_confronto = [{invasores:5,policiais:8,refens:4},{invasores:6,policiais:9,refens:4},{invasores:7,policiais:10,refens:4},{invasores:8,policiais:11,refens:4}];
      }
      return item;
    });
  });
  const path = 'data/acoes-blipadas.json';
  const api = pub.base + path;
  const get = UrlFetchApp.fetch(api + '?ref=' + encodeURIComponent(HIGH_SITE.branch),
    {headers:pub.headers, muteHttpExceptions:true});
  if (get.getResponseCode() !== 200 && get.getResponseCode() !== 404)
    throw new Error('Falha ao consultar ações no GitHub: ' + get.getResponseCode());
  const payload = {
    message:'Atualiza ações blipadas pela planilha',
    branch:HIGH_SITE.branch,
    content:Utilities.base64Encode(JSON.stringify({
      meta:{titulo:'Ações Blipadas',fonte:'Planilha Mercado Negro',taxa_lavagem:0.30},
      acoes
    },null,2), Utilities.Charset.UTF_8)
  };
  if (get.getResponseCode() === 200) payload.sha = JSON.parse(get.getContentText()).sha;
  const put = UrlFetchApp.fetch(api, {method:'put',headers:pub.headers,contentType:'application/json',
    payload:JSON.stringify(payload),muteHttpExceptions:true});
  if (![200,201].includes(put.getResponseCode()))
    throw new Error('Falha ao publicar ações: GitHub ' + put.getResponseCode() + ': ' + put.getContentText());
}
