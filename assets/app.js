const CATALOG_URL = './data/catalogo.json';
const ITEM_IMAGE_BASE = './assets/itens/';
const RULE_IMAGE_BASE = './assets/itens';

const icons = {
  'armas':'🔫','municao':'💥','tecnologia-utilitarios':'💻','drogas-rotas':'🧪',
  'desmanche':'🔧','lavagem':'💸','falsificacao':'💳','hospital-ilegal':'💉',
  'mecanica':'🏁','mecanica-ilegal':'🏁','contrabando':'📦'
};

const slugify = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const normalizeText = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const money = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(n||0));
const esc = s => String(s ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const isActive = i => normalizeText(i?.status || 'ativo') !== 'inativo';
const iconFor = c => icons[slugify(c)] || '◆';

const categoryVisuals = {
  'armas': {image:'t54.png', image2:'ak102.png', desc:'Pistolas, SMGs, fuzis e armamento do mercado ilegal.'},
  'municao': {image:'caixa_m_rifle.png', image2:'sniperammo.png', desc:'Munições, explosivos e acessórios para seu armamento.'},
  'tecnologia-utilitarios': {image:'tablethack.png', image2:'notebook.png', desc:'Hackeamento, rastreadores e equipamentos eletrônicos.'},
  'drogas-rotas': {image:'packdrug1.png', image2:'mapabairro1.png', desc:'Drogas, insumos e itens ligados às rotas ilegais.'},
  'lavagem': {image:'pendrive5.png', image2:'alcoolemgel.png', desc:'Ferramentas e itens utilizados na lavagem de dinheiro.'},
  'desmanche': {image:'blocksignal.png', image2:'lockpickplus.png', desc:'Peças, bloqueadores e itens para desmanche de veículos.'},
  'falsificacao': {image:'cartaoclonado2.png', image2:'dollarfake.png', desc:'Documentos, cartões e itens de falsificação.'},
  'hospital-ilegal': {image:'adrenalineclandestineplus.png', image2:'infectedbandage.png', desc:'Itens médicos de uso clandestino e suporte ilegal.'},
  'contrabando': {image:'attachbox.png', desc:'Itens raros, cargas e mercadorias de contrabando.'},
  'mecanica': {image:'Nitro+.png', image2:'Aerofolio_Esportivo.png', desc:'Performance, preparação e equipamentos especiais.'},
  'mecanica-ilegal': {image:'Nitro+.png', image2:'Aerofolio_Esportivo.png', desc:'Performance, preparação e equipamentos especiais.'}
};

function categoryVisual(c){ return categoryVisuals[slugify(c)] || {image:'',desc:'Itens e valores disponíveis nesta categoria.'}; }
function categoryArt(c){
  const v=categoryVisual(c);
  const a=v.image?`<img class="category-product category-product-a" src="${ITEM_IMAGE_BASE}${encodeURIComponent(v.image)}" alt="" loading="lazy" onerror="this.style.display='none'">`:'';
  const b=v.image2?`<img class="category-product category-product-b" src="${ITEM_IMAGE_BASE}${encodeURIComponent(v.image2)}" alt="" loading="lazy" onerror="this.style.display='none'">`:'';
  return `<div class="category-art"><div class="category-art-grid"></div>${a}${b}<span class="category-art-icon">${iconFor(c)}</span></div>`;
}

async function loadCatalog(){
  const r=await fetch(`${CATALOG_URL}?v=${Date.now()}`);
  if(!r.ok) throw new Error('Não foi possível carregar o catálogo.');
  return r.json();
}

function updateMeta(data){
  document.querySelectorAll('[data-updated]').forEach(el=>{
    const d=new Date(data.meta?.atualizado_em);
    el.textContent=isNaN(d)?'Atualização não informada':`Atualizado em ${d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}`;
  });
  document.querySelectorAll('[data-total]').forEach(el=>el.textContent=(data.itens||[]).filter(isActive).length);
}

function imageMarkup(i){
  const file=String(i.imagem||'').trim();
  if(!file) return `<div class="item-image item-image-empty"><span>${iconFor(i.categoria)}</span></div>`;
  return `<div class="item-image"><img src="${ITEM_IMAGE_BASE}${encodeURIComponent(file)}" alt="${esc(i.item)}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('item-image-empty');this.parentElement.innerHTML='<span>${iconFor(i.categoria)}</span>'"></div>`;
}

function itemCard(i,showCategory=false){
  return `<article class="item-card" data-highlight="${!!i.destaque}">
    ${imageMarkup(i)}
    <div class="item-card-top">
      <span class="tag-inline">${showCategory?esc(i.categoria):(i.destaque?'DESTAQUE':esc(i.status||'ATIVO').toUpperCase())}</span>
      ${showCategory&&i.destaque?'<span class="tag-inline">DESTAQUE</span>':''}
    </div>
    <h3>${esc(i.item)}</h3>
    <div class="prices"><div class="price"><span>Parceria</span><strong>${money(i.parceria)}</strong></div><div class="price pista"><span>Pista</span><strong>${money(i.pista)}</strong></div></div>
    ${i.observacao?`<div class="notice">⚠ ${esc(i.observacao)}</div>`:''}
    ${showCategory?`<a class="item-open" href="categoria.html?c=${slugify(i.categoria)}">ABRIR ${esc(i.categoria).toUpperCase()} →</a>`:''}
  </article>`;
}

function ensureGlobalResults(search){
  let box=document.querySelector('#globalResults');
  if(box) return box;
  box=document.createElement('div');
  box.id='globalResults';
  box.className='global-results';
  search.closest('.searchbar').insertAdjacentElement('afterend',box);
  return box;
}

async function initHome(){
  const data=await loadCatalog(); updateMeta(data);
  const active=(data.itens||[]).filter(isActive);
  const grid=document.querySelector('#categoryGrid');
  const featured=document.querySelector('#featured');
  const search=document.querySelector('#globalSearch');

  if(grid){
    const cats=[...new Set(active.map(i=>i.categoria).filter(Boolean))];
    grid.innerHTML=cats.map(c=>{
      const count=active.filter(i=>slugify(i.categoria)===slugify(c)).length;
      const visual=categoryVisual(c);
      return `<a class="category-card category-card-visual cat-${slugify(c)}" href="categoria.html?c=${slugify(c)}">
        ${categoryArt(c)}
        <div class="category-card-content">
          <div class="category-card-heading"><span class="category-symbol">${iconFor(c)}</span><h3>${esc(c)}</h3><span class="category-count">${count} ITENS</span></div>
          <p>${esc(visual.desc)}</p>
          <span class="category-open">VER ITENS <b>→</b></span>
        </div>
      </a>`;
    }).join('');
    document.querySelectorAll('[data-category-count-home]').forEach(el=>el.textContent=cats.length);
  }

  if(featured){
    const highlights=active.filter(i=>!!i.destaque).slice(0,12);
    featured.innerHTML=highlights.length?highlights.map(i=>itemCard(i,true)).join(''):'<div class="empty">Use a busca acima para localizar qualquer item do catálogo.</div>';
  }

  if(search){
    const resultsBox=ensureGlobalResults(search);
    const renderSearch=q=>{
      const term=normalizeText(q);
      if(!term){resultsBox.innerHTML='';resultsBox.classList.remove('open');return;}
      const results=active.filter(i=>normalizeText(`${i.item} ${i.categoria} ${i.observacao||''}`).includes(term));
      resultsBox.classList.add('open');
      resultsBox.innerHTML=`<div class="global-results-head"><div><span class="eyebrow">RESULTADOS DA BUSCA</span><strong>${results.length} ${results.length===1?'ITEM ENCONTRADO':'ITENS ENCONTRADOS'}</strong></div><button type="button" id="clearGlobalSearch">LIMPAR</button></div><div class="items-grid search-results-grid">${results.length?results.map(i=>itemCard(i,true)).join(''):`<div class="empty">Nenhum item encontrado para “${esc(q)}”.</div>`}</div>`;
      document.querySelector('#clearGlobalSearch')?.addEventListener('click',()=>{search.value='';renderSearch('');search.focus();});
    };
    search.addEventListener('input',e=>renderSearch(e.target.value));
  }
}

async function initCategory(){
  const data=await loadCatalog(); updateMeta(data);
  const active=(data.itens||[]).filter(isActive);
  const raw=new URLSearchParams(location.search).get('c')||'';
  const matched=active.find(i=>slugify(i.categoria)===slugify(raw));
  const cat=matched?.categoria||active[0]?.categoria||'';
  const items=active.filter(i=>slugify(i.categoria)===slugify(cat));
  document.title=`${cat} • Mercado Negro High`;
  document.querySelector('#catIcon') && (document.querySelector('#catIcon').textContent=iconFor(cat));
  document.querySelector('#catName') && (document.querySelector('#catName').textContent=cat);
  document.querySelector('#catCount') && (document.querySelector('#catCount').textContent=`${items.length} ITENS ATIVOS`);
  const list=document.querySelector('#itemList'), search=document.querySelector('#categorySearch');
  const render=q=>{if(!list)return;const term=normalizeText(q);const filtered=items.filter(i=>!term||normalizeText(`${i.item} ${i.categoria} ${i.observacao||''}`).includes(term));list.innerHTML=filtered.length?filtered.map(i=>itemCard(i)).join(''):'<div class="empty">Nenhum item encontrado nesta categoria.</div>';};
  render(''); search?.addEventListener('input',e=>render(e.target.value));
  const rules=document.querySelector('#rules');
  if(rules&&slugify(cat)==='lavagem'&&Array.isArray(data.regras?.lavagem)&&data.regras.lavagem.length){
    const grupos=[...new Set(data.regras.lavagem.map(r=>String(r.grupo||'REGRAS').trim().toUpperCase()).filter(Boolean))];
    rules.innerHTML=`<div class="rules-heading"><span>REGRAS OPERACIONAIS</span><strong>LAVAGEM E SECAGEM DE DINHEIRO</strong><p>Percentuais e imagens publicados diretamente pela planilha oficial.</p></div>`+grupos.map(grupo=>{
      const tituloGrupo=grupo==='SECAGEM'?'SECAGEM DE DINHEIRO':grupo==='LAVAGEM'?'LAVAGEM DE DINHEIRO':grupo;
      const rows=data.regras.lavagem.filter(r=>String(r.grupo||'REGRAS').trim().toUpperCase()===grupo);
      return `<section class="rule-group"><div class="rule-group-title">${esc(tituloGrupo)}</div><div class="rule-group-grid">${rows.map(r=>{
        const file=String(r.imagem||'').trim();
        const img=file?`<div class="rule-image"><img src="${RULE_IMAGE_BASE}${encodeURIComponent(file)}" alt="${esc(r.titulo||r.tipo)}" loading="lazy" onerror="this.parentElement.style.display='none'"></div>`:'';
        return `<article class="rule rule-rich">${img}<div class="rule-copy"><strong>${esc(r.titulo||r.tipo)}</strong><span>${esc(r.texto)}</span><small>${esc(grupo)}</small></div></article>`;
      }).join('')}</div></section>`;
    }).join('');
  }
}


function categoryChip(c, active=false){
  return `<button type="button" class="filter-chip${active?' active':''}" data-category="${esc(c)}">${esc(c)}</button>`;
}

function tableImageMarkup(i){
  const file=String(i.imagem||'').trim();
  if(!file) return `<div class="table-thumb table-thumb-empty"><span>${iconFor(i.categoria)}</span></div>`;
  return `<div class="table-thumb"><img src="${ITEM_IMAGE_BASE}${encodeURIComponent(file)}" alt="${esc(i.item)}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('table-thumb-empty');this.parentElement.innerHTML='<span>${iconFor(i.categoria)}</span>'"></div>`;
}

async function initGlobalTable(){
  const data=await loadCatalog();
  updateMeta(data);
  const active=(data.itens||[]).filter(isActive);

  const search=document.querySelector('#tableSearch');
  const body=document.querySelector('#globalTableBody');
  const filters=document.querySelector('#tableFilters');
  const count=document.querySelector('#tableVisibleCount');
  const sortButtons=[...document.querySelectorAll('[data-sort]')];
  const reset=document.querySelector('#tableReset');
  const mobileList=document.querySelector('#globalTableMobile');

  let selected='TODOS';
  let query='';
  let sortKey='ordem';
  let sortDir='asc';

  const categories=[...new Set(active.map(i=>i.categoria).filter(Boolean))];
  if(filters){
    filters.innerHTML=categoryChip('TODOS',true)+categories.map(c=>categoryChip(c)).join('');
    filters.addEventListener('click',e=>{
      const btn=e.target.closest('[data-category]');
      if(!btn) return;
      selected=btn.dataset.category;
      filters.querySelectorAll('.filter-chip').forEach(b=>b.classList.toggle('active',b===btn));
      render();
    });
  }

  const compare=(a,b,key)=>{
    if(key==='parceria'||key==='pista'||key==='ordem') return Number(a[key]||0)-Number(b[key]||0);
    return normalizeText(a[key]||'').localeCompare(normalizeText(b[key]||''),'pt-BR');
  };

  const getRows=()=>{
    const term=normalizeText(query);
    let rows=active.filter(i=>selected==='TODOS'||slugify(i.categoria)===slugify(selected));
    if(term) rows=rows.filter(i=>normalizeText(`${i.item} ${i.categoria} ${i.observacao||''}`).includes(term));
    rows=[...rows].sort((a,b)=>compare(a,b,sortKey)*(sortDir==='asc'?1:-1));
    return rows;
  };

  const tableRow=(i)=>{
    const diff=Math.max(0,Number(i.pista||0)-Number(i.parceria||0));
    return `<tr>
      <td class="col-img">${tableImageMarkup(i)}</td>
      <td class="col-item"><div class="table-item-name">${esc(i.item)}</div>${i.observacao?`<div class="table-note">${esc(i.observacao)}</div>`:''}</td>
      <td><a class="category-link" href="categoria.html?c=${slugify(i.categoria)}">${esc(i.categoria)}</a></td>
      <td class="money-cell partnership">${money(i.parceria)}</td>
      <td class="money-cell track"><strong>${money(i.pista)}</strong>${diff?`<small>+ ${money(diff)} vs parceria</small>`:''}</td>
    </tr>`;
  };

  const mobileCard=(i)=>{
    const diff=Math.max(0,Number(i.pista||0)-Number(i.parceria||0));
    return `<article class="table-mobile-card">
      ${tableImageMarkup(i)}
      <div class="table-mobile-copy">
        <a class="table-mobile-category" href="categoria.html?c=${slugify(i.categoria)}">${esc(i.categoria)}</a>
        <h3>${esc(i.item)}</h3>
        <div class="table-mobile-prices"><div><span>Parceria</span><strong>${money(i.parceria)}</strong></div><div><span>Pista</span><strong>${money(i.pista)}</strong>${diff?`<small>+ ${money(diff)}</small>`:''}</div></div>
      </div>
    </article>`;
  };

  const render=()=>{
    const rows=getRows();
    if(count) count.textContent=`${rows.length} ${rows.length===1?'ITEM':'ITENS'}`;
    if(body) body.innerHTML=rows.length?rows.map(tableRow).join(''):`<tr><td colspan="5"><div class="empty">Nenhum item encontrado.</div></td></tr>`;
    if(mobileList) mobileList.innerHTML=rows.length?rows.map(mobileCard).join(''):`<div class="empty">Nenhum item encontrado.</div>`;
    sortButtons.forEach(btn=>{
      const activeSort=btn.dataset.sort===sortKey;
      btn.classList.toggle('active',activeSort);
      const mark=btn.querySelector('.sort-mark');
      if(mark) mark.textContent=activeSort?(sortDir==='asc'?'↑':'↓'):'↕';
    });
  };

  search?.addEventListener('input',e=>{query=e.target.value;render();});
  sortButtons.forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.sort;
    if(sortKey===key) sortDir=sortDir==='asc'?'desc':'asc'; else {sortKey=key;sortDir='asc';}
    render();
  }));
  reset?.addEventListener('click',()=>{
    selected='TODOS';query='';sortKey='ordem';sortDir='asc';
    if(search) search.value='';
    filters?.querySelectorAll('.filter-chip').forEach(b=>b.classList.toggle('active',b.dataset.category==='TODOS'));
    render();
  });

  const discordBtn=document.querySelector('#discordImageButton');
  discordBtn?.addEventListener('click',async()=>{
    const oldText=discordBtn.textContent;
    discordBtn.disabled=true;
    discordBtn.textContent='GERANDO IMAGEM...';
    try{
      await generateDiscordMarketImage(active,data);
    }catch(err){
      console.error(err);
      alert('Não foi possível gerar a imagem: '+err.message);
    }finally{
      discordBtn.disabled=false;
      discordBtn.textContent=oldText;
    }
  });

  document.querySelector('[data-category-count]')?.replaceChildren(document.createTextNode(String(categories.length)));
  render();
}

