import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {costBreakdown,proposal,priceFor,teamRules,initialTeam} from '../assets/planejador-core.mjs';

const data=JSON.parse(readFileSync(new URL('../data/acoes-blipadas.json',import.meta.url)));
const catalog=JSON.parse(readFileSync(new URL('../data/catalogo.json',import.meta.url)));
const byName=name=>data.acoes.find(a=>a.nome===name);
assert.equal(data.acoes.length,33,'Catálogo de ações aprovado precisa permanecer completo');
assert.equal(data.meta.taxa_lavagem,0.3);
const dept=byName('LOJA DE DEPARTAMENTO');
const d=proposal(dept,catalog);
assert.equal(d.currentMin,438571,'O prêmio aprovado não pode receber BUFF duplicado');
assert.equal(d.currentMax,504357);
assert.equal(d.kit.cost,268500);
assert.deepEqual(d.kit.lines.map(x=>x.total),[152000,54000,52000,10500]);
assert.equal(d.kit.needsReview,false);
assert.equal(d.alreadyBuffed,55000);
assert.equal(d.realNetMin.toFixed(2),'38499.70');
assert.equal(d.suggestedMin,479465);
assert.equal(d.delta,40894);
assert.equal(d.decision,'BUFF');
assert.deepEqual(teamRules(dept).map(x=>x.invasores),[3,4]);
assert.equal(initialTeam(dept),4);
// Quantidades alteradas afetam custo simulado, NÃO prêmio aprovado.
const compact=proposal(dept,catalog,{quantities:{0:3,1:3,2:3}});
assert.equal(compact.kit.cost,204000);
assert.equal(compact.currentMin,438571);
assert.equal(compact.realNetMin.toFixed(2),'102999.70');
// Valor de parceria é preço alternativo, não um segundo buff.
const partner=proposal(dept,catalog,{mode:'parceria'});
assert.equal(partner.kit.cost,207500);
assert.equal(partner.currentMin,438571);
assert.equal(partner.realNetMin.toFixed(2),'99499.70');
// Ajuste manual define sugestão editável, SEM mudar JSON oficial.
const manual=proposal(dept,catalog,{proposedDirtyMin:500000});
assert.equal(manual.suggestedMin,500000);
assert.equal(manual.delta,61429);
assert.equal(dept.premio_min,438571);
// "x200" = tamanho da embalagem, nunca custo 200.
assert.equal(priceFor('MUNIÇÃO SUB (x200)',catalog).unit,18000);
assert.equal(priceFor('MUNIÇÃO FUZIL (x250)',catalog).unit,22000);
assert.equal(priceFor('MUNIÇÃO PISTOLA (x100)',catalog).unit,13500);
const fleeca=byName('FLEECA NORTE');
assert.equal(proposal(fleeca,catalog).kit.cost,559750);
assert.equal(proposal(fleeca,catalog).currentMin,1015589);
// Exceções são sinalizadas, sem inventar preço ou substituir o custo oficial.
const joia=proposal(byName('JOALHERIA'),catalog);
assert.equal(joia.kit.difference,-11000);
assert.equal(joia.kit.needsReview,true);
assert.equal(joia.decision,'REVISAR INSUMOS');
const titanic=proposal(byName('TITANIC'),catalog);
assert.equal(titanic.kit.complete,false);
assert.deepEqual(titanic.kit.missing,['PENDRIVE CLANDESTINO 3']);
assert.equal(titanic.kit.cost,487000,'Fallback usa custo histórico aprovado');
assert.equal(titanic.decision,'INATIVA');
// Não gera prêmio se custo não existir.
assert.equal(proposal({nome:'TESTE',itens:[{nome:'NÃO EXISTE',quantidade:2}],premio_min:500},catalog).kit.cost,null);
let reviewed=0;
for(const action of data.acoes){
 const sim=proposal(action,catalog);
 assert.equal(sim.currentMin,action.premio_min);
 assert.equal(sim.currentMax,action.premio_max);
 assert.ok(sim.kit.cost!==null||sim.kit.needsReview);
 assert.ok(sim.suggestedMin===null||sim.suggestedMin>=0);
 if(sim.kit.needsReview)reviewed++;
}
assert.equal(reviewed,2);
console.log('PLANEJADOR DE AÇÕES: 33 ações, lavagem 30%, custos, fotos/regras, preços, ROI e valores aprovados verificados.');
