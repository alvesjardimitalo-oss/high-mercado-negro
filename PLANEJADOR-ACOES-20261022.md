# Planejador de Ações — High RP (22/10/2026)

## Fonte de verdade
- Ações, prêmios e BUFF/NERF **já incorporados**: `data/acoes-blipadas.json` (33 ações).
- Itens e preços PISTA/PARCERIA: `data/catalogo.json`.
- Tabela oficial `Ilegal - High Season 2`, aba `VALORES AÇÃO BLIPADA`, permanece INTACTA.
- Planilha original: três novas abas editáveis — `PLANEJADOR AÇÕES`, `ITENS PLANEJADOS`, `PREÇOS AÇÕES`. Alterações de ROI, quantidade, preços nos novos quadros recalculam apenas sugestões, nunca os prêmios publicados.

## Lógica econômica
- Investimento do kit: Σ(quantidade × preço unitário). Municão (x100/x200/x250) indica **tamanho de uma caixa**, não preço.
- Base selecionável: PISTA (referência dos kits atuais) ou PARCERIA.
- Recebimento limpo após lavagem = prêmio sujo × 0,70 (taxa 30%).
- Lucro líquido real = recebimento limpo − investimento do kit.
- Lucro por integrante = lucro líquido / invasores simulados.
- ROI líquido = lucro líquido / investimento do kit.
- Prêmio mínimo recomendado = ARREDONDAR.PARA.CIMA((investimento + lucro-alvo) / 0,70).
- Prêmio máximo sugerido = mínimo recomendado × (1 + margem opcional, inicial 15%).
- BUFF / NERF sugerido = prêmio mínimo sugerido − prêmio mínimo **atual publicado**.
- BUFF/NERF já aplicados são mostrados apenas para auditoria: **não são somados outra vez**.
- Meta ilustrativa inicial: ROI líquido 25%, editável por ação e globalmente na nova aba. Não representa decisão aprovada.
- Invasores, policiais e reféns são exibidos por regras específicas do catálogo; disponibilidade real/cooldown devem ser verificados no comando `/acoes`.

## Pontos para revisão de preços
- JOALHERIA: custo oficial R$2.180.000, mas soma dos preços PISTA informados para os itens = R$2.169.000, diferença de R$11.000. Não ajustar automaticamente.
- TITANIC (INATIVO): item `PENDRIVE CLANDESTINO 3` sem correspondência confiável no catálogo de preços; manter custo oficial R$487.000 como fallback até revisão.

## Dados e publicações
- Site: `planejador-acoes.html`; consulta dados JSON publicados sempre que a página abre.
- Fotos de locais e itens reaproveitadas do Mercado Negro (sem gerar imagens fictícias).
- Botões: copiar proposta, exportar CSV, salvar rascunho **apenas no navegador**, abrir a planilha oficial.
- O site **não grava automaticamente** uma simulação na Google Sheet: esta ação exigiria autorização OAuth de escrita configurada para o domínio do site. A planilha já foi inicialmente preenchida e recalcula cenários diretamente.
- Backup do repositório anterior: `backup/mercado-before-planner-20261022`.

## Testes
`node tools/test-planejador.mjs` testa todos os valores publicados, lavagem, kits, ROI, variantes de preço, simulação, risco de buff duplicado, fontes ausentes e divergências conhecidas.
