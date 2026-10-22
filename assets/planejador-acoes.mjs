import {norm,initialTeam,teamRules,proposal,costBreakdown} from './planejador-core.mjs';

const $=id=>document.getElementById(id);
const money=n=>n===null||n===undefined||!Number.isFinite(+n)?'PENDENTE':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
const pct=n=>n===null||n===undefined||!Number.isFinite(+n)?'—':new Intl.NumberFormat('pt-BR',{style:'percent',maximumFractionDigits:1}).format(n);
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const imgFor=file=>/^[^/\\]+\.(?:webp|png|jpe?g)$/i.test(String(file||''))?'assets/itens/'+encodeURIComponent(file):'';
let catalog={itens:[]},data={acoes:[],meta:{}},current=null,options={};
const SAVED_KEY='high-mercado-negro-planejamento-v1';
const drafts=(()=>{
 try {const rows=JSON.parse(localStorage.getItem(SAVED_KEY)||'{}');return rows&&typeof rows==='object'?rows:{};}
 catch{return {};}
})();
const settings={mode:'pista',tax:.3,roi:.25,spread:.15};
const formNumber=(id,def)=>{const v=Number($(id).value);return Number.isFinite(v)&&String($(id).value).trim()!==''?v:def;};
const prizePhoto=(a)=>a.locais?.find(l=>l.imagem)?.imagem||a.imagem||'';
const aid=a=>norm(a?.nome);
function notify(msg){const toast=$('toast');toast.textContent=msg;toast.hidden=false;clearTimeout(notify.timeout);notify.timeout=setTimeout(()=>toast.hidden=true,3300)}
function stateOf(a){
 const saved=drafts[aid(a)]||{};
 return {team:Number(saved.team)||initialTeam(a),quantities:{...(saved.quantities||{})},prices:{...(saved.prices||{})},
  proposedDirtyMin:saved.proposedDirtyMin??null,roi:saved.roi??settings.roi,spread:saved.spread??settings.spread,
  mode:saved.mode||settings.mode,rationale:saved.rationale||''};
}
function saveState(){if(!current)return;drafts[aid(current)]=options;try{localStorage.setItem(SAVED_KEY,JSON.stringify(drafts));notify('Rascunho salvo neste navegador.')}catch{notify('Sem armazenamento local: use Copiar proposta.')}}
function updateDraftFields(){
 $('priceMode').value=options.mode;
 const valid=teamRules(current).map(x=>x.invasores);
 if(!valid.includes(+options.team))options.team=valid.at(-1)||options.team||1;
 $('teamCount').innerHTML=valid.length?valid.map(n=>'<option value="'+n+'">'+n+' invasores</option>').join(''):
  '<option value="'+(+options.team||1)+'">'+(+options.team||1)+' invasores (regra pendente)</option>';
 $('teamCount').value=String(options.team);
 $('roiGoal').value=(Number(options.roi)*100).toFixed(0);
 $('spreadGoal').value=(Number(options.spread)*100).toFixed(0);
 $('customPayout').value=options.proposedDirtyMin===null?'':String(options.proposedDirtyMin);
 $('rationale').value=options.rationale;
}
function selectedPhoto(){
 const locations=current?.locais?.length?current.locais:current?.imagem?[{imagem:current.imagem,nome:current.nome}]:[];
 const photos=$('photos');
 photos.innerHTML=locations.length?locations.map(l=>{
  const src=imgFor(l.imagem);
  if(!src)return '';
  const label=l.descricao||l.nome||current.nome;
  const cds=[l.x,l.y,l.z].every(n=>Number.isFinite(+n))?[l.x,l.y,l.z].join(', '):'';
  return '<figure class="photo"><img loading="lazy" src="'+esc(src)+'" alt="'+esc(label)+'"><figcaption>'+esc(label)+(cds?'<br>'+esc(cds):'')+'</figcaption><a href="'+esc(src)+'" target="_blank" rel="noopener noreferrer" aria-label="Ampliar imagem">↗</a></figure>';
 }).join(''):'<div class="req-note">Fotografia não cadastrada para esta ação. Nenhuma localização foi inventada.</div>';
}
function renderRequirements(){
 const a=current,rules=teamRules(a),rule=rules.find(r=>r.invasores===+options.team);
 const req=[['Invasores',rules.length?rules.map(r=>r.invasores).join(' / '):'A confirmar'],
 ['Policiais mínimos',rule?.policiais||a.policiais_minimos||'A confirmar'],
 ['Reféns',rule?.refens??'A confirmar'],['Pendrive',a.pendrive_exigido||(a.itens||[]).find(i=>norm(i.nome).includes('PENDRIVE'))?.nome||'A confirmar'],
 ['Cooldown',a.cooldown_segundos?Math.round(a.cooldown_segundos/60)+' min':'A confirmar'],
 ['Tempo máximo',a.tempo_maximo_minutos?a.tempo_maximo_minutos+' min':'A confirmar']];
 $('requirements').innerHTML=req.map(([k,v])=>'<div class="requirement">'+esc(k)+': <b>'+esc(v)+'</b></div>').join('')+
 '<div class="req-note">Confirme disponibilidade, fila e blip pelo comando /acoes no jogo. Não há consulta em tempo real.</div>';
}
function renderItemInputs(){
 const kit=costBreakdown(current,catalog,options);
 $('kitRows').innerHTML=kit.lines.map(l=>{
  const p=l.unit===null?'PENDENTE':money(l.unit);
  return '<tr><td class="item-title">'+esc(l.nome)+'<small class="source">'+esc(l.reference)+' • '+esc(l.source)+'</small></td>'+
  '<td><input type="number" min="0" step="1" aria-label="Quantidade de '+esc(l.nome)+'" data-qty="'+l.index+'" value="'+l.quantity+'"></td>'+
  '<td><input class="unit" type="number" min="0" step="1" data-unit="'+l.index+'" aria-label="Preço unitário de '+esc(l.nome)+'" value="'+(l.unit===null?'':l.unit)+'" placeholder="'+esc(p)+'"></td>'+
  '<td>'+money(l.total)+'</td></tr>';
 }).join('');
 $('kitRows').querySelectorAll('[data-qty]').forEach(el=>el.addEventListener('change',()=>{
  options.quantities[el.dataset.qty]=Math.max(0,Number(el.value)||0);renderItemInputs();refreshResults();
 }));
 $('kitRows').querySelectorAll('[data-unit]').forEach(el=>el.addEventListener('change',()=>{
  options.prices[el.dataset.unit]=el.value.trim()===''?null:Math.max(0,Number(el.value)||0);renderItemInputs();refreshResults();
 }));
 updateKitFooter(kit);
}
function updateKitFooter(kit){
 $('kitTotal').textContent=money(kit.cost);
 const txt=kit.missing.length
  ?'Preço não disponível no Mercado Negro: '+kit.missing.join(', ')+'. Custo oficial do kit mantido como referência, sem preço fictício.'
  :options.mode==='pista'&&Math.abs(kit.difference??0)>1
   ?'DIVERGÊNCIA: soma dos itens difere do custo oficial publicado em '+money(kit.difference)+'. Antes de aprovar novo prêmio, confira os valores na planilha.'
   :'Soma dos itens conferida contra o preço '+(options.mode==='pista'?'de pista':'de parceria')+'.';
 $('kitWarning').className='footnote '+(kit.needsReview?'warn':'ok');
 $('kitWarning').textContent=txt;
}
const box=(label,value,detail='',tone='')=>'<div class="metric '+tone+'"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong>'+(detail?'<small class="detail">'+esc(detail)+'</small>':'')+'</div>';
function refreshResults(){
 if(!current)return;
 const p=proposal(current,catalog,{...options,tax:settings.tax});
 $('currentMetrics').innerHTML=[
  box('Prêmio mínimo ATUAL (sujo)',money(p.currentMin),'Buff histórico já incluído'),
  box('Prêmio máximo ATUAL (sujo)',money(p.currentMax),'Buff histórico já incluído'),
  box('Dinheiro limpo mínimo',money(p.currentMin===null?null:p.currentMin*(1-p.tax)),'30% de lavagem'),
  box('Custo do kit simulado',money(p.kit.cost),p.kit.source),
  box('Lucro real mínimo',money(p.realNetMin),'Após lavagem e compra do kit',p.realNetMin<0?'loss':'profit'),
  box('Lucro real máximo',money(p.realNetMax),'Após lavagem e compra do kit',p.realNetMax<0?'loss':'profit'),
  box('Lucro líquido por invasor',money(p.actualNetPerPlayer),p.team+' invasores'),
  box('ROI líquido mínimo',pct(p.actualROI),'Retorno sobre o custo',p.actualROI<0?'loss':'profit')
 ].join('');
 $('proposalMetrics').innerHTML=[
  box('Prêmio mínimo sugerido (sujo)',money(p.suggestedMin),'Valor a pagar antes da lavagem','pred'),
  box('Prêmio máximo sugerido (sujo)',money(p.suggestedMax),'Amplitude selecionada'),
  box('BUFF / NERF frente ao prêmio atual',p.delta===null?'PENDENTE':(p.delta>0?'+':'')+money(p.delta),'Não soma buff anterior',p.delta<0?'loss':p.delta>0?'profit':''),
  box('Lucro mínimo projetado / invasor',money(p.proposedNetPerPlayer),'Após 30% de lavagem e kit',p.proposedNetPerPlayer<0?'loss':'profit')
 ].join('');
 const badge=$('recommendationBadge');badge.textContent=p.decision;badge.style.color=p.decision==='REVISAR INSUMOS'?'#ffd49b':p.decision==='NERF'?'#ffa5af':'#c1f0d8';
 $('selectedSub').textContent='Kit oficial '+money(current.custo)+' · BUFF histórico de '+money(p.alreadyBuffed)+' já incluído nos prêmios atuais';
 const req=teamRules(current).find(x=>x.invasores===p.team);
 $('actionStatusBadge').textContent=current.status==='inativo'?'INATIVA':'ATIVA';
 $('actionStatusBadge').classList.toggle('off',current.status==='inativo');
 updateKitFooter(p.kit);
 if(req!==undefined){const first=$('requirements')?.querySelectorAll('.requirement');if(first?.[1])first[1].innerHTML='Policiais mínimos: <b>'+req.policiais+'</b>';if(first?.[2])first[2].innerHTML='Reféns: <b>'+req.refens+'</b>';}
}
function changeAction(name){
 const hit=data.acoes.find(a=>a.nome===name);if(!hit)return;
 current=hit;options=stateOf(hit);
 $('selectedTitle').textContent=hit.nome;
 selectedPhoto();updateDraftFields();renderRequirements();renderItemInputs();refreshResults();renderActionList();
 const params=new URLSearchParams(location.search);params.set('acao',hit.nome);history.replaceState({},'',location.pathname+'?'+params);
}
function searchQuery(){return norm($('actionSearch').value)}
function filterActions(){
 const q=searchQuery(),status=$('actionStatus').value;
 return data.acoes.filter(a=>{
  if(status==='ativos'&&a.status==='inativo')return false;
  if(status==='revisar'&&!costBreakdown(a,catalog).needsReview)return false;
  return !q||norm([a.nome,...(a.locais||[]).map(l=>l.descricao||l.nome)].join(' ')).includes(q);
 });
}
function renderActionList(){
 const filtered=filterActions();
 $('actionCount').textContent=filtered.length+' AÇÕES';
 $('actionList').innerHTML=filtered.map(a=>{
  const photo=imgFor(prizePhoto(a))||'assets/high_logo.png';
  const selected=current?.nome===a.nome;
  const cost=costBreakdown(a,catalog);
  return '<button class="action-option" role="option" aria-selected="'+selected+'" data-name="'+esc(a.nome)+'"><img loading="lazy" src="'+esc(photo)+'" alt=""><span><strong>'+esc(a.nome)+'</strong><small>'+money(a.premio_min)+' — '+money(a.premio_max)+'</small><span class="mini">'+(a.status==='inativo'?'INATIVA':'ATIVA')+(cost.needsReview?' · REVISAR PREÇO':'')+'</span></span></button>';
 }).join('')||'<p class="req-note">Nenhuma ação para estes filtros.</p>';
 $('actionList').querySelectorAll('[data-name]').forEach(b=>b.addEventListener('click',()=>changeAction(b.dataset.name)));
}
function scaleTeam(){
 const team=Number(options.team);
 (current.itens||[]).forEach((item,i)=>{if(/^(ARMA\s|MUNI[ÇC][ÃA]O|COLETE|PLACA)/i.test(item.nome)){options.quantities[i]=team;}});
 renderItemInputs();refreshResults();notify('Kit ajustado para '+team+' invasores. Confira os requisitos no jogo.');
}
function saveManual(){
 options.mode=$('priceMode').value;
 options.team=Number($('teamCount').value)||1;
 options.roi=Math.max(0,formNumber('roiGoal',25))/100;
 options.spread=Math.max(0,formNumber('spreadGoal',15))/100;
 const raw=$('customPayout').value.trim();
 options.proposedDirtyMin=raw===''?null:Math.max(0,+raw||0);
 options.rationale=$('rationale').value;
}
function reportText(){
 const p=proposal(current,catalog,{...options,tax:settings.tax});
 const lines=[
 'HIGH RP • PLANEJADOR DE AÇÕES • PROPOSTA (NÃO APROVADA)',
 'AÇÃO: '+current.nome,
 'STATUS: '+current.status.toUpperCase(),
 'INVASORES: '+p.team,
 'POLICIAIS / REFÉNS: '+(p.rule?.policiais??'A confirmar')+' / '+(p.rule?.refens??'A confirmar'),
 'ITENS PARA INICIAR:',
 ...p.kit.lines.map(l=>'- '+l.nome+' x'+l.quantity+' · '+money(l.unit)+' = '+money(l.total)),
 'TOTAL INVESTIDO: '+money(p.kit.cost)+' ('+p.kit.source+')',
 'LAVAGEM: '+Math.round(p.tax*100)+'%',
 'PRÊMIO MIN. ATUAL (SUJO): '+money(p.currentMin),
 'PRÊMIO MAX. ATUAL (SUJO): '+money(p.currentMax),
 'LUCRO REAL MIN.: '+money(p.realNetMin),
 'LUCRO REAL POR INVASOR: '+money(p.actualNetPerPlayer),
 'META ROI: '+pct(p.roi),
 'PRÊMIO MÍNIMO SUGERIDO (SUJO): '+money(p.suggestedMin),
 'PRÊMIO MÁXIMO SUGERIDO (SUJO): '+money(p.suggestedMax),
 'AJUSTE PROPOSTO: '+money(p.delta)+' · '+p.decision,
 'BUFF ANTERIOR (JÁ INCLUSO): '+money(p.alreadyBuffed),
 'CONFERÊNCIA DO KIT: '+(p.kit.needsReview?'PENDENTE / DIVERGÊNCIA':'OK'),
 'JUSTIFICATIVA: '+(options.rationale.trim()||'Meta de lucro líquido calculada sobre o kit após a lavagem.'),
 'BASE: Mercado Negro / Ilegal - High Season 2 • Não modifica prêmios existentes.'
 ];
 return lines.join('\n');
}
function proposalCsv(){
 const p=proposal(current,catalog,{...options,tax:settings.tax});
 const row=[current.nome,current.status,options.team,options.mode,p.kit.cost,p.currentMin,p.currentMax,p.realNetMin,p.actualNetPerPlayer,p.roi,p.suggestedMin,p.suggestedMax,p.delta,p.decision,p.kit.needsReview?'REVISAR':'OK',options.rationale];
 const head=['AÇÃO','STATUS','INVASORES','BASE PREÇO','CUSTO KIT','PRÊMIO MÍN ATUAL','PRÊMIO MÁX ATUAL','LUCRO MÍN LÍQUIDO','LUCRO POR INVASOR','META ROI','PRÊMIO MÍN SUGERIDO','PRÊMIO MÁX SUGERIDO','BUFF / NERF','DECISÃO','INSUMOS','JUSTIFICATIVA'];
 return [head,row].map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(';')).join('\r\n');
}
async function copyProposal(){
 const txt=reportText();
 try{await navigator.clipboard.writeText(txt);notify('Proposta copiada. Pronta para registrar no planejamento.')}
 catch{notify('Não foi possível copiar automaticamente. Use Exportar CSV.');}
}
function downloadCsv(){
 const csv='\uFEFF'+proposalCsv(),blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='proposta-'+norm(current.nome).toLowerCase().replace(/[^a-z0-9]+/g,'-')+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function bind(){
 $('actionSearch').addEventListener('input',renderActionList);
 $('actionStatus').addEventListener('change',renderActionList);
 $('priceMode').addEventListener('change',()=>{saveManual();renderItemInputs();refreshResults()});
 $('teamCount').addEventListener('change',()=>{saveManual();renderRequirements();refreshResults()});
 $('roiGoal').addEventListener('input',()=>{saveManual();refreshResults()});
 $('spreadGoal').addEventListener('input',()=>{saveManual();refreshResults()});
 $('customPayout').addEventListener('input',()=>{saveManual();refreshResults()});
 $('rationale').addEventListener('input',saveManual);
 $('scaleTeam').addEventListener('click',scaleTeam);
 $('resetPayout').addEventListener('click',()=>{options.proposedDirtyMin=null;$('customPayout').value='';refreshResults()});
 $('copyProposal').addEventListener('click',copyProposal);
 $('downloadCsv').addEventListener('click',downloadCsv);
 $('saveDraft').addEventListener('click',()=>{saveManual();saveState()});
}
async function init(){
 bind();
 try{
  const [actions,prices]=await Promise.all([
   fetch('data/acoes-blipadas.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Ações HTTP '+r.status);return r.json()}),
   fetch('data/catalogo.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Preços HTTP '+r.status);return r.json()})
  ]);
  data=actions;catalog=prices;
  $('totalActions').textContent=data.acoes.length;
  $('activeActions').textContent=data.acoes.filter(a=>a.status!=='inativo').length;
  $('pendingPrices').textContent=data.acoes.filter(a=>costBreakdown(a,catalog).needsReview).length;
  const requested=new URLSearchParams(location.search).get('acao');
  changeAction(data.acoes.find(a=>a.nome===requested)?.nome||data.acoes.find(a=>a.status!=='inativo')?.nome||data.acoes[0]?.nome);
 }catch(e){
  $('selectedTitle').textContent='Falha ao carregar dados';
  $('selectedSub').textContent=e.message+' · Atualize a página.';
  $('actionList').innerHTML='<div class="req-note">O catálogo oficial não pôde ser carregado.</div>';
 }
}
init();
