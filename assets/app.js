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
