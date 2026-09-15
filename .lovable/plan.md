# Reestilização da tela de Fornecedores com mini-dashboards mensais

Transformar a tela de fornecedores em um painel visual, onde cada fornecedor mostra seus gastos reais do mês e a evolução dos últimos meses, mantendo todo o cadastro atual.

## O que muda

### Visões alternáveis
- Botão para alternar entre **Cards** (nova visão padrão) e **Tabela** (a lista atual, preservada como está).
- Busca por nome/CNPJ continua funcionando nas duas visões.

### Card de cada fornecedor
- Nome, CNPJ, contato e selo Ativo/Inativo.
- **Gasto do mês atual** em destaque, com comparação percentual contra o mês anterior (seta para cima/baixo).
- **Barra de limite mensal**: percentual consumido do limite cadastrado; amarelo acima de 80% e vermelho quando estoura. Sem limite cadastrado, a barra não aparece.
- **Mini-gráfico dos últimos 6 meses** (barras compactas) com o total gasto por mês; ao passar o mouse, mês e valor.
- **Total acumulado no período** e número de lançamentos.
- Menu com Editar e Excluir, igual ao de hoje.

### Faixa de resumo no topo
- Total gasto no mês com todos os fornecedores, número de fornecedores ativos, quantos estouraram o limite e o fornecedor com maior gasto no mês.

### Origem dos dados (reais, sem exemplos)
Gastos = lançamentos financeiros ligados ao fornecedor + custos de OS atribuídos ao fornecedor, agrupados por mês.
Fornecedor sem movimento aparece normalmente, com "Sem lançamentos no período" no lugar do gráfico.

## Detalhes técnicos

- Arquivo: `src/routes/_authenticated/financeiro/fornecedores/index.tsx` (nenhuma mudança de banco).
- Nova query `fornecedores-gastos`: `lancamentos_financeiros` (`fornecedor_id`, `valor`, `data_competencia`) e `os_custos` (`fornecedor_id`, `custo_interno`, `criado_em`) filtrados pelos últimos 6 meses; agregação no cliente em um `Map<fornecedor_id, { mes: string; valor: number }[]>` com `useMemo`.
- Mini-gráfico com `recharts` (`BarChart` + `ResponsiveContainer`, altura ~64px) dentro de `ClientOnly`, seguindo o padrão já usado em `relatorios.tsx`; `Progress` do shadcn para a barra de limite.
- Estilo industrial existente: cartões de borda discreta, tipografia condensada em caixa alta, amarelo (`primary`) apenas em destaque/ação, vermelho/âmbar só para alerta de limite.
- Layout responsivo: 1 coluna no celular, 2 em tablet, 3 em desktop.
- Estado `visao: "cards" | "tabela"` em `useState`; modais de cadastro, importação CSV e auditoria permanecem intactos.
- `head()` da rota com título e descrição próprios.
