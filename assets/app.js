const CATALOG_URL = './data/catalogo.json';
const ITEM_IMAGE_BASE = './assets/itens/';
const RULE_IMAGE_BASES = ['./assets/itens/','./assets/'];
/* Divisão do valor que SAI da lavagem (já limpo): 75% cliente, 25% serviço. */
const DIVISOES = {
  'lavagem':{titulo:'LAVAGEM DE DINHEIRO',img:'dirtydollar.png',cliente:75,servico:25,servicoNome:'LAVAGEM'},
  'desmanche':{titulo:'DESMANCHE',img:'dismantle.png',cliente:75,servico:25,servicoNome:'DESMANCHE'}
};
function divisaoCalc(d,v){
  const serv=Math.round(v*d.servico/100);
  return {serv,cli:v-serv};
}
function divisaoExplica(d){
  const nome=d.servicoNome==='LAVAGEM'?'a lavagem':'o desmanche';
  return `O valor que sai da lavagem é dividido: ${d.cliente}% para o cliente e ${d.servico}% para ${nome}.`;
}
function divisaoMarkup(slug){
  const d=DIVISOES[slug]; if(!d) return '';
  return `<section class="split-card"><div class="split-head"><img src="${ITEM_IMAGE_BASE}${encodeURIComponent(d.img)}" alt="" loading="lazy" onerror="this.style.display='none'"><div><span>COMO FUNCIONA A DIVISÃO</span><strong>${esc(d.titulo)}</strong><p>${esc(divisaoExplica(d))}</p></div></div>
  <div class="split-bar" role="img" aria-label="Cliente ${d.cliente}%, ${esc(d.servicoNome)} ${d.servico}%"><div class="split-cliente" style="width:${d.cliente}%"><b>${d.cliente}%</b><small>CLIENTE</small></div><div class="split-servico" style="width:${d.servico}%"><b>${d.servico}%</b><small>${esc(d.servicoNome)}</small></div></div>
  ${(()=>{const c=divisaoCalc(d,100000);return `<div class="split-example"><span>EXEMPLO</span><em>SAIU ${money(100000)} DA LAVAGEM</em><i>→</i><em class="is-cliente">CLIENTE RECEBE ${money(c.cli)}</em><em class="is-servico">${esc(d.servicoNome)} FICA COM ${money(c.serv)}</em></div>`})()}</section>`;
}

const icons = {
  'armas':'🔫','municao':'💥','tecnologia-utilitarios':'💻','drogas':'🧪','drogas-rotas':'🧪',
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
  'drogas': {image:'packdrug1.png', image2:'mapabairro1.png', desc:'Drogas, insumos e itens ligados às rotas ilegais.'},
  'drogas-rotas': {image:'packdrug1.png', image2:'mapabairro1.png', desc:'Drogas, insumos e itens ligados às rotas ilegais.'},
  'lavagem': {image:'pendrive5.png', image2:'alcoolemgel.png', desc:'Ferramentas e itens utilizados na lavagem de dinheiro.'},
  'desmanche': {image:'blocksignal.png', image2:'lockpickplus.png', desc:'Peças, bloqueadores e itens para desmanche de veículos.'},
  'falsificacao': {image:'cartaoclonado2.png', image2:'dollarfake.png', desc:'Documentos, cartões e itens de falsificação.'},
  'hospital-ilegal': {image:'adrenalineclandestineplus.png', image2:'infectedbandage.png', desc:'Itens médicos de uso clandestino e suporte ilegal.'},
  'contrabando': {image:'attachbox.png', desc:'Itens raros, cargas e mercadorias de contrabando.'},
  'mecanica': {image:'Nitro+.png', image2:'Aerofolio_Esportivo.png', desc:'Performance, preparação e equipamentos especiais.'},
  'mecanica-ilegal': {image:'Nitro+.png', image2:'Aerofolio_Esportivo.png', desc:'Performance, preparação e equipamentos especiais.'}
};


function ruleImageUrls(file){
  const safe=encodeURIComponent(String(file||'').trim());
  return RULE_IMAGE_BASES.map(base=>`${base}${safe}`);
}

function ruleImageMarkup(r){
  const file=String(r?.imagem||'').trim();
  if(!file) return '';
  const urls=ruleImageUrls(file);
  const primary=urls[0]||'';
  const fallback=urls[1]||'';
  return `<div class="rule-image"><img src="${primary}" data-fallback="${fallback}" alt="${esc(r.titulo||r.tipo)}" loading="lazy" onerror="if(this.dataset.fallback&&!this.dataset.fallbackTried){this.dataset.fallbackTried='1';this.src=this.dataset.fallback}else{this.parentElement.style.display='none'}"></div>`;
}

async function loadRuleCanvasImage(file){
  const urls=ruleImageUrls(file);
  for(const url of urls){
    try{return await loadCanvasImage(url);}catch(_){ }
  }
  return null;
}

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
  const data=await r.json();
  // Padroniza categorias (ex.: "laVAGEM " → "LAVAGEM") para não duplicar nem sair fora de ordem.
  (data.itens||[]).forEach(i=>{ if(i){ i.categoria=String(i.categoria||'').trim().toLocaleUpperCase('pt-BR'); delete i.observacao; } }); // observação da planilha é só da staff
  return data;
}

function updateMeta(data){
  document.querySelectorAll('[data-updated]').forEach(el=>{
    const d=new Date(data.meta?.atualizado_em);
    el.textContent=isNaN(d)?'Atualização não informada':`Atualizado em ${d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}`;
  });
  document.querySelectorAll('[data-total]').forEach(el=>el.textContent=(data.itens||[]).filter(isActive).length);
  initShared(data);
}

function imageMarkup(i){
  const file=String(i.imagem||'').trim();
  if(!file) return `<div class="item-image item-image-empty"><span>${iconFor(i.categoria)}</span></div>`;
  return `<div class="item-image"><img src="${ITEM_IMAGE_BASE}${encodeURIComponent(file)}" alt="${esc(i.item)}" loading="lazy" onerror="this.style.display='none';this.parentElement.classList.add('item-image-empty');this.parentElement.innerHTML='<span>${iconFor(i.categoria)}</span>'"></div>`;
}

