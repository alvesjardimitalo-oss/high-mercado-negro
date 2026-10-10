// Shared pure calculations. Published action costs remain the source of truth.
export const norm = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const amount = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
export const rulesFor = (action, location) => location?.regras_confronto?.length ? location.regras_confronto : action.regras_confronto || [];
export function sizeFor(action, location) {
  const max = Math.max(0, ...rulesFor(action, location).map(row => Number(row.invasores) || 0));
  return !max ? 'pendente' : max <= 5 ? 'pequena' : max <= 9 ? 'media' : 'grande';
}
export function taxFor(meta) {
  const tax = amount(meta?.taxa_lavagem);
  return tax !== null && tax >= 0 && tax <= 1 ? tax : 0.3;
}
export function economy(action, tax = .3, team = 1) {
  const min = amount(action.premio_min), max = amount(action.premio_max), cost = amount(action.custo);
  const low = min === null || cost === null ? null : min * (1 - tax) - cost;
  const high = max === null || cost === null ? null : max * (1 - tax) - cost;
  return { low, high, roi: low === null || cost === null || cost <= 0 ? null : low / cost * 100,
    perLow: low === null || team <= 0 ? null : low / team, perHigh: high === null || team <= 0 ? null : high / team };
}
export function entriesFor(actions) {
  return actions.filter(a => norm(a.status) !== 'inativo').flatMap(a => (a.locais?.length ? a.locais : [null]).map(l => ({
    id: [a.nome, l?.nome || '', l?.x ?? '', l?.y ?? '', l?.z ?? ''].join('|'),
    a, l, title: l?.descricao || l?.nome || a.nome, size: sizeFor(a, l)
  })));
}
export function matches(entry, filters, favorites = new Set()) {
  const { a, l, size } = entry;
  const text = norm([a.nome, l?.descricao, l?.nome, l ? [l.x,l.y,l.z].join(', ') : a.localizacao,
    ...(a.itens || []).map(i => norm(i.nome) === 'colete' ? 'colete placa balistica' : i.nome)].join(' '));
  return (!filters.q || text.includes(norm(filters.q))) && (!filters.category || a.nome === filters.category)
    && (!filters.weapon || (a.itens || []).some(i => norm(i.nome).includes('arma ') && norm(i.nome).includes(norm(filters.weapon))))
    && (!filters.size || filters.size === 'todas' || size === filters.size)
    && (!filters.team || rulesFor(a,l).some(r => Number(r.invasores) === Number(filters.team)))
    && (filters.budget === '' || filters.budget == null || (amount(a.custo) !== null && Number(a.custo) <= Number(filters.budget)))
    && (!filters.favorites || favorites.has(entry.id));
}