function roundedRect(ctx,x,y,w,h,r){
  const rr=Math.min(r,w/2,h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

function drawTextFit(ctx,text,x,y,maxWidth,fontSize,fontWeight='800',align='left'){
  const oldAlign=ctx.textAlign;
  ctx.textAlign=align;
  let size=fontSize;
  ctx.font=`${fontWeight} ${size}px Arial, sans-serif`;
  while(size>8&&ctx.measureText(text).width>maxWidth){
    size-=1;
    ctx.font=`${fontWeight} ${size}px Arial, sans-serif`;
  }
  ctx.fillText(text,x,y);
  ctx.textAlign=oldAlign;
}

function loadCanvasImage(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>resolve(img);
    img.onerror=reject;
    img.src=src;
  });
}

function canvasBlob(canvas){
  return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Falha ao criar PNG.')),'image/png'));
}

function showDiscordImagePreview(url,blob,fileName){
  document.querySelector('#discordImageModal')?.remove();
  const modal=document.createElement('div');
  modal.id='discordImageModal';
  modal.className='discord-image-modal';
  modal.innerHTML=`<div class="discord-image-dialog"><div class="discord-image-head"><div><span>IMAGEM PARA DISCORD</span><strong>Tabela gerada com sucesso</strong></div><button type="button" data-close>×</button></div><div class="discord-image-preview"><img src="${url}" alt="Tabela Mercado Negro High"></div><div class="discord-image-actions"><button type="button" data-copy>COPIAR IMAGEM</button><a href="${url}" download="${fileName}">BAIXAR PNG</a></div><p>Use “Copiar imagem” e cole direto no Discord, ou baixe o PNG.</p></div>`;
  document.body.appendChild(modal);
  const close=()=>{URL.revokeObjectURL(url);modal.remove();};
  modal.querySelector('[data-close]')?.addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.querySelector('[data-copy]')?.addEventListener('click',async e=>{
    const btn=e.currentTarget;
    try{
      if(!navigator.clipboard||typeof ClipboardItem==='undefined') throw new Error('Navegador sem suporte a copiar PNG.');
      await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
      const t=btn.textContent;btn.textContent='COPIADO ✓';setTimeout(()=>btn.textContent=t,1800);
    }catch(err){
      alert('Seu navegador não permitiu copiar a imagem. Use BAIXAR PNG.');
    }
  });
}

