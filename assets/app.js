const CATALOG_URL = './data/catalogo.json';

const icons = {
  'armas':'🔫','municao':'💥','tecnologia-utilitarios':'💻','drogas-rotas':'🧪',
  'desmanche':'🔧','lavagem':'💸','falsificacao':'💳','hospital-ilegal':'💉',
  'mecanica':'🏁','contrabando':'📦'
};

const slugify = s => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

const normalizeText = s => String(s ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .toLowerCase().trim();

const money = n => new Intl.NumberFormat('pt-BR', {
  style:'currency', currency:'BRL', maximumFractionDigits:0
}).format(Number(n || 0));

const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[c]));

const isActive = i => normalizeText(i?.status || 'ativo') !== 'inativo';
const iconFor = c => icons[slugify(c)] || '◆';

async function loadCatalog() {
  const r = await fetch(`${CATALOG_URL}?v=${Date.now()}`);
  if (!r.ok) throw new Error('Não foi possível carregar o catálogo.');
  return r.json();
}

function updateMeta(data) {
  document.querySelectorAll('[data-updated]').forEach(el => {
    const d = new Date(data.meta?.atualizado_em);
    el.textContent = isNaN(d)
      ? 'Atualização não informada'
      : `Atualizado em ${d.toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}`;
  });

  document.querySelectorAll('[data-total]').forEach(el => {
    el.textContent = (data.itens || []).filter(isActive).length;
  });
}

function itemCard(i, showCategory = false) {
  return `<article class="item-card" data-highlight="${!!i.destaque}">
    <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
      <span class="tag">${showCategory ? esc(i.categoria) : (i.destaque ? 'DESTAQUE' : esc(i.status || 'ATIVO').toUpperCase())}</span>
      ${showCategory && i.destaque ? '<span class="tag">DESTAQUE</span>' : ''}
    </div>
    <h3>${esc(i.item)}</h3>
    <div class="prices">
      <div class="price"><span>Parceria</span><strong>${money(i.parceria)}</strong></div>
      <div class="price pista"><span>Pista</span><strong>${money(i.pista)}</strong></div>
    </div>
    ${i.observacao ? `<div class="notice">⚠ ${esc(i.observacao)}</div>` : ''}
    ${showCategory ? `<a href="categoria.html?c=${slugify(i.categoria)}" style="display:inline-block;margin-top:14px">ABRIR ${esc(i.categoria).toUpperCase()} →</a>` : ''}
  </article>`;
}

async function initHome() {
  const data = await loadCatalog();
  updateMeta(data);

  const active = (data.itens || []).filter(isActive);
  const grid = document.querySelector('#categoryGrid');
  const featured = document.querySelector('#featured');
  const search = document.querySelector('#globalSearch');

  if (grid) {
    const cats = [...new Set(active.map(i => i.categoria).filter(Boolean))];
    grid.innerHTML = cats.map(c => {
      const count = active.filter(i => slugify(i.categoria) === slugify(c)).length;
      return `<a class="category-card" href="categoria.html?c=${slugify(c)}">
        <span class="category-count">${count} ITENS</span>
        <div class="category-icon">${iconFor(c)}</div>
        <h3>${esc(c)}</h3>
        <p>Abrir tabela de valores e consulta operacional.</p>
      </a>`;
    }).join('');
  }

  const render = q => {
    if (!featured) return;
    const term = normalizeText(q);

    if (!term) {
      const highlights = active.filter(i => !!i.destaque).slice(0,12);
      featured.innerHTML = highlights.length
        ? highlights.map(i => itemCard(i, true)).join('')
        : '<div class="empty">Digite na busca para localizar qualquer item do catálogo.</div>';
      return;
    }

    const results = active.filter(i => normalizeText(
      `${i.item} ${i.categoria} ${i.observacao || ''}`
    ).includes(term));

    featured.innerHTML = results.length
      ? `<div style="grid-column:1/-1;margin-bottom:8px"><span class="eyebrow">RESULTADOS DA BUSCA</span><h2>${results.length} ${results.length === 1 ? 'item encontrado' : 'itens encontrados'}</h2></div>${results.map(i => itemCard(i, true)).join('')}`
      : `<div class="empty">Nenhum item encontrado para “${esc(q)}”.</div>`;
  };

  render('');
  if (search) search.addEventListener('input', e => render(e.target.value));
}

async function initCategory() {
  const data = await loadCatalog();
  updateMeta(data);

  const active = (data.itens || []).filter(isActive);
  const p = new URLSearchParams(location.search);
  const raw = p.get('c') || '';

  const matched = active.find(i => slugify(i.categoria) === slugify(raw));
  const cat = matched?.categoria || active[0]?.categoria || '';
  const items = active.filter(i => slugify(i.categoria) === slugify(cat));

  document.title = `${cat} • Mercado Negro High`;

  const catIcon = document.querySelector('#catIcon');
  const catName = document.querySelector('#catName');
  const catCount = document.querySelector('#catCount');
  const list = document.querySelector('#itemList');
  const search = document.querySelector('#categorySearch');

  if (catIcon) catIcon.textContent = iconFor(cat);
  if (catName) catName.textContent = cat;
  if (catCount) catCount.textContent = `${items.length} ITENS ATIVOS`;

  const render = q => {
    if (!list) return;
    const term = normalizeText(q);
    const filtered = items.filter(i => !term || normalizeText(
      `${i.item} ${i.observacao || ''}`
    ).includes(term));
    list.innerHTML = filtered.length
      ? filtered.map(i => itemCard(i)).join('')
      : '<div class="empty">Nenhum item encontrado nesta categoria.</div>';
  };

  render('');
  if (search) search.addEventListener('input', e => render(e.target.value));

  const rules = document.querySelector('#rules');
  if (rules && slugify(cat) === 'lavagem' && data.regras?.lavagem) {
    rules.innerHTML = data.regras.lavagem.map(r =>
      `<div class="rule"><strong>${esc(r.titulo)}</strong><span>${esc(r.texto)}</span></div>`
    ).join('');
  }
}
