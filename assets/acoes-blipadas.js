const fmt=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(n)||0);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const canonicalItem=s=>['colete','placa balistica'].includes(norm(s).trim())?'PLACA BALÍSTICA':String(s||'');
const pics={'PLACA BALÍSTICA':'ballisticplate.png','COLETE':'ballisticplate.png','ARMA BRANCA':'','MUNIÇÃO PISTOLA (x100)':'caixa_m_pistola.png','MUNIÇÃO SUB (x200)':'caixa_m_smg.png','MUNIÇÃO FUZIL (x250)':'caixa_m_rifle.png','ARMA PISTOLA':'t54.png','ARMA SUB':'uzi.png','ARMA FUZIL':'ak102.png','PENDRIVE 1':'pendrive1.png','PENDRIVE 2':'pendrive2.png','PENDRIVE 3':'pendrive3.png','PENDRIVE 4':'pendrive4.png','PENDRIVE 5':'pendrive5.png'};
const imageSrc=s=>{const v=String(s||'').trim();if(!v)return '';if(/^https:\/\//i.test(v))return v;if(!/^[\w.\-]+\.(png|jpe?g|webp)$/i.test(v))return '';return 'assets/itens/'+encodeURIComponent(v)};
let records=[];
const category=a=>a.nome;
const coords=l=>[l.x,l.y,l.z].join(', ');
const card=(a,l,index,total)=>{
 const gear=a.itens.map(i=>{const p=imageSrc(i.imagem||pics[i.nome]||pics[canonicalItem(i.nome)]);return '<div class="ab-item">'+(p?'<img loading="lazy" src="'+safe(p)+'" alt="" onerror="this.remove()">':'')+'<div><strong>'+safe(canonicalItem(i.nome))+'</strong><small>Qtd: '+i.quantidade+'</small></div></div>'}).join('');
 const photo=imageSrc(l?.imagem||a.imagem);
 const title=l?.descricao||a.nome;
 const where=l?'<div class="ab-location"><span>Coordenadas</span><div>'+safe(coords(l))+' <button class="ab-copy" data-coords="'+safe(coords(l))+'">Copiar</button></div></div>':'<div class="ab-location">'+safe(a.localizacao||'Localização a confirmar')+'</div>';
 return '<article class="ab-card">'+(photo?'<img class="ab-cover" loading="lazy" src="'+safe(photo)+'" alt="'+safe(title)+'" onerror="this.remove()">':'<div class="ab-photo-pending"><span>⌖</span><small>Foto do local a adicionar</small></div>')+'<span class="ab-tag">'+safe(a.nome)+'</span><h2>'+safe(title)+'</h2>'+(total>1?'<div class="ab-unit">Unidade '+(index+1)+' de '+total+'</div>':'')+where+'<div class="ab-prizes"><div><small>PRÊMIO MÍNIMO (SUJO)</small><strong>'+fmt(a.premio_min)+'</strong></div><div><small>PRÊMIO MÁXIMO (SUJO)</small><strong>'+fmt(a.premio_max)+'</strong></div></div><div class="ab-cost"><span>Custo da preparação</span><strong>'+fmt(a.custo)+'</strong></div><details><summary>Equipamentos e lucro estimado</summary><div class="ab-items">'+gear+'</div><div class="ab-profit">Após 30% de lavagem e custos: <strong>'+fmt(a.premio_min*.7-a.custo)+' a '+fmt(a.premio_max*.7-a.custo)+'</strong></div></details></article>';
};
function draw(){
 const q=norm(document.getElementById('search').value),filter=norm(document.getElementById('filter').value),selected=document.getElementById('category').value;
 const list=records.filter(a=>norm(a.status)!=='inativo'&&(!selected||category(a)===selected)&&(!filter||a.itens.some(i=>norm(i.nome).includes(filter)))&&norm([a.nome,a.localizacao,...(a.locais||[]).map(l=>l.descricao||''),...a.itens.flatMap(i=>[i.nome,canonicalItem(i.nome),norm(i.nome)==='colete'?'placa balistica':'colete'])].join(' ')).includes(q));
 const cards=list.flatMap(a=>(a.locais?.length?a.locais:[null]).map((l,i)=>card(a,l,i,a.locais?.length||1)));
 document.getElementById('counter').textContent=list.length+' categorias de ação · '+cards.length+' locais';
 document.getElementById('actions').innerHTML=cards.join('')||'<p>Nenhuma ação encontrada.</p>';
}
function setupCategories(){
 const select=document.getElementById('category');
 [...new Set(records.filter(a=>norm(a.status)!=='inativo').map(category))].sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name+' ('+records.find(a=>a.nome===name)?.locais?.length+' locais)';select.appendChild(o)});
}

fetch('data/acoes-blipadas.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Falha ao carregar ações');return r.json()}).then(data=>{records=data.acoes||[];setupCategories();draw()}).catch(e=>{document.getElementById('counter').textContent=e.message});['search','filter','category'].forEach(id=>document.getElementById(id).addEventListener(id==='search'?'input':'change',draw));
document.getElementById('actions').addEventListener('click',e=>{const b=e.target.closest('button[data-coords]');if(b&&navigator.clipboard)navigator.clipboard.writeText(b.dataset.coords).then(()=>{b.textContent='Copiado!';setTimeout(()=>b.textContent='Copiar',1200)}).catch(()=>{});});