function itemCard(i,showCategory=false){
  const st=statusInfo(i);
  return `<article class="item-card" data-highlight="${!!i.destaque}" data-status="${st?st.cls:'ativo'}">
    ${imageMarkup(i)}
    <div class="item-card-top">
      <span class="tag-inline">${showCategory?esc(i.categoria):(i.destaque?'DESTAQUE':'ATIVO')}</span>
      ${showCategory&&i.destaque?'<span class="tag-inline">DESTAQUE</span>':''}
      ${st?`<span class="status-badge ${st.cls}">${st.label}</span>`:''}
      ${trendBadge(i)}
    </div>
    <h3>${esc(i.item)}</h3>
    <div class="prices"><div class="price"><span>Parceria</span><strong>${money(i.parceria)}</strong></div><div class="price pista"><span>Pista</span><strong>${money(i.pista)}</strong></div></div>
    ${itemActions(i)}
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
    const categorias=[...new Set(active.map(i=>String(i.categoria||'').trim()).filter(Boolean))];
    const principais=new Set(['armas','municao','lavagem','desmanche','drogas','mecanica-ilegal','hospital-ilegal']);
    const cats=categorias.filter(c=>!principais.has(slugify(c)));
    const section=grid.closest('section');
    if(section) section.hidden=cats.length===0;
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
    document.querySelectorAll('[data-category-count-home]').forEach(el=>el.textContent=categorias.length);
  }

  const favBox=document.querySelector('#favoritesSection');
  if(favBox){
    const renderFavs=()=>{
      const favs=active.filter(i=>isFav(i));
      favBox.hidden=!favs.length;
      const grid=favBox.querySelector('#favorites');
      if(grid) grid.innerHTML=favs.map(i=>itemCard(i,true)).join('');
    };
    renderFavs();
    document.addEventListener('hmn:favs',renderFavs);
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
      const results=active.filter(i=>normalizeText(`${i.item} ${i.categoria}`).includes(term));
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
  const matched=active.find(i=>slugify(i.categoria)===slugify(raw))||(data.itens||[]).find(i=>i&&slugify(i.categoria)===slugify(raw));
  if(!matched){ renderCategoryNotFound(raw,active); return; }
  const cat=matched.categoria;
  const items=active.filter(i=>slugify(i.categoria)===slugify(cat));
  // A cada categoria, mostrar sua arte oficial da Season 3 no cabeçalho.
  const segmentArts={
    'armas':'banner-armas.webp',
    'municao':'banner-municao.webp',
    'lavagem':'banner-lavagem.webp',
    'desmanche':'banner-desmanche.webp',
    'drogas':'banner-drogas.webp',
    'mecanica-ilegal':'banner-mecanica-ilegal.webp',
    'hospital-ilegal':'banner-hospital-ilegal.webp'
  };
  const slugCat=slugify(cat);
  const banner=segmentArts[slugCat];
  if(banner){
    document.documentElement.style.setProperty('--s3-segment-image', 'url("'+new URL('assets/season3-cinematic/'+encodeURIComponent(banner),location.href).href+'")');
    document.body.dataset.segment=slugCat;
  }

  const favFirst=list=>[...list].sort((a,b)=>Number(isFav(b))-Number(isFav(a)));
  document.title=`${cat} • Mercado Negro High`;
  document.querySelector('#catIcon') && (document.querySelector('#catIcon').textContent=iconFor(cat));
  document.querySelector('#catName') && (document.querySelector('#catName').textContent=cat);
  document.querySelector('#catCount') && (document.querySelector('#catCount').textContent=`${items.length} ITENS ATIVOS`);
  document.querySelector('#s3CategoryTotal') && (document.querySelector('#s3CategoryTotal').textContent=items.length+' ITENS DISPONÍVEIS');
  document.querySelectorAll('.s3-v8-side-link[data-segment-link]').forEach(a=>{
    if(a.dataset.segmentLink===slugCat){a.classList.add('is-active');a.setAttribute('aria-current','page');}
  });

  const list=document.querySelector('#itemList'), search=document.querySelector('#categorySearch');
  const render=q=>{if(!list)return;const term=normalizeText(q);const filtered=favFirst(items.filter(i=>!term||normalizeText(`${i.item} ${i.categoria}`).includes(term)));list.innerHTML=filtered.length?filtered.map(i=>itemCard(i)).join(''):'<div class="empty">Nenhum item encontrado nesta categoria.</div>';};
  render(''); search?.addEventListener('input',e=>render(e.target.value));
  document.addEventListener('hmn:favs',()=>render(search?.value||''));
  renderComingSoon((data.itens||[]).filter(i=>i&&!isActive(i)&&slugify(i.categoria)===slugify(cat)),list);
  const rules=document.querySelector('#rules');
  const divSlug=slugify(cat);
  if(rules&&DIVISOES[divSlug]){
    rules.innerHTML=divisaoMarkup(divSlug)+divisaoCalculatorMarkup(divSlug);
    initDivisaoCalculator(divSlug);
  }
}


/* ── Segmento inexistente: avisa em vez de abrir outro segmento sem explicar ── */
function renderCategoryNotFound(raw,active){
  const cats=[...new Map(active.map(i=>[slugify(i.categoria),i.categoria])).entries()];
  document.title='Segmento não encontrado • Mercado Negro High';
  const set=(sel,txt)=>{const el=document.querySelector(sel); if(el) el.textContent=txt;};
  set('#catName','NÃO ENCONTRADO'); set('#catIcon','⚠'); set('#catCount','0 ITENS'); set('#s3CategoryTotal','—');
  const tb=document.querySelector('.category-hero .toolbar'); if(tb) tb.style.display='none';
  const list=document.querySelector('#itemList');
  if(list) list.outerHTML=`<div class="s3-notfound"><strong>Segmento ${raw?`“${esc(raw)}” `:''}não encontrado</strong><p>O link pode estar errado ou o segmento foi removido nesta temporada. Escolha um dos segmentos abaixo:</p><div class="s3-notfound-links">${cats.map(([slug,c])=>`<a href="categoria.html?c=${slug}">${iconFor(c)} ${esc(c)}</a>`).join('')}<a href="tabela.html">▤ TABELA GERAL</a></div></div>`;
}

/* ── Em breve: itens inativos do segmento, sem preço ── */
function renderComingSoon(items,anchor){
  document.querySelector('#s3ComingSoon')?.remove();
  if(!items.length||!anchor) return;
  const sorted=[...items].sort((a,b)=>Number(a.ordem||0)-Number(b.ordem||0));
  const box=document.createElement('section');
  box.id='s3ComingSoon'; box.className='s3-coming-soon';
  box.innerHTML=`<div class="s3-v8-section-row"><div><span class="s3-v8-micro">◆ PRÓXIMAS LIBERAÇÕES</span><h2>EM <em>BREVE</em></h2></div><span class="s3-v8-section-count">${sorted.length} ${sorted.length===1?'ITEM':'ITENS'} EM PREPARAÇÃO</span></div>
  <p class="s3-coming-note">Itens previstos para este segmento. Valores serão divulgados quando forem liberados.</p>
  <div class="s3-coming-grid">${sorted.map(i=>`<article class="s3-coming-card">${imageMarkup(i)}<div class="s3-coming-copy"><span class="s3-coming-tag">EM BREVE</span><h3>${esc(i.item)}</h3></div></article>`).join('')}</div>`;
  anchor.insertAdjacentElement('afterend',box);
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
  // Season 3: vitrine e tabela são duas visualizações dos mesmos itens.
  const gallery=document.querySelector('#tableGallery');
  const viewButtons=[...document.querySelectorAll('[data-v8-view]')];
  const STORE_VIEW='hmn_view_v1';
  const setMode=mode=>{
    mode=mode==='table'?'table':'gallery';
    document.body.dataset.v8Mode=mode;
    viewButtons.forEach(x=>{
      const active=(x.dataset.v8View==='table'?'table':'gallery')===mode;
      x.classList.toggle('active',active);
      x.setAttribute('aria-pressed',active?'true':'false');
    });
    store.set(STORE_VIEW,mode);
  };
  if(gallery){
    setMode(store.get(STORE_VIEW,'gallery'));
    viewButtons.forEach(btn=>btn.addEventListener('click',()=>{setMode(btn.dataset.v8View);render();}));
  }


  const params=new URLSearchParams(location.search);
  let selected='TODOS';
  let query=params.get('q')||'';
  let sortKey='ordem';
  let sortDir='asc';

  const categories=[...new Map(active.filter(i=>String(i.categoria||'').trim()).map(i=>[slugify(i.categoria),String(i.categoria).trim()])).values()];
  const paramCat=params.get('c');
  if(params.get('fav')) selected=FAV_FILTER;
  else if(paramCat){const m=categories.find(c=>slugify(c)===slugify(paramCat)); if(m) selected=m;}
  if(search&&query) search.value=query;
  if(filters){
    filters.innerHTML=categoryChip('TODOS',selected==='TODOS')+categoryChip(FAV_FILTER,selected===FAV_FILTER)+categories.map(c=>categoryChip(c,c===selected)).join('');
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
    let rows=active.filter(i=>selected==='TODOS'||(selected===FAV_FILTER?isFav(i):slugify(i.categoria)===slugify(selected)));
    if(term) rows=rows.filter(i=>normalizeText(`${i.item} ${i.categoria}`).includes(term));
    rows=[...rows].sort((a,b)=>compare(a,b,sortKey)*(sortDir==='asc'?1:-1));
    return rows;
  };

  const tableRow=(i)=>{
    const diff=Math.max(0,Number(i.pista||0)-Number(i.parceria||0));
    const st=statusInfo(i);
    return `<tr data-status="${st?st.cls:'ativo'}">
      <td class="col-img">${tableImageMarkup(i)}</td>
      <td class="col-item"><div class="table-item-name">${esc(i.item)}${st?` <span class="status-badge ${st.cls}">${st.label}</span>`:''} ${trendBadge(i)}</div>${itemActions(i,true)}</td>
      <td><a class="category-link" href="categoria.html?c=${slugify(i.categoria)}">${esc(i.categoria)}</a></td>
      <td class="money-cell partnership">${money(i.parceria)}</td>
      <td class="money-cell track"><strong>${money(i.pista)}</strong>${diff?`<small>+ ${money(diff)} vs parceria</small>`:''}</td>
    </tr>`;
  };

  const mobileCard=(i)=>{
    const diff=Math.max(0,Number(i.pista||0)-Number(i.parceria||0));
    const st=statusInfo(i);
    return `<article class="table-mobile-card" data-status="${st?st.cls:'ativo'}">
      ${tableImageMarkup(i)}
      <div class="table-mobile-copy">
        <a class="table-mobile-category" href="categoria.html?c=${slugify(i.categoria)}">${esc(i.categoria)}</a>
        <h3>${esc(i.item)}${st?` <span class="status-badge ${st.cls}">${st.label}</span>`:''} ${trendBadge(i)}</h3>
        <div class="table-mobile-prices"><div><span>Parceria</span><strong>${money(i.parceria)}</strong></div><div><span>Pista</span><strong>${money(i.pista)}</strong>${diff?`<small>+ ${money(diff)}</small>`:''}</div></div>
        ${itemActions(i,true)}
      </div>
    </article>`;
  };

  const render=()=>{
    const rows=getRows();
    if(count) count.textContent=`${rows.length} ${rows.length===1?'ITEM':'ITENS'}`;
    // Monta só a visualização em uso (vitrine ou lista) para a busca ficar mais leve.
    const listMode=!gallery||document.body.dataset.v8Mode==='table';
    if(body) body.innerHTML=!listMode?'':rows.length?rows.map(tableRow).join(''):`<tr><td colspan="5"><div class="empty">Nenhum item encontrado.</div></td></tr>`;
    if(mobileList) mobileList.innerHTML=!listMode?'':rows.length?rows.map(mobileCard).join(''):`<div class="empty">Nenhum item encontrado.</div>`;
    if(gallery) gallery.innerHTML=listMode?'':rows.length?rows.map(i=>itemCard(i,true)).join(''):'<div class="empty">Nenhum item encontrado.</div>';

    sortButtons.forEach(btn=>{
      const activeSort=btn.dataset.sort===sortKey;
      btn.classList.toggle('active',activeSort);
      const mark=btn.querySelector('.sort-mark');
      if(mark) mark.textContent=activeSort?(sortDir==='asc'?'↑':'↓'):'↕';
    });
  };

  search?.addEventListener('input',e=>{query=e.target.value;render();});
  document.addEventListener('hmn:favs',()=>{if(selected===FAV_FILTER)render();});
  sortButtons.forEach(btn=>btn.addEventListener('click',()=>{
    const key=btn.dataset.sort;
    if(sortKey===key) sortDir=sortDir==='asc'?'desc':'asc'; else {sortKey=key;sortDir='asc';}
    render();
  }));
  reset?.addEventListener('click',()=>{
    selected='TODOS';query='';sortKey='ordem';sortDir='asc';
    history.replaceState(null,'',location.pathname);
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
  const rowH=38;
  const thumb=30;
  const groupGap=12;
  const padX=12;
  const lavagemRules=Array.isArray(data?.regras?.lavagem)?data.regras.lavagem:[];
  const ruleRowH=62;
  const ruleHeadH=25;
  const rulesForGroup=()=>[]; // percentuais agora vão no quadro de divisão abaixo
  const splitH=160;
  const splitFor=g=>DIVISOES[slugify(g.name)]||null;

  // Fotos dos itens (mesmas do site) e ícones das divisões.
  const itemImageMap={};
  await Promise.all([...rows.map(i=>String(i.imagem||'').trim()),...Object.values(DIVISOES).map(d=>d.img)].map(async file=>{
    if(!file||file in itemImageMap) return;
    itemImageMap[file]=null;
    try{itemImageMap[file]=await loadCanvasImage(ITEM_IMAGE_BASE+encodeURIComponent(file));}catch(_){}
  }));

  const ruleImageMap={};
  await Promise.all(lavagemRules.map(async r=>{
    const file=String(r.imagem||'').trim();
    if(!file||ruleImageMap[file]) return;
    ruleImageMap[file]=await loadRuleCanvasImage(file);
  }));

  const blockHeight=g=>groupTitleH+tableHeadH+(g.items.length*rowH)+(splitFor(g)?splitH+8:0)+groupGap;
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

  // Season 3: arte nativa no canvas para exportação PNG sem dependência de imagens externas.
  const bg=ctx.createLinearGradient(0,0,W,H);
  bg.addColorStop(0,'#080d0c');
  bg.addColorStop(.56,'#121d18');
  bg.addColorStop(1,'#070b0b');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // Parede grafitada escura do QG — blocos discretos e luz verde da mesa.
  for(let yy=0;yy<Math.min(H,980);yy+=48){
    for(let xx=0;xx<W;xx+=128){
      const offset=(Math.floor(yy/48)%2)*64;
      ctx.strokeStyle='rgba(101,132,110,.085)';
      ctx.strokeRect(xx+offset,yy,126,46);
    }
  }
  const greenGlow=ctx.createRadialGradient(W*.78,70,14,W*.78,70,590);
  greenGlow.addColorStop(0,'rgba(160,240,64,.21)');
  greenGlow.addColorStop(1,'rgba(160,240,64,0)');
  ctx.fillStyle=greenGlow;ctx.fillRect(0,0,W,790);
  const pinkGlow=ctx.createRadialGradient(60,60,10,60,60,420);
  pinkGlow.addColorStop(0,'rgba(240,64,208,.09)');
  pinkGlow.addColorStop(1,'rgba(240,64,208,0)');
  ctx.fillStyle=pinkGlow;ctx.fillRect(0,0,520,500);
  ctx.fillStyle='rgba(160,240,64,.07)';
  ctx.fillRect(0,headerH-14,W,14);
  ctx.fillStyle='#a0f040';ctx.fillRect(0,headerH-3,W,3);
  ctx.fillStyle='#f040d0';ctx.fillRect(0,headerH-3,105,3);

  let logo=null;
  try{logo=await loadCanvasImage('./assets/high_logo.png');}catch(_){}
  if(logo){
    const lh=108,lw=logo.width*(lh/logo.height);
    ctx.drawImage(logo,margin,20,lw,lh);
  }

  const titleX=logo?margin+185:margin;
  ctx.fillStyle='#f4f0f6';ctx.font='900 38px Arial, sans-serif';
  ctx.fillText('MERCADO NEGRO • TABELA OFICIAL',titleX,59);
  ctx.fillStyle='#a0f040';ctx.font='900 32px Arial, sans-serif';ctx.fillText('HIGH',titleX,101);
  ctx.fillStyle='#f040d0';ctx.fillText('ILEGAL',titleX+91,101);

  ctx.textAlign='right';
  ctx.fillStyle='#d5e7d1';ctx.font='900 18px Arial, sans-serif';ctx.fillText(`${rows.length} ITENS ATIVOS`,W-margin,48);
  const d=new Date(data.meta?.atualizado_em);
  ctx.fillStyle='#9daf9c';ctx.font='800 14px Arial, sans-serif';
  ctx.fillText(isNaN(d)?'ATUALIZAÇÃO NÃO INFORMADA':`ATUALIZADA EM ${d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}).toUpperCase()}`,W-margin,76);
  ctx.fillText('HIGH ILEGAL • SEASON 3',W-margin,102);
  ctx.textAlign='left';

  function drawGroup(group,x,y){
    roundedRect(ctx,x,y,colW,groupTitleH,4);
    ctx.fillStyle='#213126';ctx.fill();
    ctx.fillStyle='#a0f040';ctx.fillRect(x,y,6,groupTitleH);
    ctx.fillStyle='#a0f040';ctx.font='900 17px Arial, sans-serif';
    drawTextFit(ctx,String(group.name||'').toUpperCase(),x+14,y+25,colW-90,17,'900');
    ctx.textAlign='right';ctx.fillStyle='#cde0c3';ctx.font='800 12px Arial, sans-serif';ctx.fillText(`${group.items.length} ITENS`,x+colW-12,y+24);ctx.textAlign='left';
    y+=groupTitleH;

    const itemX=x+padX+thumb+10;
    const pistaX=x+colW-14;
    const parceriaX=x+colW-132;
    ctx.fillStyle='#1c2921';ctx.fillRect(x,y,colW,tableHeadH);
    ctx.fillStyle='#9dad9c';ctx.font='800 10px Arial, sans-serif';
    ctx.fillText('ITEM',itemX,y+16);
    ctx.textAlign='right';ctx.fillText('PARCERIA',parceriaX,y+16);ctx.fillText('PISTA',pistaX,y+16);ctx.textAlign='left';
    y+=tableHeadH;

    group.items.forEach((i,idx)=>{
      ctx.fillStyle=idx%2===0?'#101a15':'#18251d';ctx.fillRect(x,y,colW,rowH);
      ctx.strokeStyle='rgba(160,240,64,.12)';ctx.beginPath();ctx.moveTo(x,y+rowH);ctx.lineTo(x+colW,y+rowH);ctx.stroke();
      const tx0=x+padX,ty0=y+(rowH-thumb)/2;
      roundedRect(ctx,tx0,ty0,thumb,thumb,5);ctx.fillStyle='#2a3a2e';ctx.fill();
      ctx.strokeStyle='rgba(160,240,64,.22)';ctx.stroke();
      const im=itemImageMap[String(i.imagem||'').trim()];
      if(im){const r=Math.min((thumb-4)/im.width,(thumb-4)/im.height),iw=im.width*r,ih=im.height*r;ctx.drawImage(im,tx0+(thumb-iw)/2,ty0+(thumb-ih)/2,iw,ih);}
      const ty=y+rowH/2+5;
      ctx.fillStyle='#eaf3e8';
      drawTextFit(ctx,String(i.item||'').toUpperCase(),itemX,ty,parceriaX-itemX-70,13,'700');
      ctx.textAlign='right';ctx.fillStyle='#d6e7d2';ctx.font='800 12px Arial, sans-serif';ctx.fillText(money(i.parceria),parceriaX,ty);
      ctx.fillStyle='#a0f040';ctx.font='900 12px Arial, sans-serif';ctx.fillText(money(i.pista),pistaX,ty);ctx.textAlign='left';
      y+=rowH;
    });

    const sp=splitFor(group);
    if(sp){
      y+=8;
      roundedRect(ctx,x,y,colW,splitH,6);ctx.fillStyle='#0d1611';ctx.fill();ctx.strokeStyle='rgba(160,240,64,.35)';ctx.stroke();
      const ic=itemImageMap[sp.img];
      if(ic){const r=Math.min(46/ic.width,46/ic.height);ctx.drawImage(ic,x+12+(46-ic.width*r)/2,y+10+(46-ic.height*r)/2,ic.width*r,ic.height*r);}
      ctx.fillStyle='#9daf9c';ctx.font='900 9px Arial, sans-serif';ctx.fillText('COMO FUNCIONA A DIVISÃO',x+68,y+22);
      ctx.fillStyle='#f4f0f6';drawTextFit(ctx,sp.titulo,x+68,y+41,colW-80,16,'900');
      ctx.fillStyle='#c9d8c6';drawTextFit(ctx,'O VALOR QUE SAI DA LAVAGEM É DIVIDIDO ASSIM:',x+68,y+57,colW-80,10,'800');
      const bx=x+12,by=y+70,bw=colW-24,bh=40,cw=bw*sp.cliente/100;
      roundedRect(ctx,bx,by,bw,bh,5);ctx.fillStyle='#f040d0';ctx.fill();
      ctx.save();roundedRect(ctx,bx,by,bw,bh,5);ctx.clip();ctx.fillStyle='#a0f040';ctx.fillRect(bx,by,cw,bh);ctx.restore();
      ctx.fillStyle='#08120a';ctx.font='900 18px Arial, sans-serif';ctx.fillText(sp.cliente+'%',bx+12,by+26);
      ctx.font='900 11px Arial, sans-serif';ctx.fillText('FICA COM O CLIENTE',bx+60,by+25);
      ctx.textAlign='center';ctx.fillStyle='#ffffff';ctx.font='900 16px Arial, sans-serif';ctx.fillText(sp.servico+'%',bx+cw+(bw-cw)/2,by+19);
      ctx.font='900 8px Arial, sans-serif';ctx.fillText(sp.servicoNome,bx+cw+(bw-cw)/2,by+32);ctx.textAlign='left';
      const ex=divisaoCalc(sp,100000);
      ctx.fillStyle='#9daf9c';ctx.font='900 9px Arial, sans-serif';ctx.fillText('EXEMPLO:',x+12,y+130);
      ctx.fillStyle='#eaf3e8';drawTextFit(ctx,`SAIU ${money(100000)} DA LAVAGEM`,x+64,y+130,colW-76,10,'800');
      ctx.fillStyle='#a0f040';drawTextFit(ctx,`CLIENTE RECEBE ${money(ex.cli)}`,x+12,y+148,colW/2,11,'900');
      ctx.textAlign='right';ctx.fillStyle='#ff7be6';drawTextFit(ctx,`${sp.servicoNome} FICA COM ${money(ex.serv)}`,x+colW-12,y+148,colW/2-10,11,'900','right');ctx.textAlign='left';
      y+=splitH;
    }
    const groupRules=rulesForGroup(group);
    if(groupRules.length){
      ctx.fillStyle='#1c2921';ctx.fillRect(x,y,colW,ruleHeadH);
      ctx.fillStyle='#a0f040';ctx.font='900 12px Arial, sans-serif';
      ctx.textAlign='center';ctx.fillText('LAVAGEM E SECAGEM DE DINHEIRO',x+colW/2,y+17);ctx.textAlign='left';
      y+=ruleHeadH;
      groupRules.forEach((r,idx)=>{
        ctx.fillStyle=idx%2===0?'#101a15':'#152119';ctx.fillRect(x,y,colW,ruleRowH);
        ctx.strokeStyle='rgba(160,240,64,.19)';ctx.beginPath();ctx.moveTo(x+10,y);ctx.lineTo(x+colW-10,y);ctx.stroke();
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
        ctx.fillStyle='#a0f040';ctx.font='900 10px Arial, sans-serif';ctx.textAlign='left';
        drawTextFit(ctx,title,tx,y+22,tw,10,'900','left');
        ctx.fillStyle='#eaf3e8';ctx.font='800 9px Arial, sans-serif';
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

  ctx.fillStyle='#0a120e';ctx.fillRect(0,H-footerH,W,footerH);
  ctx.fillStyle='#a0f040';ctx.font='800 10px Arial, sans-serif';
  ctx.fillText('HIGH ILEGAL • SEASON 3 • ECONOMIA FICTÍCIA DO SERVIDOR / FIVEM',margin,H-17);
  ctx.textAlign='right';ctx.fillStyle='#85998a';ctx.fillText('GERADO AUTOMATICAMENTE PELO CATÁLOGO OFICIAL',W-margin,H-17);ctx.textAlign='left';

  const blob=await canvasBlob(canvas);
  const url=URL.createObjectURL(blob);
  const fileName=`mercado-negro-high-season3-${new Date().toISOString().slice(0,10)}.png`;
  showDiscordImagePreview(url,blob,fileName);
}

/* ═════════════════════ RECURSOS COMPARTILHADOS ═════════════════════
   Favoritos, orçamento, link direto, status, faixa de aviso,
   calculadora de lavagem e instalação no celular.                    */

const FAV_FILTER='★ FAVORITOS';
const STORE_FAVS='hmn_favs_v1';
const STORE_CART='hmn_cart_v1';
const itemKey=i=>slugify(`${i.categoria}-${i.item}`);
let CATALOG_DATA=null;

const store={
  get(k,fallback){try{const v=JSON.parse(localStorage.getItem(k));return v??fallback;}catch(_){return fallback;}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(_){}}
};

/* ── Status ── */
function statusInfo(i){
  const s=normalizeText(i?.status||'ativo');
  if(s==='revisar') return {cls:'revisar',label:'EM REVISÃO'};
  if(s==='indisponivel') return {cls:'indisponivel',label:'INDISPONÍVEL'};
  return null;
}
const isUnavailable=i=>normalizeText(i?.status||'')==='indisponivel';

/* ── Selo de variação (SUBIU / CAIU / NOVO) — some depois de 15 dias ── */
const TREND_DAYS=15;
function priceTrend(i){
  const v=i?.variacao; if(!v?.em) return null;
  const d=new Date(v.em); if(isNaN(d)||Date.now()-d>TREND_DAYS*864e5) return null;
  if(v.novo) return {cls:'novo',label:'NOVO',title:`Adicionado em ${d.toLocaleDateString('pt-BR')}`};
  // Sem preço anterior válido (importação inicial com R$ 0) não é variação real.
  if(!(Number(v.parceria_antes)>0&&Number(v.pista_antes)>0)) return null;
  const dp=Number(i.pista)-Number(v.pista_antes), dc=Number(i.parceria)-Number(v.parceria_antes);
  const dir=dp||dc; if(!dir) return null;
  const title=`Antes: parceria ${money(v.parceria_antes)} • pista ${money(v.pista_antes)} (alterado em ${d.toLocaleDateString('pt-BR')})`;
  return dir>0?{cls:'subiu',label:'▲ SUBIU',title}:{cls:'caiu',label:'▼ CAIU',title};
}
function trendBadge(i){
  const t=priceTrend(i);
  return t?`<span class="trend-badge ${t.cls}" title="${esc(t.title)}">${t.label}</span>`:'';
}

/* ── Favoritos ── */
const getFavs=()=>new Set(store.get(STORE_FAVS,[]));
const isFav=i=>getFavs().has(itemKey(i));
function toggleFav(key){
  const f=getFavs(); f.has(key)?f.delete(key):f.add(key);
  store.set(STORE_FAVS,[...f]);
  document.querySelectorAll(`[data-fav="${key}"]`).forEach(b=>{b.classList.toggle('on',f.has(key));b.textContent=f.has(key)?'★':'☆';b.title=f.has(key)?'Remover dos favoritos':'Favoritar';});
  document.dispatchEvent(new CustomEvent('hmn:favs'));
  return f.has(key);
}

/* ── Botões de ação de cada item ── */
function itemActions(i,compact=false){
  const k=itemKey(i), fav=isFav(i), off=isUnavailable(i);
  return `<div class="item-actions${compact?' compact':''}">
    <button type="button" class="ia-btn ia-fav${fav?' on':''}" data-fav="${k}" title="${fav?'Remover dos favoritos':'Favoritar'}" aria-label="Favoritar ${esc(i.item)}">${fav?'★':'☆'}</button>
    <button type="button" class="ia-btn ia-add" data-cart-add="${k}" ${off?'disabled title="Item indisponível no momento"':'title="Adicionar ao orçamento"'}>＋ ORÇAMENTO</button>
    <button type="button" class="ia-btn ia-link" data-share="${k}" title="Copiar link direto deste item" aria-label="Copiar link de ${esc(i.item)}">🔗</button>
  </div>`;
}

/* ── Utilidades de UI ── */
function toast(msg){
  let t=document.querySelector('#hmnToast');
  if(!t){t=document.createElement('div');t.id='hmnToast';t.className='hmn-toast';t.setAttribute('role','status');document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('show');
  clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2200);
}
async function copyText(text){
  try{await navigator.clipboard.writeText(text);return true;}catch(_){}
  try{
    const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');ta.remove();return ok;
  }catch(_){return false;}
}
const siteBase=()=>location.href.replace(/[^/]*([?#].*)?$/,'');
const findItem=key=>(CATALOG_DATA?.itens||[]).filter(isActive).find(i=>itemKey(i)===key);
const itemLink=i=>`${siteBase()}tabela.html?q=${encodeURIComponent(i.item)}&c=${slugify(i.categoria)}`;

/* ── Orçamento ── */
const getCart=()=>store.get(STORE_CART,{items:{},modo:'pista'});
const saveCart=c=>{store.set(STORE_CART,c);renderCart();};
function cartLines(){
  const c=getCart();
  return Object.entries(c.items||{}).map(([k,q])=>({item:findItem(k),key:k,qtd:Number(q)||0})).filter(l=>l.item&&l.qtd>0);
}
function addToCart(key,n=1){
  const c=getCart(); c.items=c.items||{};
  c.items[key]=Math.max(0,(Number(c.items[key])||0)+n);
  if(!c.items[key]) delete c.items[key];
  saveCart(c);
}
function cartText(){
  const c=getCart(), lines=cartLines(), modo=c.modo==='parceria'?'parceria':'pista';
  const total=lines.reduce((s,l)=>s+l.qtd*Number(l.item[modo]||0),0);
  const d=new Date(CATALOG_DATA?.meta?.atualizado_em);
  return [
    `**ORÇAMENTO • MERCADO NEGRO HIGH**`,
    `Valor: **${modo.toUpperCase()}**`,
    ``,
    ...lines.map(l=>`• ${l.qtd}x ${l.item.item} — ${money(l.qtd*Number(l.item[modo]||0))}${l.qtd>1?` (${money(l.item[modo])} cada)`:''}`),
    ``,
    `**TOTAL: ${money(total)}**`,
    isNaN(d)?'':`Tabela de ${d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})} • ${siteBase()}tabela.html`
  ].filter((l,i,a)=>!(l===''&&a[i-1]==='')).join('\n').trim();
}
function ensureCartUI(){
  if(document.querySelector('#cartFab')) return;
  document.body.insertAdjacentHTML('beforeend',`
    <button type="button" id="cartFab" class="cart-fab" hidden aria-controls="cartDrawer">🧾 ORÇAMENTO <b id="cartCount">0</b></button>
    <div id="cartBackdrop" class="cart-backdrop" hidden></div>
    <aside id="cartDrawer" class="cart-drawer" aria-hidden="true" aria-label="Orçamento">
      <div class="cart-head"><div><span class="eyebrow">MONTE SEU PEDIDO</span><strong>ORÇAMENTO</strong></div><button type="button" class="cart-close" data-cart-close aria-label="Fechar">×</button></div>
      <div class="cart-mode" role="group" aria-label="Tipo de valor">
        <button type="button" data-cart-mode="parceria">PARCERIA</button>
        <button type="button" data-cart-mode="pista">PISTA</button>
      </div>
      <div id="cartList" class="cart-list"></div>
      <div class="cart-total"><span>TOTAL</span><strong id="cartTotal">R$ 0</strong></div>
      <div class="cart-actions">
        <button type="button" class="cart-copy" data-cart-copy>COPIAR PARA O DISCORD</button>
        <button type="button" class="cart-clear" data-cart-clear>LIMPAR</button>
      </div>
      <p class="cart-hint">Valores de referência da tabela oficial. O texto copiado já vem formatado para colar no Discord.</p>
    </aside>`);
}
function openCart(open){
  const d=document.querySelector('#cartDrawer'), b=document.querySelector('#cartBackdrop');
  if(!d) return;
  d.classList.toggle('open',open); d.setAttribute('aria-hidden',String(!open)); b.hidden=!open;
}
function renderCart(){
  ensureCartUI();
  const c=getCart(), lines=cartLines(), modo=c.modo==='parceria'?'parceria':'pista';
  const qtd=lines.reduce((s,l)=>s+l.qtd,0);
  const fab=document.querySelector('#cartFab');
  fab.hidden=!qtd; document.querySelector('#cartCount').textContent=qtd;
  document.querySelectorAll('[data-cart-mode]').forEach(b=>b.classList.toggle('active',b.dataset.cartMode===modo));
  document.querySelector('#cartList').innerHTML=lines.length?lines.map(l=>`
    <div class="cart-line">
      <div class="cart-line-name"><strong>${esc(l.item.item)}</strong><small>${esc(l.item.categoria)} • ${money(l.item[modo])} cada</small></div>
      <div class="cart-qty"><button type="button" data-cart-dec="${l.key}" aria-label="Diminuir">−</button><span>${l.qtd}</span><button type="button" data-cart-inc="${l.key}" aria-label="Aumentar">+</button></div>
      <strong class="cart-line-total">${money(l.qtd*Number(l.item[modo]||0))}</strong>
    </div>`).join(''):'<div class="empty">Seu orçamento está vazio. Use “＋ ORÇAMENTO” nos itens.</div>';
  document.querySelector('#cartTotal').textContent=money(lines.reduce((s,l)=>s+l.qtd*Number(l.item[modo]||0),0));
  if(!qtd) openCart(false);
}

/* ── Faixa de aviso (célula AVISO da aba Config) ── */
function renderSiteAlert(data){
  const txt=String(data?.meta?.alerta||'').trim();
  document.querySelector('#siteAlert')?.remove();
  if(!txt) return;
  const el=document.createElement('div');
  el.id='siteAlert';el.className='site-alert';el.setAttribute('role','status');
  el.innerHTML=`<div class="wrap"><b>⚠ AVISO</b><span>${esc(txt)}</span></div>`;
  (document.querySelector('.topbar')||document.body.firstElementChild).insertAdjacentElement('afterend',el);
}

/* ── Calculadora de lavagem ── */
function parseValor(raw){
  let s=String(raw||'').toLowerCase().replace(/r\$|\s/g,'');
  if(!s) return 0;
  let mult=1;
  if(/(kk|m|mi|milh(ao|ão|oes|ões)?)$/.test(s)){mult=1e6;s=s.replace(/(kk|m|mi|milh(ao|ão|oes|ões)?)$/,'');}
  else if(/(k|mil)$/.test(s)){mult=1e3;s=s.replace(/(k|mil)$/,'');}
  if(mult>1) s=s.replace(',','.');               // 1,5kk ou 1.5kk
  else s=s.replace(/\./g,'').replace(',','.');    // 100.000 ou 100000,50
  const n=Number(s.replace(/[^0-9.]/g,''));
  return Number.isFinite(n)?Math.round(n*mult):0;
}
function divisaoCalculatorMarkup(slug){
  const d=DIVISOES[slug];
  return `<section id="calculadora" class="calc-box">
    <div class="calc-head"><span class="eyebrow">CALCULADORA</span><strong>QUANTO FICA PARA CADA UM</strong><p>Digite o valor que saiu da lavagem. Aceita 150000, 150.000, 150k ou 1,5kk.</p></div>
    <div class="calc-input searchbar"><span>R$</span><input id="calcValor" inputmode="decimal" placeholder="Valor que saiu da lavagem (ex.: 500k)" autocomplete="off"></div>
    <div id="calcResult" class="calc-result"></div>
  </section>`;
}
function initDivisaoCalculator(slug){
  const d=DIVISOES[slug], input=document.querySelector('#calcValor'), out=document.querySelector('#calcResult');
  if(!d||!input||!out) return;
  const render=()=>{
    const v=parseValor(input.value), c=divisaoCalc(d,v);
    const nome=d.servicoNome.charAt(0)+d.servicoNome.slice(1).toLowerCase();
    out.innerHTML=`<article class="calc-card"><div class="calc-split">
      <div class="calc-client"><span>Cliente recebe • ${d.cliente}%</span><b>${money(c.cli)}</b></div>
      <div><span>${esc(nome)} fica com • ${d.servico}%</span><b>${money(c.serv)}</b></div>
    </div></article>`;
  };
  input.addEventListener('input',render); render();
  if(location.hash==='#calculadora') setTimeout(()=>document.querySelector('#calculadora')?.scrollIntoView({behavior:'smooth',block:'start'}),150);
}
function lavagemCalculatorMarkup(){
  return `<section id="calculadora" class="calc-box">
    <div class="calc-head"><span class="eyebrow">FERRAMENTA</span><strong>CALCULADORA DE LAVAGEM E SECAGEM</strong><p>Digite o valor e veja quanto fica para cada parte. Aceita 150000, 150.000, 150k ou 1,5kk.</p></div>
    <div class="calc-input searchbar"><span>R$</span><input id="calcValor" inputmode="decimal" placeholder="Valor a lavar/secar (ex.: 500k)" autocomplete="off"></div>
    <div id="calcResult" class="calc-result"></div>
  </section>`;
}
function initLavagemCalculator(regras){
  const input=document.querySelector('#calcValor'), out=document.querySelector('#calcResult');
  if(!input||!out) return;
  const render=()=>{
    const v=parseValor(input.value);
    out.innerHTML=regras.map(r=>{
      const m=Math.round(v*Number(r.maquina||0)/100), l=Math.round(v*Number(r.lavagem||0)/100), c=v-m-l;
      return `<article class="calc-card">
        <div class="calc-card-title"><small>${esc(r.grupo||'')}</small><strong>${esc(r.titulo||r.tipo)}</strong></div>
        <div class="calc-split">
          <div><span>Máquina • ${r.maquina}%</span><b>${money(m)}</b></div>
          <div><span>Lavagem • ${r.lavagem}%</span><b>${money(l)}</b></div>
          <div class="calc-client"><span>Cliente recebe • ${r.cliente}%</span><b>${money(c)}</b></div>
        </div>
      </article>`;
    }).join('');
  };
  input.addEventListener('input',render); render();
  if(location.hash==='#calculadora') setTimeout(()=>document.querySelector('#calculadora')?.scrollIntoView({behavior:'smooth',block:'start'}),150);
}

/* ── Página "Como funciona" ── */
function initComoFunciona(){
  return loadCatalog().then(data=>{
    updateMeta(data);
    const link=String(data.meta?.link_denuncia||'').trim();
    document.querySelectorAll('[data-denuncia]').forEach(el=>{
      el.innerHTML=/^https?:\/\//i.test(link)
        ?`<a class="home-action yellow" href="${esc(link)}" target="_blank" rel="noopener">⚑ ABRIR DENÚNCIA / TICKET</a>`
        :`<div class="notice">⚑ Para denunciar, abra um ticket no Discord da High informando o item, o valor cobrado e, se possível, um print ou clipe.</div>`;
    });
  });
}

/* ── Inicialização comum a todas as páginas ── */
let sharedReady=false;
function initShared(data){
  CATALOG_DATA=data;
  renderSiteAlert(data);
  renderCart();
  if(sharedReady) return;
  sharedReady=true;
  document.addEventListener('click',async e=>{
    const t=e.target.closest('[data-fav],[data-cart-add],[data-share],[data-cart-inc],[data-cart-dec],[data-cart-mode],[data-cart-copy],[data-cart-clear],[data-cart-close],#cartFab,#cartBackdrop');
    if(!t) return;
    if(t.dataset.fav){toast(toggleFav(t.dataset.fav)?'★ Adicionado aos favoritos':'Removido dos favoritos');return;}
    if(t.dataset.cartAdd){const i=findItem(t.dataset.cartAdd);addToCart(t.dataset.cartAdd,1);toast(`＋ ${i?i.item:'Item'} no orçamento`);return;}
    if(t.dataset.share){const i=findItem(t.dataset.share);if(i){toast(await copyText(itemLink(i))?'🔗 Link copiado — cole no Discord':'Não foi possível copiar o link');}return;}
    if(t.dataset.cartInc){addToCart(t.dataset.cartInc,1);return;}
    if(t.dataset.cartDec){addToCart(t.dataset.cartDec,-1);return;}
    if(t.dataset.cartMode){const c=getCart();c.modo=t.dataset.cartMode;saveCart(c);return;}
    if(t.hasAttribute('data-cart-copy')){toast(await copyText(cartText())?'Orçamento copiado — cole no Discord':'Não foi possível copiar');return;}
    if(t.hasAttribute('data-cart-clear')){saveCart({items:{},modo:getCart().modo});return;}
    if(t.id==='cartFab'){openCart(true);return;}
    if(t.hasAttribute('data-cart-close')||t.id==='cartBackdrop'){openCart(false);return;}
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')openCart(false);});
  window.addEventListener('storage',e=>{if(e.key===STORE_CART)renderCart();});
}

/* ── Instalar no celular (PWA) ── */
if('serviceWorker' in navigator && location.protocol==='https:'){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}

/* ── Página Histórico ── */
async function initHistorico(){
  const data=await loadCatalog(); updateMeta(data);
  const box=document.querySelector('#historyList'); if(!box) return;
  const hist=Array.isArray(data.historico)?data.historico:[];
  if(!hist.length){box.innerHTML='<div class="empty">Nenhuma alteração registrada ainda. As próximas publicações com mudança de preço aparecerão aqui.</div>';return;}
  const line=m=>{
    const ren=m.renomeado_de?` • antes: ${esc(m.renomeado_de)}`:'';
    if(m.tipo==='renomeado') return `<li><span class="trend-badge novo">RENOMEADO</span><div><strong>${esc(m.item)}</strong><small>${esc(m.categoria)}${ren}</small></div><div class="h-vals"><span>Parceria <b>${money(m.parceria)}</b></span><span>Pista <b>${money(m.pista)}</b></span></div></li>`;
    if(m.tipo==='novo') return `<li class="h-novo"><span class="trend-badge novo">NOVO</span><div><strong>${esc(m.item)}</strong><small>${esc(m.categoria)}</small></div><div class="h-vals"><span>Parceria <b>${money(m.parceria)}</b></span><span>Pista <b>${money(m.pista)}</b></span></div></li>`;
    if(m.tipo==='status'){
      const lab={indisponivel:['indisponivel','INDISPONÍVEL','Indisponível no momento'],revisar:['revisar','EM REVISÃO','Valor em revisão']}[m.status]||['caiu','DISPONÍVEL','Voltou a ficar disponível'];
      return `<li><span class="${m.status==='ativo'?'trend-badge':'status-badge'} ${lab[0]}">${lab[1]}</span><div><strong>${esc(m.item)}</strong><small>${esc(m.categoria)} • ${lab[2]}</small></div><div class="h-vals"><span>Parceria <b>${money(m.parceria)}</b></span><span>Pista <b>${money(m.pista)}</b></span></div></li>`;
    }
    if(m.tipo==='removido') return `<li class="h-removido"><span class="status-badge indisponivel">REMOVIDO</span><div><strong><s>${esc(m.item)}</s></strong><small>${esc(m.categoria)}</small></div><div class="h-vals"><span>Era parceria ${money(m.parceria_antes)}</span><span>Era pista ${money(m.pista_antes)}</span></div></li>`;
    const up=(m.pista-m.pista_antes||m.parceria-m.parceria_antes)>0;
    const v=(label,a,b)=>a===b?`<span>${label} <b>${money(b)}</b></span>`:`<span>${label} <s>${money(a)}</s> → <b>${money(b)}</b></span>`;
    return `<li><span class="trend-badge ${up?'subiu':'caiu'}">${up?'▲ SUBIU':'▼ CAIU'}</span><div><strong>${esc(m.item)}</strong><small>${esc(m.categoria)}${ren}</small></div><div class="h-vals">${v('Parceria',m.parceria_antes,m.parceria)}${v('Pista',m.pista_antes,m.pista)}</div></li>`;
  };
  box.innerHTML=hist.map(h=>{
    const d=new Date(h.em);
    return `<article class="history-entry">
      <header><strong>${isNaN(d)?'—':d.toLocaleString('pt-BR',{dateStyle:'long',timeStyle:'short'})}</strong><span>${(h.mudancas||[]).length} mudança(s)${h.por?` • por ${esc(h.por)}`:''}</span></header>
      <ul>${(h.mudancas||[]).map(line).join('')}</ul>
    </article>`;
  }).join('');
}
