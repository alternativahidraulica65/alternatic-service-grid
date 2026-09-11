# Guia de Execução da OS (Próximos Passos)

Transformar a aba **Execução** da OS — hoje vazia ("Aguardando início da execução") — em um painel-guia para o gestor: uma lista viva de tudo que falta fazer naquela OS, com barra de progresso, pendências automáticas e tarefas criadas à mão.

Visível apenas para gestor, diretor e financeiro (mesma regra do painel de Custos). Para os demais perfis a aba continua com a mensagem atual.

## Como funciona

No topo, um resumo: barra de progresso (itens resolvidos / total), contagem de pendências, quantas estão atrasadas e qual é o "próximo passo" sugerido em destaque.

Abaixo, a lista dividida em blocos, na ordem natural do fluxo:

1. **Fluxo da OS** — o que falta para a OS andar de fase: vistoria/checklist incompleto, laudo não preenchido, orçamento não gerado, orçamento sem aprovação registrada, OS pronta sem entrega.
2. **Peças** — peças ainda sem destinação definida (o gestor precisa decidir), peças em armazenagem e onde estão guardadas.
3. **Terceiros** — o que está fora da empresa: peça, terceiro, prazo prometido, dias em atraso, e o que já voltou.
4. **Usinagem / bancadas** — serviços na fila esperando aprovação do gestor e serviços liberados ainda sem baixa.
5. **Custos** — itens gerados por peças/terceiros ainda sem valor lançado e custos lançados ainda não pagos.
6. **Tarefas do gestor** — itens livres criados manualmente.

Cada item mostra um selo de situação (pendente / atrasado / concluído) e uma ação:

- **Ações rápidas no próprio item**: aprovar serviço na bancada, dar baixa na usinagem, marcar peça recebida do terceiro, concluir tarefa manual.
- **Ir para a aba**: itens que exigem formulário (definir destino da peça, lançar custo, preencher laudo) levam direto para a aba correspondente da OS.

Toda ação feita pelo guia continua gravando no histórico da OS com o e-mail de quem executou, como já acontece hoje.

## Tarefas manuais

Botão "Nova tarefa" com título, responsável (opcional), prazo (opcional) e observação. O gestor pode concluir, reabrir, editar ou excluir. Tudo salvo no banco, ligado à OS.

## Detalhes técnicos

- Nova tabela `public.os_tarefas`: `os_id` (FK `ordens_servico`), `titulo`, `descricao`, `responsavel_id`, `prazo` (date), `concluida` (bool), `concluida_em`, `concluida_por`, `criado_por`, timestamps. GRANT para `authenticated` e `service_role`, RLS habilitada com políticas restritas a gestor/diretor/administrativo_financeiro via `has_role`.
- Novo componente `src/components/GuiaExecucaoOs.tsx`, montado dentro de `<TabsContent value="execução">` em `src/routes/_authenticated/os/$id.tsx`, recebendo a OS por prop.
- Consultas via TanStack Query em `os_pecas_rastreio`, `os_custos`, `os_checklist_tecnico`, `bancadas` e `os_tarefas`, filtradas por `os_id`. Nada de dados fictícios; as pendências são derivadas das linhas reais.
- Regras de pendência calculadas em um helper puro (`derivarPendencias`) para manter o componente enxuto e testável.
- Mutações reutilizam as funções já existentes de aprovação de bancada, baixa de usinagem e recebimento de terceiros, invalidando as mesmas query keys usadas hoje (`bancadas_fila`, `pecas`, `custos`, etc.).
- Registro no `historico_status_os` com `executor_id` e `executor_email` via `getExecutorEmail()`.
- Permissão de leitura no cliente via `useUserRole()` (`isGestor`, `isDiretor`, `isFinanceiro`, `isDev`).
