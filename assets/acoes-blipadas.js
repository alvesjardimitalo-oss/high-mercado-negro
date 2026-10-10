import { norm, amount, rulesFor, sizeFor, taxFor, economy, entriesFor, matches } from './acoes-core.mjs';
const $ = id => document.getElementById(id);
const escape = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money = n => n === null || n === undefined ? 'A confirmar' : new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(n);
const pct = n => new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(n) + '%';
const range = (low, high) => low === null || high === null ? 'A confirmar' : money(low) + ' — ' + money(high);
const sizes = {todas:'Todas',pequena:'Pequenas',media:'Médias',grande:'Grandes',pendente:'A confirmar'};
const ranges = {pequena:'Até 5 invasores',media:'6 a 9 invasores',grande:'10+ invasores',pendente:'Contingente pendente'};
const descriptions = {pequena:'Equipe enxuta. Preparação na medida.',media:'Reúna a equipe. Organize cada detalhe.',grande:'Grandes equipes. Operações de alto porte.',pendente:'Consulte os dados disponíveis no dossiê.'};
const pics = {'PLACA BALÍSTICA':'ballisticplate.png','COLETE':'ballisticplate.png','MUNIÇÃO PISTOLA (x100)':'caixa_m_pistola.png','MUNIÇÃO SUB (x200)':'caixa_m_smg.png','MUNIÇÃO FUZIL (x250)':'caixa_m_rifle.png','ARMA PISTOLA':'t54.png','ARMA SUB':'uzi.png','ARMA FUZIL':'ak102.png','PENDRIVE 1':'pendrive1.png','PENDRIVE 2':'pendrive2.png','PENDRIVE 3':'pendrive3.png','PENDRIVE 4':'pendrive4.png','PENDRIVE 5':'pendrive5.png'};
const itemName = n => ['colete','placa balistica'].includes(norm(n).trim()) ? 'PLACA BALÍSTICA' : n;
function imageSrc(value) { const v=String(value||'').trim(); return /^https:\/\//i.test(v) ? v : /^[\w.\-]+\.(png|jpe?g|webp)$/i.test(v) ? 'assets/itens/'+encodeURIComponent(v) : ''; }
function photo(e) { return imageSrc(e.l?.imagem || e.a.imagem); }
function picture(e, cls='') {const src=photo(e);return `<img class="${cls}${src?'':' ab-fallback'}" src="${escape(src||'assets/high_logo.png')}" alt="${escape(src?e.title:'High Roleplay — foto do local não cadastrada')}" loading="lazy">`;}
const coords = e => e.l && [e.l.x,e.l.y,e.l.z].every(v=>amount(v)!==null) ? [e.l.x,e.l.y,e.l.z].join(', ') : e.a.localizacao || 'Localização a confirmar';
const weapon = a => (a.itens||[]).find(i=>/^ARMA\s/i.test(i.nome))?.nome.replace(/^ARMA\s+/i,'') || 'A confirmar';
const pendrive = a => a.pendrive_exigido || (a.itens||[]).find(i=>/^PENDRIVE\s*[1-5]$/i.test(i.nome))?.nome || 'A confirmar';
const teams = e => [...new Set(rulesFor(e.a,e.l).map(r=>Number(r.invasores)).filter(n=>n>0))].sort((a,b)=>a-b);
const teamLabel = e => {const t=teams(e);return t.length ? t.join(', ') : 'A confirmar';};
let entries=[], tax=.3, selectedSize='todas', onlyFavorites=false, current=null, compare=new Set(), checklist=new Map();
let favorites=new Set();
try {const saved=JSON.parse(localStorage.getItem('high-actions-favorites')||'[]'); if(Array.isArray(saved)) favorites=new Set(saved.filter(v=>typeof v==='string'));} catch {}
const byId = id => entries.find(e=>e.id===id);
let toastTimer;
function toast(message) { const host=document.querySelector('dialog[open]')||document.body;host.appendChild($('toast'));$('toast').textContent=message;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3500); }
async function copy(text) {
 try {await navigator.clipboard.writeText(text);toast('Copiado! Pronto para compartilhar.');}
 catch {const area=document.createElement('textarea');area.value=text;area.readOnly=true;area.setAttribute('aria-label','Texto para copiar manualmente');area.style.cssText='display:block;width:100%;min-height:100px;margin:12px 0;background:#171020;color:white';(document.querySelector('dialog[open]')||$('catalog')).appendChild(area);area.focus();area.select();toast('Cópia automática indisponível. O texto está selecionado para copiar manualmente.');}
}
function filters() { return {q:$('search').value.trim(), category:$('category').value, weapon:$('weapon').value, team:$('team').value, budget:$('budget').value, size:selectedSize, favorites:onlyFavorites}; }
function scrollCatalog() {$('catalog').scrollIntoView({behavior:'smooth',block:'start'});}
function saveFavorites() {try{localStorage.setItem('high-actions-favorites',JSON.stringify([...favorites]));}catch{toast('Favorito salvo apenas nesta sessão.');}}
function toggleFavorite(id) {favorites.has(id)?favorites.delete(id):favorites.add(id);saveFavorites();draw();if(current?.id===id)updateDossierFavorite();}
function updateDossierFavorite() {const b=$('dossier-favorite');if(b){b.setAttribute('aria-pressed',String(favorites.has(current.id)));b.textContent=favorites.has(current.id)?'★ Favoritado':'☆ Favoritar local';}}
function toggleCompare(id) {if(compare.has(id))compare.delete(id);else if(compare.size<3)compare.add(id);else return toast('Compare até 3 locais por vez. Remova um para adicionar outro.'); draw();}
function drawDirectory() {
 $('size-cards').innerHTML=Object.keys(ranges).map((k,index)=>{
   const group=entries.filter(e=>e.size===k);if(!group.length)return '';
   const cover=group.find(e=>photo(e));
   return `<button class="ab-directory-card" data-size="${k}" aria-pressed="${selectedSize===k}"><div class="ab-directory-art">${cover?picture(cover):''}<span class="ab-directory-number">0${index+1}</span><img class="ab-directory-logo" src="assets/high_logo.png" alt="High Roleplay"></div><div class="ab-directory-body"><span class="ab-eyebrow">${ranges[k]}</span><h3>Operações ${sizes[k].toLowerCase()}</h3><p>${descriptions[k]}</p><div><span>${new Set(group.map(e=>e.a.nome)).size} ações · ${group.length} fichas</span><b aria-hidden="true">↗</b></div></div></button>`;
 }).join('');
}
function card(e) {
 const n=entries.indexOf(e), fav=favorites.has(e.id), checked=compare.has(e.id), t=teams(e);
 return `<article class="ab-card"><div class="ab-card-media">${picture(e,'ab-cover')}<span class="ab-tag">${e.a.status==='indisponivel'?'INDISPONÍVEL · SEM BLIP':escape(ranges[e.size])}</span><button class="ab-star" data-favorite="${n}" aria-label="${fav?'Remover dos favoritos':'Favoritar'}: ${escape(e.title)}" aria-pressed="${fav}">${fav?'★':'☆'}</button></div><div class="ab-card-body"><p class="ab-card-category">${escape(e.a.nome)}</p><h3>${escape(e.title)}</h3><div class="ab-card-spec"><span>♙ ${t.length?t[0]+(t.length>1?'–'+t.at(-1):'')+' invasores':'Contingente a confirmar'}</span><span>${escape(weapon(e.a))}</span></div><div class="ab-card-money"><div><span>INVESTIMENTO DO KIT</span><strong>${money(amount(e.a.custo))}</strong></div></div><div class="ab-card-actions"><button class="ab-btn ab-primary" data-open="${n}">Ver dossiê <span aria-hidden="true">↗</span></button><button class="ab-compare-btn" data-compare="${n}" aria-pressed="${checked}" aria-label="${checked?'Remover da comparação':'Comparar'}: ${escape(e.title)}">${checked?'✓ Comparando':'+ Comparar'}</button></div></div></article>`;
}
function draw() {
 const f=filters(), base=entries.filter(e=>matches(e,{...f,size:'todas'},favorites));
 $('size-tabs').innerHTML=Object.entries(sizes).map(([k,v])=>`<button data-size="${k}" aria-pressed="${selectedSize===k}">${v}<span>${base.filter(e=>k==='todas'||e.size===k).length}</span></button>`).join('');
 document.querySelectorAll('.ab-directory-card').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.size===selectedSize)));
 const shown=base.filter(e=>selectedSize==='todas'||e.size===selectedSize);
 const score=e=>-(amount(e.a.custo)??Infinity);
 const groups=[...new Set(shown.map(e=>e.a.nome))].map(name=>({name,rows:shown.filter(e=>e.a.nome===name)}));
 groups.sort((a,b)=>$('sort').value==='name'?a.name.localeCompare(b.name,'pt-BR'):score(b.rows[0])-score(a.rows[0])||a.name.localeCompare(b.name,'pt-BR'));
 $('actions').innerHTML=groups.map(g=>`<section class="ab-group"><div class="ab-group-head"><h3>${escape(g.name)}</h3><span>${g.rows.length} ${g.rows.length===1?'ficha':'fichas'}</span></div><div class="ab-grid">${g.rows.map(card).join('')}</div></section>`).join('')||`<div class="ab-empty"><span>⌕</span><h3>Nenhuma ação com esses filtros.</h3><p>${onlyFavorites?'Favorite os locais pelo símbolo ☆ ou ajuste os filtros.':'Experimente ampliar o orçamento ou alterar o tamanho da equipe.'}</p><button class="ab-btn" data-reset>Limpar filtros</button></div>`;
 $('counter').textContent=`${groups.length} ações · ${shown.length} fichas de locais`;
 $('favorites').setAttribute('aria-pressed',String(onlyFavorites));
 $('favorites').textContent=(onlyFavorites?'★':'☆')+' Somente favoritos ('+entries.filter(e=>favorites.has(e.id)).length+')';
 $('compare-bar').hidden=!compare.size;$('compare-count').textContent=`${compare.size}/3 locais selecionados`;$('compare-open').disabled=compare.size<2;
}
function reset() {['search','category','weapon','team','budget'].forEach(id=>$(id).value='');$('sort').value='name';selectedSize='todas';onlyFavorites=false;draw();}
function duration(seconds) {if(amount(seconds)===null)return 'A confirmar';const n=Number(seconds);return `${Math.floor(n/60)} min${n%60?' '+n%60+' s':''}`;}
function dossier(e) {
 current=e;const a=e.a, valid=teams(e), rows=rulesFor(a,e.l), preset=valid.includes(Number($('team').value))?Number($('team').value):valid.at(-1);
 const selected=checklist.get(e.id)||new Set();
 $('dossier-content').innerHTML=`<div class="ab-dossier-cover">${picture(e)}<span>${escape(a.nome)}</span></div><div class="ab-dossier-body"><div class="ab-eyebrow">${escape(ranges[e.size])}</div><h2 id="dossier-title">${escape(e.title)}</h2><div class="ab-dossier-actions"><button class="ab-btn" id="dossier-favorite"></button><button class="ab-btn" id="share">Copiar link ↗</button><button class="ab-btn" id="copy-coords">Copiar coordenadas</button></div><p class="ab-coords">${escape(coords(e))}</p><div class="ab-facts"><div><span>PENDRIVE</span><b>${escape(pendrive(a))}</b></div><div><span>ARMAMENTO</span><b>${escape(weapon(a))}</b></div><div><span>POLICIAIS MÍNIMOS</span><b>${escape(e.l?.policiais_minimos??a.policiais_minimos??'A confirmar')}</b></div><div><span>COOLDOWN</span><b>${duration(a.cooldown_segundos)}</b></div><div><span>TEMPO MÁXIMO</span><b>${amount(a.tempo_maximo_minutos)===null?'A confirmar':escape(a.tempo_maximo_minutos)+' min'}</b></div></div>
 <section class="ab-dossier-section"><div class="ab-section-title"><h3>01 / Investimento do kit</h3></div><div class="ab-ledger"><div><span>Kit completo publicado</span><b>${money(amount(a.custo))}</b></div></div></section>
 <section class="ab-dossier-section"><div class="ab-section-title"><h3>02 / Regras de confronto</h3></div>${rows.length?`<div class="ab-table-scroll"><table class="ab-rules"><thead><tr><th scope="col">Invasores</th><th scope="col">Policiais</th><th scope="col">Reféns máx.</th></tr></thead><tbody>${rows.map(r=>`<tr data-team-row="${escape(r.invasores)}"><td>${escape(r.invasores)}</td><td>${escape(r.policiais)}</td><td>${escape(r.refens)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="ab-help">Combinações de confronto a confirmar. A quantidade de armas do kit não define o limite de participantes.</p>'}</section>
 <section class="ab-dossier-section"><div class="ab-section-title"><h3>03 / Checklist de preparação</h3><span id="check-progress"></span></div><div class="ab-kit">${(a.itens||[]).map((i,index)=>{const src=imageSrc(i.imagem||pics[i.nome]);return `<label class="ab-kit-item"><input type="checkbox" data-check="${index}" ${selected.has(index)?'checked':''}>${src?`<img src="${escape(src)}" loading="lazy" alt="">`:''}<span><b>${escape(itemName(i.nome))}</b><small>Quantidade: ${escape(i.quantidade)}</small></span></label>`;}).join('')}</div><p class="ab-help">Marcação de conferência nesta sessão. Não altera o custo da simulação.</p></section>
 ${a.observacao?`<aside class="ab-observation"><b>Observação cadastrada</b><p>${escape(a.observacao)}</p></aside>`:''}<button class="ab-btn ab-primary ab-full" id="copy-plan">Copiar planejamento para o Discord ↗</button><details class="ab-copy-preview"><summary>Ver texto do planejamento</summary><pre id="plan-text"></pre></details></div>`;
 updateDossierFavorite();updateSimulation();updateProgress();$('dossier').showModal();
}
function updateSimulation() {if(!current)return;document.querySelectorAll('[data-team-row]').forEach(r=>r.classList.remove('ab-selected-row'));$('plan-text').textContent=planText();}
function updateProgress() {const count=checklist.get(current.id)?.size||0;$('check-progress').textContent=count+'/'+(current.a.itens||[]).length+' conferidos';}
function planText() {const e=current,a=e.a;return ['HIGH ROLEPLAY | PLANEJAMENTO DA AÇÃO',a.nome+' — '+e.title,'Local: '+coords(e),'Pendrive: '+pendrive(a),'Custo do kit completo: '+money(amount(a.custo)),'Cooldown: '+duration(a.cooldown_segundos),'Tempo máximo: '+(amount(a.tempo_maximo_minutos)===null?'A confirmar':a.tempo_maximo_minutos+' min'),'','EQUIPAMENTOS:',...(a.itens||[]).map(i=>'- '+i.quantidade+'× '+itemName(i.nome)),a.observacao?'Observação: '+a.observacao:''].filter(Boolean).join('\n');}
function comparison() {
 const chosen=[...compare].map(byId).filter(Boolean);if(chosen.length<2)return;
 const metrics=[['Investimento',e=>money(amount(e.a.custo))],['Invasores permitidos',teamLabel],['Armamento',e=>weapon(e.a)],['Pendrive',e=>pendrive(e.a)],['Policiais mínimos',e=>e.l?.policiais_minimos??e.a.policiais_minimos??'A confirmar'],['Cooldown',e=>duration(e.a.cooldown_segundos)],['Tempo máximo',e=>amount(e.a.tempo_maximo_minutos)===null?'A confirmar':e.a.tempo_maximo_minutos+' min']];
 $('comparison-content').innerHTML=`<p class="ab-help">Comparação de custos do kit e requisitos das ações.</p><div class="ab-table-scroll"><table class="ab-comparison-table"><thead><tr><th scope="col">Indicador</th>${chosen.map(e=>`<th scope="col">${picture(e)}<span>${escape(e.title)}</span><button class="ab-text-btn" data-comparison-open="${entries.indexOf(e)}">Ver dossiê ↗</button></th>`).join('')}</tr></thead><tbody>${metrics.map(([label,fn])=>`<tr><th scope="row">${label}</th>${chosen.map(e=>`<td>${escape(fn(e))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 $('comparison').showModal();
}
function setFavoriteFilter() {onlyFavorites=!onlyFavorites;draw();scrollCatalog();}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.size){selectedSize=b.dataset.size;draw();scrollCatalog();}
 if(b.dataset.open!==undefined)dossier(entries[Number(b.dataset.open)]);
 if(b.dataset.favorite!==undefined)toggleFavorite(entries[Number(b.dataset.favorite)].id);
 if(b.dataset.compare!==undefined)toggleCompare(entries[Number(b.dataset.compare)].id);
 if(b.dataset.close)$(b.dataset.close).close();
 if(b.hasAttribute('data-reset'))reset();
 if(b.dataset.comparisonOpen!==undefined){$('comparison').close();dossier(entries[Number(b.dataset.comparisonOpen)]);}
 if(b.id==='dossier-favorite')toggleFavorite(current.id);
 if(b.id==='copy-coords')copy(coords(current));
 if(b.id==='copy-plan')copy(planText());
 if(b.id==='share'){const url=new URL(location.href);url.search='';url.hash='acao='+encodeURIComponent(current.id);copy(url.href);}
});
document.addEventListener('change',e=>{
 if(e.target.id==='dossier-team')updateSimulation();
 if(e.target.dataset.check!==undefined){const checked=checklist.get(current.id)||new Set(),index=Number(e.target.dataset.check);e.target.checked?checked.add(index):checked.delete(index);checklist.set(current.id,checked);updateProgress();}
});
// Broken images use the brand, without repeatedly retrying a missing asset.
document.addEventListener('error',e=>{if(e.target.tagName==='IMG'&&!e.target.dataset.fallback){e.target.dataset.fallback='1';e.target.src='assets/high_logo.png';e.target.classList.add('ab-fallback');e.target.alt='High Roleplay — imagem indisponível';}},true);
['search','team','budget'].forEach(id=>$(id).addEventListener('input',draw));
['category','weapon','sort'].forEach(id=>$(id).addEventListener('change',draw));
$('reset').addEventListener('click',reset);$('explore').addEventListener('click',scrollCatalog);
$('favorites').addEventListener('click',setFavoriteFilter);$('hero-favorites').addEventListener('click',()=>{onlyFavorites=true;draw();scrollCatalog();});
$('compare-open').addEventListener('click',comparison);$('compare-clear').addEventListener('click',()=>{compare.clear();draw();});
function openLinked() {if(location.hash.startsWith('#acao=')){let id;try{id=decodeURIComponent(location.hash.slice(6));}catch{return;}const e=byId(id);if(e&&!$('dossier').open)dossier(e);else if(!e)toast('O local deste link não está mais disponível.');}}
window.addEventListener('hashchange',openLinked);
async function load() {
 try {
  const response=await fetch('data/acoes-blipadas.json',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível carregar os dados.');
  const data=await response.json();if(!Array.isArray(data.acoes))throw Error('Dados das ações indisponíveis.');
  entries=entriesFor(data.acoes);tax=taxFor(data.meta);$('tax-label').textContent=pct(tax*100);
  const names=[...new Set(entries.map(e=>e.a.nome))].sort((a,b)=>a.localeCompare(b,'pt-BR'));
  $('category').innerHTML='<option value="">Todas as ações</option>'+names.map(n=>`<option value="${escape(n)}">${escape(n)}</option>`).join('');
  $('overview').innerHTML=`<div><strong>${names.length}</strong><span>AÇÕES CADASTRADAS</span></div><div><strong>${entries.filter(e=>e.l).length}</strong><span>LOCAIS CADASTRADOS</span></div><div><strong>${pct(tax*100)}</strong><span>TAXA DE LAVAGEM</span></div><div class="ab-overview-note"><span>SEU PRÓXIMO PASSO</span><b>Preparar. Comparar. Escolher. ↗</b></div>`;
  document.querySelector('.ab-art-index').textContent='01—'+String(names.length).padStart(2,'0');drawDirectory();draw();openLinked();
 } catch(error) {
  $('overview').textContent='Dados indisponíveis no momento.';$('counter').textContent='Falha ao carregar o guia.';
  $('actions').innerHTML='<div class="ab-empty"><h3>Não conseguimos carregar as ações.</h3><p>Verifique sua conexão e tente novamente.</p><button class="ab-btn" id="retry">Tentar novamente</button></div>';$('retry').addEventListener('click',load);
 } finally {$('actions').setAttribute('aria-busy','false');}
}
load();
