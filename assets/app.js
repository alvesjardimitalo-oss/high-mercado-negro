const CATALOG_URL = './data/catalogo.json';
const ITEM_IMAGE_BASE = './assets/itens/';

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
      return `<a class="category-card" href="categoria.html?c=${slugify(c)}"><span class="category-count">${count} ITENS</span><div class="category-icon">${iconFor(c)}</div><h3>${esc(c)}</h3><p>Abrir tabela de valores e consulta operacional.</p></a>`;
    }).join('');
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
  if(rules&&slugify(cat)==='lavagem'&&data.regras?.lavagem) rules.innerHTML=data.regras.lavagem.map(r=>`<div class="rule"><strong>${esc(r.titulo)}</strong><span>${esc(r.texto)}</span></div>`).join('');
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

  document.querySelector('[data-category-count]')?.replaceChildren(document.createTextNode(String(categories.length)));
  render();
}