async function generateDiscordMarketImage(items,data){
  const rows=[...items].sort((a,b)=>{
    const ca=Number(a.ordem||9999),cb=Number(b.ordem||9999);
    return ca-cb;
  });

  const groups=[];
  for(const item of rows){
    let g=groups.find(x=>slugify(x.name)===slugify(item.categoria));
    if(!g){g={name:item.categoria,items:[]};groups.push(g);}
    g.items.push(item);
  }

  // Layout compacto estilo tabela oficial antiga: 3 colunas balanceadas.
  const W=1600;
  const margin=28;
  const headerH=175;
  const footerH=44;
  const colGap=14;
  const colW=(W-margin*2-colGap*2)/3;
  const groupTitleH=38;
  const tableHeadH=24;
  const rowH=29;
  const groupGap=12;
  const padX=12;
  const lavagemRules=Array.isArray(data?.regras?.lavagem)?data.regras.lavagem:[];
  const ruleRowH=62;
  const ruleHeadH=25;
  const rulesForGroup=g=>slugify(g.name)==='lavagem'?lavagemRules:[];

  const ruleImageMap={};
  await Promise.all(lavagemRules.map(async r=>{
    const file=String(r.imagem||'').trim();
    if(!file||ruleImageMap[file]) return;
    try{ ruleImageMap[file]=await loadCanvasImage(`${RULE_IMAGE_BASE}${encodeURIComponent(file)}`); }catch(_){ ruleImageMap[file]=null; }
  }));

  const blockHeight=g=>groupTitleH+tableHeadH+(g.items.length*rowH)+(rulesForGroup(g).length?(ruleHeadH+rulesForGroup(g).length*ruleRowH+8):0)+groupGap;
  const columns=[[],[],[]];
  const heights=[0,0,0];

  // Largest-first bin packing keeps the final image short and balanced.
  [...groups]
    .sort((a,b)=>blockHeight(b)-blockHeight(a))
    .forEach(g=>{
      const idx=heights.indexOf(Math.min(...heights));
      columns[idx].push(g);
      heights[idx]+=blockHeight(g);
    });

  const contentH=Math.max(...heights);
  const H=Math.ceil(headerH+contentH+footerH+margin);
  const canvas=document.createElement('canvas');
  canvas.width=W;canvas.height=H;
  const ctx=canvas.getContext('2d');

  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#08060c');
  bg.addColorStop(.58,'#100818');
  bg.addColorStop(1,'#07060a');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  // Subtle purple branding shapes, like the old official table.
  ctx.fillStyle='rgba(111,0,185,.14)';
  ctx.beginPath();ctx.arc(W-180,100,330,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(142,0,230,.07)';
  ctx.fillRect(0,headerH-12,W,12);

  let logo=null;
  try{logo=await loadCanvasImage('./assets/high_logo.png');}catch(_){}
  if(logo){
    const lh=108,lw=logo.width*(lh/logo.height);
    ctx.drawImage(logo,margin,20,lw,lh);
  }

  const titleX=logo?margin+185:margin;
  ctx.fillStyle='#f4f0f6';ctx.font='900 38px Arial, sans-serif';
  ctx.fillText('TABELA DE PREÇOS DO MERCADO NEGRO',titleX,59);
  ctx.fillStyle='#8f2cff';ctx.font='900 32px Arial, sans-serif';ctx.fillText('HIGH',titleX,101);
  ctx.fillStyle='#f4ec25';ctx.fillText('ROLEPLAY',titleX+91,101);

  ctx.textAlign='right';
  ctx.fillStyle='#d9cfdf';ctx.font='900 18px Arial, sans-serif';ctx.fillText(`${rows.length} ITENS ATIVOS`,W-margin,48);
  const d=new Date(data.meta?.atualizado_em);
  ctx.fillStyle='#9a8fa4';ctx.font='800 14px Arial, sans-serif';
  ctx.fillText(isNaN(d)?'ATUALIZAÇÃO NÃO INFORMADA':`ATUALIZADA EM ${d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}).toUpperCase()}`,W-margin,76);
  ctx.fillText('SEASON 2 • ATO 2',W-margin,102);
  ctx.textAlign='left';

  function drawGroup(group,x,y){
    roundedRect(ctx,x,y,colW,groupTitleH,4);
    ctx.fillStyle='#351448';ctx.fill();
    ctx.fillStyle='#6f00a8';ctx.fillRect(x,y,6,groupTitleH);
    ctx.fillStyle='#f4ec25';ctx.font='900 17px Arial, sans-serif';
    drawTextFit(ctx,String(group.name||'').toUpperCase(),x+14,y+25,colW-90,17,'900');
    ctx.textAlign='right';ctx.fillStyle='#d2c7d7';ctx.font='800 12px Arial, sans-serif';ctx.fillText(`${group.items.length} ITENS`,x+colW-12,y+24);ctx.textAlign='left';
    y+=groupTitleH;

    const itemX=x+padX;
    const pistaX=x+colW-14;
    const parceriaX=x+colW-132;
    ctx.fillStyle='#17111d';ctx.fillRect(x,y,colW,tableHeadH);
    ctx.fillStyle='#93879b';ctx.font='800 10px Arial, sans-serif';
    ctx.fillText('ITEM',itemX,y+16);
    ctx.textAlign='right';ctx.fillText('PARCERIA',parceriaX,y+16);ctx.fillText('PISTA',pistaX,y+16);ctx.textAlign='left';
    y+=tableHeadH;

    group.items.forEach((i,idx)=>{
      ctx.fillStyle=idx%2===0?'#0f0d12':'#141019';ctx.fillRect(x,y,colW,rowH);
      ctx.strokeStyle='rgba(132,109,145,.15)';ctx.beginPath();ctx.moveTo(x,y+rowH);ctx.lineTo(x+colW,y+rowH);ctx.stroke();
      ctx.fillStyle='#e9e4ed';
      drawTextFit(ctx,String(i.item||'').toUpperCase(),itemX,y+19,parceriaX-itemX-18,13,'700');
      ctx.textAlign='right';ctx.fillStyle='#d8d0de';ctx.font='800 12px Arial, sans-serif';ctx.fillText(money(i.parceria),parceriaX,y+19);
      ctx.fillStyle='#f4ec25';ctx.font='900 12px Arial, sans-serif';ctx.fillText(money(i.pista),pistaX,y+19);ctx.textAlign='left';
      y+=rowH;
    });

    const groupRules=rulesForGroup(group);
    if(groupRules.length){
      ctx.fillStyle='#17111d';ctx.fillRect(x,y,colW,ruleHeadH);
      ctx.fillStyle='#f4ec25';ctx.font='900 12px Arial, sans-serif';
      ctx.textAlign='center';ctx.fillText('LAVAGEM E SECAGEM DE DINHEIRO',x+colW/2,y+17);ctx.textAlign='left';
      y+=ruleHeadH;
      groupRules.forEach((r,idx)=>{
        ctx.fillStyle=idx%2===0?'#0d0b10':'#110d15';ctx.fillRect(x,y,colW,ruleRowH);
        ctx.strokeStyle='rgba(244,236,37,.16)';ctx.beginPath();ctx.moveTo(x+10,y);ctx.lineTo(x+colW-10,y);ctx.stroke();
        const file=String(r.imagem||'').trim();
        const ri=file?ruleImageMap[file]:null;
        let tx=x+12;
        let tw=colW-24;
        if(ri){
          const box=44;
          const ratio=Math.min(box/ri.width,box/ri.height);
          const rw=ri.width*ratio,rh=ri.height*ratio;
          ctx.drawImage(ri,x+10+(box-rw)/2,y+9+(box-rh)/2,rw,rh);
          tx=x+64;tw=colW-76;
        }
        const grupo=String(r.grupo||'').trim().toUpperCase();
        const title=(grupo?grupo+' • ':'')+String(r.tipo||r.titulo||'').toUpperCase();
        ctx.fillStyle='#f4ec25';ctx.font='900 10px Arial, sans-serif';ctx.textAlign='left';
        drawTextFit(ctx,title,tx,y+22,tw,10,'900','left');
        ctx.fillStyle='#ece7ef';ctx.font='800 9px Arial, sans-serif';
        drawTextFit(ctx,String(r.texto||'').toUpperCase(),tx,y+43,tw,9,'800','left');
        y+=ruleRowH;
      });
      y+=8;
    }
    return y+groupGap;
  }

  const startY=headerH;
  columns.forEach((col,ci)=>{
    let y=startY;
    const x=margin+ci*(colW+colGap);
    col.forEach(g=>{y=drawGroup(g,x,y);});
  });

  ctx.fillStyle='#0c0910';ctx.fillRect(0,H-footerH,W,footerH);
  ctx.fillStyle='#f4ec25';ctx.font='800 10px Arial, sans-serif';
  ctx.fillText('HIGH ROLEPLAY • PREÇOS REFERENTES EXCLUSIVAMENTE À ECONOMIA FICTÍCIA DO SERVIDOR / FIVEM',margin,H-17);
  ctx.textAlign='right';ctx.fillStyle='#6d6373';ctx.fillText('GERADO AUTOMATICAMENTE PELO CATÁLOGO OFICIAL',W-margin,H-17);ctx.textAlign='left';

  const blob=await canvasBlob(canvas);
  const url=URL.createObjectURL(blob);
  const fileName=`mercado-negro-high-${new Date().toISOString().slice(0,10)}.png`;
  showDiscordImagePreview(url,blob,fileName);
}
