async function initHome() {
  const data = await loadCatalog();
  updateMeta(data);

  const grid = document.querySelector('#categoryGrid');
  const search = document.querySelector('#globalSearch');
  const featured = document.querySelector('#featured');

  const active = data.itens.filter(
    i => String(i.status || 'ativo').toLowerCase() !== 'inativo'
  );

  // Categorias
  const cats = [...new Set(active.map(i => i.categoria))];

  grid.innerHTML = cats.map(c => {
    const count = active.filter(i => i.categoria === c).length;

    return `
      <a class="category-card" href="categoria.html?c=${slugify(c)}">
        <span class="category-count">${count} ITENS</span>
        <div class="category-icon">${icons[c] || '◆'}</div>
        <h3>${esc(c)}</h3>
        <p>Abrir tabela de valores e consulta operacional.</p>
      </a>
    `;
  }).join('');

  // Normaliza texto para pesquisa
  const normalize = value =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  function renderSearch(query) {
    const term = normalize(query);

    // Sem pesquisa: não mostra resultados
    if (!term) {
      featured.innerHTML = '';
      featured.style.display = 'none';
      return;
    }

    const results = active.filter(i => {
      const searchable = normalize(
        `${i.item} ${i.categoria} ${i.observacao || ''}`
      );

      return searchable.includes(term);
    });

    featured.style.display = '';

    if (!results.length) {
      featured.innerHTML = `
        <div class="empty">
          Nenhum item encontrado para "${esc(query)}".
        </div>
      `;
      return;
    }

    featured.innerHTML = `
      <div style="grid-column:1/-1;margin-bottom:8px">
        <span class="eyebrow">RESULTADOS DA BUSCA</span>
        <h2>${results.length} ${results.length === 1 ? 'item encontrado' : 'itens encontrados'}</h2>
      </div>

      ${results.map(i => `
        <article class="item-card" data-highlight="${!!i.destaque}">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:center">
            <span class="tag">${esc(i.categoria)}</span>
            ${i.destaque ? '<span class="tag">DESTAQUE</span>' : ''}
          </div>

          <h3>${esc(i.item)}</h3>

          <div class="prices">
            <div class="price">
              <span>Parceria</span>
              <strong>${money(i.parceria)}</strong>
            </div>

            <div class="price pista">
              <span>Pista</span>
              <strong>${money(i.pista)}</strong>
            </div>
          </div>

          ${i.observacao
            ? `<div class="notice">⚠ ${esc(i.observacao)}</div>`
            : ''
          }

          <a
            href="categoria.html?c=${slugify(i.categoria)}"
            style="display:inline-block;margin-top:14px"
          >
            ABRIR ${esc(i.categoria).toUpperCase()} →
          </a>
        </article>
      `).join('')}
    `;
  }

  renderSearch('');

  search.addEventListener('input', e => {
    renderSearch(e.target.value);
  });
}
