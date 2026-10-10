const fmt=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(n)||0);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const canonicalItem=s=>['colete','placa balistica'].includes(norm(s).trim())?'PLACA BALÍSTICA':String(s||'');
const pics={'PLACA BALÍSTICA':'ballisticplate.png','COLETE':'ballisticplate.png','ARMA BRANCA':'','MUNIÇÃO PISTOLA (x100)':'caixa_m_pistola.png','MUNIÇÃO SUB (x200)':'caixa_m_smg.png','MUNIÇÃO FUZIL (x250)':'caixa_m_rifle.png','ARMA PISTOLA':'t54.png','ARMA SUB':'uzi.png','ARMA FUZIL':'ak102.png','PENDRIVE 1':'pendrive1.png','PENDRIVE 2':'pendrive2.png','PENDRIVE 3':'pendrive3.png','PENDRIVE 4':'pendrive4.png','PENDRIVE 5':'pendrive5.png'};
const imageSrc=s=>{const v=String(s||'').trim();if(!v)return '';if(/^https:\/\//i.test(v))return v;if(!/^[\w.\-]+\.(png|jpe?g|webp)$/i.test(v))return '';return 'assets/itens/'+encodeURIComponent(v)};
let records=[];
const category=a=>a.nome;
// Porte baseado no maior numero de invasores habilitados, nunca na quantidade de armas.
const actionSize=a=>{const rows=[...(a.regras_confronto||[]),...(a.locais||[]).flatMap(l=>l.regras_confronto||[])];const max=Math.max(0,...rows.map(r=>Number(r.invasores)||0));return !max?'pendente':max<=5?'pequena':max<=9?'media':'grande';};
const sizeNames={pequena:'Ações pequenas',media:'Ações médias',grande:'Ações grandes',pendente:'Porte a confirmar'};
let selectedSize='todas';
const coords=l=>[l.x,l.y,l.z].join(', ');
const card=(a,l,index,total)=>{
 const gear=a.itens.map(i=>{const p=imageSrc(i.imagem||pics[i.nome]||pics[canonicalItem(i.nome)]);return '<div class="ab-item">'+(p?'<img loading="lazy" src="'+safe(p)+'" alt="" onerror="this.remove()">':'')+'<div><strong>'+safe(canonicalItem(i.nome))+'</strong><small>Qtd: '+i.quantidade+'</small></div></div>'}).join('');
 const locationImage=(a,l)=>{const direct=l?.imagem||a.imagem;if(direct)return direct;const match=(a.locais||[]).find(v=>v!==l&&v.imagem&&Math.hypot(Number(v.x)-Number(l?.x),Number(v.y)-Number(l?.y))<15);return match?.imagem||'';};
 const photo=imageSrc(locationImage(a,l));
 const title=l?.descricao||a.nome;
 const pendrive=a.itens.find(i=>/^PENDRIVE\s*[1-5]$/i.test(i.nome));
 const arm=a.itens.find(i=>/^ARMA\s/i.test(i.nome));
 const colete=a.itens.find(i=>['colete','placa balistica'].includes(norm(i.nome)));
 const armCount=arm?.quantidade||null;
 const police=l?.policiais_minimos??a.policiais_minimos??a.min_policiais??null;
 const stats='<div class="ab-stats"><div class="ab-stat ab-stat-primary"><small>PENDRIVE EXIGIDO</small><strong>'+safe(a.pendrive_exigido||pendrive?.nome||'A confirmar')+'</strong></div><div class="ab-stat"><small>POLICIAIS MÍNIMOS</small><strong>'+safe(police===null||police===''?'A confirmar':police)+'</strong></div><div class="ab-stat"><small>ARMAMENTO</small><strong>'+safe(arm?.nome.replace(/^ARMA\s+/i,'')||'A confirmar')+'</strong></div><div class="ab-stat"><small>EQUIPAMENTOS / JOGADORES*</small><strong>'+safe(armCount??'A confirmar')+'</strong></div></div>';
 const confrontation=l?.regras_confronto?.length?l.regras_confronto:a.regras_confronto;
 const rules=confrontation?.length?'<div class="ab-rules"><h3>Invasores × policiais × reféns</h3><table><thead><tr><th>Invasores</th><th>Policiais</th><th>Reféns máx.</th></tr></thead><tbody>'+confrontation.map(r=>'<tr><td>'+safe(r.invasores)+'</td><td>'+safe(r.policiais)+'</td><td>'+safe(r.refens)+'</td></tr>').join('')+'</tbody></table></div>':'';
 const timing=(a.cooldown_segundos!=null||a.tempo_maximo_minutos!=null)?'<div class="ab-timing">'+(a.cooldown_segundos!=null?'<span>Cooldown: <strong>'+safe(Math.floor(a.cooldown_segundos/60))+' min</strong></span>':'')+(a.tempo_maximo_minutos!=null?'<span>Tempo máximo: <strong>'+safe(a.tempo_maximo_minutos)+' min</strong></span>':'')+'</div>':'';
 const preparation='<div class="ab-preparation"><h3>Preparação da ação</h3><div class="ab-items">'+gear+'</div><small>*Quantidade de armas cadastradas; não representa necessariamente o limite de participantes.</small></div>';
 const where=l?'<div class="ab-location"><span>Coordenadas</span><div>'+safe(coords(l))+' <button class="ab-copy" data-coords="'+safe(coords(l))+'">Copiar</button></div></div>':'<div class="ab-location">'+safe(a.localizacao||'Localização a confirmar')+'</div>';
 return '<article class="ab-card">'+(photo?'<img class="ab-cover" loading="lazy" src="'+safe(photo)+'" alt="'+safe(title)+'" onerror="this.onerror=null;this.src=\'assets/high_logo.png\';this.classList.add(\'ab-cover-fallback\')">':'<div class="ab-photo-pending ab-photo-branded"><img src="assets/high_logo.png" alt="High Roleplay"><small>Imagem ilustrativa</small></div>')+'<span class="ab-tag">'+safe(a.nome)+'</span><h2>'+safe(title)+'</h2>'+(total>1?'<div class="ab-unit">Unidade '+(index+1)+' de '+total+'</div>':'')+where+stats+'<div class="ab-prizes"><div><small>PRÊMIO MÍNIMO (SUJO)</small><strong>'+fmt(a.premio_min)+'</strong></div><div><small>PRÊMIO MÁXIMO (SUJO)</small><strong>'+fmt(a.premio_max)+'</strong></div></div><div class="ab-cost"><span>Custo da preparação</span><strong>'+fmt(a.custo)+'</strong></div>'+rules+timing+preparation+'<details><summary>Lucro líquido estimado</summary><div class="ab-profit">Após 30% de lavagem e custos: <strong>'+fmt(a.premio_min*.7-a.custo)+' a '+fmt(a.premio_max*.7-a.custo)+'</strong></div></details></article>';
};
const sizeDescriptions={pequena:'Operações rápidas e equipes menores',media:'Confrontos intermediários e equipes maiores',grande:'Operações de grande escala e alto contingente',pendente:'Ações aguardando confirmação de participantes'};
const sizeRanges={pequena:'ATÉ 5 INVASORES',media:'6 A 9 INVASORES',grande:'10+ INVASORES',pendente:'REQUISITOS PENDENTES'};
function showDirectory(){
 document.getElementById('ab-directory').hidden=false;
 document.getElementById('ab-listing').hidden=true;
 document.getElementById('category').value='';
 document.getElementById('search').value='';
 document.getElementById('filter').value='';
 selectedSize='todas';
 window.scrollTo({top:0,behavior:'smooth'});
}
function openSize(k){
 selectedSize=k;
 document.getElementById('ab-directory').hidden=true;
 document.getElementById('ab-listing').hidden=false;
 draw();
 document.getElementById('ab-listing').scrollIntoView({behavior:'smooth',block:'start'});
}
function drawDirectory(){
 const available=records.filter(a=>norm(a.status)!=='inativo');
 const groups=['pequena','media','grande','pendente'];
 document.getElementById('ab-directory-cards').innerHTML=groups.map(k=>{
  const count=available.filter(a=>actionSize(a)===k).length;
  if(k==='pendente'&&!count)return '';
  return '<button type="button" class="ab-directory-card ab-directory-'+k+'" data-open-size="'+k+'"><div class="ab-directory-art"><img src="assets/high_logo.png" alt="Logo High Roleplay" loading="lazy"></div><div class="ab-directory-body"><span class="ab-directory-range">'+sizeRanges[k]+'</span><h3>'+sizeNames[k]+'</h3><p>'+sizeDescriptions[k]+'</p><div class="ab-directory-foot"><span>'+count+' ações cadastradas</span><strong>Ver ações →</strong></div></div></button>';
 }).join('');
}
function draw(){
 const q=norm(document.getElementById('search').value),filter=norm(document.getElementById('filter').value),selected=document.getElementById('category').value;
 const list=records.filter(a=>norm(a.status)!=='inativo'&&(!selected||category(a)===selected)&&(!filter||a.itens.some(i=>norm(i.nome).includes(filter)))&&norm([a.nome,a.localizacao,...(a.locais||[]).map(l=>l.descricao||''),...a.itens.flatMap(i=>[i.nome,canonicalItem(i.nome),norm(i.nome)==='colete'?'placa balistica':'colete'])].join(' ')).includes(q));
 const sizes=['pequena','media','grande','pendente'];
 const counts=Object.fromEntries(sizes.map(k=>[k,list.filter(a=>actionSize(a)===k).length]));
 document.querySelectorAll('[data-size]').forEach(b=>{const k=b.dataset.size;b.classList.toggle('active',k===selectedSize);b.setAttribute('aria-pressed',String(k===selectedSize));const n=k==='todas'?list.length:counts[k];b.querySelector('span').textContent=n;});
 const visible=sizes.filter(k=>selectedSize==='todas'||selectedSize===k);
 let locations=0;
 const html=visible.map(k=>{
   const group=list.filter(a=>actionSize(a)===k);
   if(!group.length)return '';
   const cards=group.flatMap(a=>(a.locais?.length?a.locais:[null]).map((l,i)=>card(a,l,i,a.locais?.length||1)));
   locations+=cards.length;
   const hint={pequena:'Até 5 invasores',media:'De 6 a 9 invasores',grande:'10 ou mais invasores',pendente:'Sem configuração de invasores confirmada'}[k];
   return '<section class="ab-group"><header class="ab-group-head"><div><h2>'+sizeNames[k]+'</h2><p>'+hint+'</p></div><span>'+group.length+' ações</span></header><div class="ab-grid">'+cards.join('')+'</div></section>';
 }).join('');
 document.getElementById('counter').textContent=(selectedSize==='todas'?list.length:list.filter(a=>actionSize(a)===selectedSize).length)+' ações · '+locations+' locais';
 document.getElementById('actions').innerHTML=html||'<p class="ab-empty">Nenhuma ação encontrada neste filtro.</p>';
}
function setupCategories(){
 const select=document.getElementById('category');
 [...new Set(records.filter(a=>norm(a.status)!=='inativo').map(category))].sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name+' ('+records.find(a=>a.nome===name)?.locais?.length+' locais)';select.appendChild(o)});
}

fetch('data/acoes-blipadas.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Falha ao carregar ações');return r.json()}).then(data=>{records=data.acoes||[];setupCategories();drawDirectory();draw()}).catch(e=>{document.getElementById('counter').textContent=e.message});['search','filter','category'].forEach(id=>document.getElementById(id).addEventListener(id==='search'?'input':'change',draw));
document.getElementById('actions').addEventListener('click',e=>{const b=e.target.closest('button[data-coords]');if(b&&navigator.clipboard)navigator.clipboard.writeText(b.dataset.coords).then(()=>{b.textContent='Copiado!';setTimeout(()=>b.textContent='Copiar',1200)}).catch(()=>{});});

document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{selectedSize=b.dataset.size;draw();}));

document.getElementById('ab-directory-cards').addEventListener('click',e=>{const b=e.target.closest('[data-open-size]');if(b)openSize(b.dataset.openSize);});
document.getElementById('ab-back').addEventListener('click',showDirectory);
