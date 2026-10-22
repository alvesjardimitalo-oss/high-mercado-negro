// Motor puro: valores oficiais do Mercado Negro permanecem imutáveis na simulação.
// Todos os valores são da economia fictícia FiveM/High RP, em R$.
export const norm = value => String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
export const DEFAULT_TAX = .30;
export const DEFAULT_ROI = .25;
export const DEFAULT_RANGE = .15;
export const PRICE_ALIASES = Object.freeze({
 'ARMA PISTOLA':'PISTOLA T54',
 'ARMA SUB':'UZI',
 'ARMA FUZIL':'FAL',
 'MUNICAO PISTOLA (X100)':'PISTOLA 100X',
 'MUNICAO SUB (X200)':'SMG 200X',
 'MUNICAO FUZIL (X250)':'FUZIL 250X'
});
const numeric=x=>x!==null&&x!==undefined&&String(x).trim()!==''&&Number.isFinite(Number(x))?Number(x):null;
export function priceFor(item, catalog, mode='pista'){
 const key=norm(item);
 if(key==='ARMA BRANCA'){
  return {name:'ARMA BRANCA',source:'VALORES AÇÃO BLIPADA',unit:mode==='pista'?975:null,missing:mode!=='pista'};
 }
 const lookup=norm(PRICE_ALIASES[key]||item);
 const product=(catalog?.itens||[]).find(x=>norm(x.item)===lookup&&x.status==='ativo')||
  (catalog?.itens||[]).find(x=>norm(x.item)===lookup);
 const unit=numeric(product?.[mode]);
 return {name:product?.item||String(item),unit,source:product?'Mercado Negro':'Não cadastrado',missing:unit===null,status:product?.status||'PENDENTE',image:product?.imagem||''};
}
export function teamRules(action,location=null){
 const rules=location?.regras_confronto?.length?location.regras_confronto:action.regras_confronto||[];
 return [...rules].map(x=>({invasores:Number(x.invasores)||0,policiais:Number(x.policiais)||0,refens:Number(x.refens)||0}))
  .filter(x=>x.invasores>0).sort((a,b)=>a.invasores-b.invasores);
}
export function initialTeam(action,location=null){
 const rules=teamRules(action,location);
 return Number(rules.at(-1)?.invasores)||Math.max(1,...(action?.itens||[]).map(i=>Number(i.quantidade)||0));
}
export function costBreakdown(action,catalog,{mode='pista',quantities={},prices={}}={}){
 const lines=(action?.itens||[]).map((item,index)=>{
  const source=priceFor(item.nome,catalog,mode);
  const proposedQuantity=numeric(quantities[index]);
  const qty=Math.max(0,proposedQuantity===null?Number(item.quantidade)||0:proposedQuantity);
  const override=numeric(prices[index]);
  const unit=override===null?source.unit:Math.max(0,override);
  return {index,nome:item.nome,quantity:qty,originalQuantity:Number(item.quantidade)||0,
   unit,source:override===null?source.source:'AJUSTE MANUAL',missing:unit===null,
   total:unit===null?null:qty*unit,reference:source.name,image:source.image};
 });
 const missing=lines.filter(l=>l.missing).map(l=>l.nome);
 const knownTotal=lines.reduce((n,l)=>n+(l.total??0),0);
 const publishedCost=numeric(action?.custo);
 const complete=!missing.length;
 const difference=complete&&publishedCost!==null?knownTotal-publishedCost:null;
 return {lines,missing,knownTotal,complete,publishedCost,difference,
  // Não estimar um preço desconhecido: usar custo oficial publicado e sinalizar.
  cost:complete?knownTotal:publishedCost,
  source:complete?'ITENS / PREÇOS '+String(mode).toUpperCase():'CUSTO OFICIAL (PREÇO PENDENTE)',
  needsReview:missing.length>0||(mode==='pista'&&difference!==null&&Math.abs(difference)>1)};
}
export function proposal(action, catalog, opts={}){
 const wash=numeric(opts.tax);
 const tax=wash===null?DEFAULT_TAX:Math.max(0,Math.min(.99,wash));
 const roiRaw=numeric(opts.roi);
 const roi=roiRaw===null?DEFAULT_ROI:Math.max(0,roiRaw);
 const spreadRaw=numeric(opts.spread);
 const spread=spreadRaw===null?DEFAULT_RANGE:Math.max(0,spreadRaw);
 const kit=costBreakdown(action,catalog,opts);
 const team=Math.max(1,Math.round(Number(opts.team)||initialTeam(action,opts.location)));
 const rule=teamRules(action,opts.location).find(r=>r.invasores===team)||null;
 const min=numeric(action?.premio_min), max=numeric(action?.premio_max);
 const realNetMin=min===null||kit.cost===null?null:min*(1-tax)-kit.cost;
 const realNetMax=max===null||kit.cost===null?null:max*(1-tax)-kit.cost;
 const targetProfitTotalRaw=numeric(opts.targetProfitTotal);
 const targetProfitTotal=targetProfitTotalRaw===null?kit.cost===null?null:kit.cost*roi:Math.max(0,targetProfitTotalRaw);
 const requiredMin=kit.cost===null||targetProfitTotal===null?null:Math.ceil((kit.cost+targetProfitTotal)/(1-tax));
 const awardOverride=numeric(opts.proposedDirtyMin);
 const suggestedMin=awardOverride===null?requiredMin:Math.max(0,awardOverride);
 const suggestedMax=suggestedMin===null?null:Math.ceil(suggestedMin*(1+spread));
 const delta=suggestedMin===null||min===null?null:suggestedMin-min;
 const proposedNet=suggestedMin===null||kit.cost===null?null:suggestedMin*(1-tax)-kit.cost;
 const decision=action?.status==='inativo'?'INATIVA':
   kit.needsReview?'REVISAR INSUMOS':delta===null?'PENDENTE':delta>0?'BUFF':delta<0?'NERF':'MANTER';
 return {
  action:action?.nome||'',status:action?.status||'ativo',kit,team,rule,tax,roi,spread,
  currentMin:min,currentMax:max,realNetMin,realNetMax,
  actualNetPerPlayer:realNetMin===null?null:realNetMin/team,
  actualROI:realNetMin===null||!kit.cost?null:realNetMin/kit.cost,
  requiredMin,suggestedMin,suggestedMax,
  targetProfitTotal,delta,proposedNet,proposedNetPerPlayer:proposedNet===null?null:proposedNet/team,
  decision,hasPriceIssues:kit.needsReview, alreadyBuffed:Number(action?.buff)||0,
  alreadyNerfed:Number(action?.nerf)||0
 };
}
export function summaryRows(actions=[],catalog,opts={}){
 return actions.map(a=>proposal(a,catalog,opts));
}
