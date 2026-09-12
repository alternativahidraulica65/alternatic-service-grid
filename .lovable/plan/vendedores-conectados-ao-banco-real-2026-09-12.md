# Vendedores conectados ao banco real

Reformular a tela de Vendedores para guardar o cadastro completo do vendedor e as regras de comissão no banco oficial, e usar esses dados no orçamento.

## O que muda no cadastro do vendedor

Campos novos na ficha:
- Nome completo e apelido/nome de campo (ex: "Carlos - Vendas Campo")
- CPF ou CNPJ (aceita pessoa física ou representante PJ)
- E-mail corporativo e WhatsApp/telefone
- Status Ativo/Inativo com chave deslizante (estilo iPhone), salva na hora
- Empresas vinculadas (as que ele atende) — como já existe hoje
- Observação

## Tipos de comissão (um por vendedor)

1. **Percentual sobre o total da OS** — informa o percentual (ex: 3%).
2. **Valor fixo** — informa o valor em reais; entra no orçamento como custo.
3. **Percentual sobre a margem bruta** — incide sobre (valor da OS − custo de peças − custo de terceirizados).
4. **Por metas** — faixas padrão iguais para todos: até R$ 50.000 = 3%; de R$ 50.001 a R$ 100.000 = 5%; acima de R$ 100.000 = 7%, conforme o faturamento acumulado do vendedor no mês.

A tela mostra o campo certo conforme o tipo escolhido (percentual, valor ou aviso das faixas) e exibe um resumo legível na lista.

## Ligação com cliente e orçamento

- Cada cliente passa a ter um vendedor responsável (o campo já existe no banco). Na ficha do cliente dá para escolher o vendedor.
- No orçamento, o vendedor vem automaticamente do cliente da OS; o cálculo da comissão passa a usar a regra cadastrada, no lugar dos 5% fixos que estão na tela hoje.
- Nos tipos "margem bruta" e "por metas", o cálculo usa os custos reais lançados na OS e o faturamento do mês do vendedor.

## Tela

- Lista com busca, filtro por tipo de comissão, filtro Ativos/Inativos e ações editar/excluir (exclusão com confirmação).
- Indicadores: total de vendedores, ativos, e quantos usam cada tipo de comissão.
- Exclusão bloqueada com aviso claro quando o vendedor já estiver ligado a clientes; nesse caso sugere desativar.

## Detalhes técnicos

- Banco oficial `mpwnrcxyyeqftrejwmmx`, alterações incrementais (sem DROP, sem perda de dados), aplicadas via token de gestão já configurado.
- `public.vendedores`: novas colunas `apelido`, `cpf_cnpj`, `email`, `telefone`, `tipo_comissao` (`percentual_os` | `valor_fixo` | `margem_bruta` | `metas`), `valor_comissao numeric`. Manter `regra_comissao`/`tipo_calculo` existentes para compatibilidade, preenchendo `tipo_comissao` a partir delas nos 3 registros atuais.
- `public.clientes.vendedor_id` já existe: adicionar FK para `vendedores(id)` (ON DELETE SET NULL) e índice.
- Grants + RLS: leitura para `authenticated`; escrita restrita a diretor/administrativo_financeiro via `has_role`, substituindo política permissiva na tabela `vendedores` e `vendedor_empresas`.
- Front: reescrever `src/routes/_authenticated/admin/vendedores.tsx` (form zod condicional por tipo, `Switch` de status, `AlertDialog` de exclusão) e criar `src/lib/comissao.ts` com o cálculo puro dos 4 tipos, reutilizado no orçamento.
- Orçamento (`src/routes/_authenticated/os/$id.orcamento.tsx` e `orcamento/precificacao.tsx`): buscar vendedor pelo `cliente_id` da OS e aplicar `calcularComissao`.
- Após a migração, regenerar/ajustar os tipos usados pela tela e rodar typecheck/build.
