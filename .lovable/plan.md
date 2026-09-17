# Painel do Gestor — "o que precisa ser feito e onde está cada coisa"

Um bloco novo no topo do painel do Gestor (acima do quadro atual), com linguagem simples e ação direta.

## 1. Faixa "Precisa de alguém"

Primeira faixa, em destaque: todas as OS que ainda não têm técnico nem operador responsável.

Cada linha mostra: número da OS, cliente, o que falta fazer (ex.: "Falta o checklist"), há quantos dias está parada e um seletor para escolher o responsável ali mesmo, sem abrir a OS. Ao escolher, a pessoa recebe o aviso no sino (já funciona hoje) e a mudança fica no histórico.

## 2. Quatro grupos simples de situação

Abaixo, quatro caixas contáveis e clicáveis, que reúnem os estados técnicos em termos do dia a dia:

| Grupo | O que reúne | Próxima ação |
| --- | --- | --- |
| Abrir e fazer checklist | OS recém-criadas, sem checklist finalizado | Abrir a OS e preencher o checklist |
| Passar orçamento | Checklist/laudo prontos, custos ou orçamento pendentes | Montar o orçamento |
| Aguardando o cliente | Orçamento enviado, sem resposta | Cobrar retorno |
| Aprovadas — executar e entregar | Cliente aprovou, em execução/pronto | Terminar e entregar |

Ao clicar em um grupo, abre a lista daquelas OS com cliente, responsável (ou "sem responsável"), dias parada e botão para abrir a OS.

## 3. Sinais visuais

- Sem responsável: faixa amarela.
- Parada há 5+ dias: faixa âmbar; 10+ dias: vermelha (mesma regra já usada no quadro).
- Atrasada em relação ao prazo: marcador vermelho, como hoje.

O quadro de colunas atual, os cartões de peças/terceiros/bancadas e os alertas continuam como estão.

## Detalhes técnicos

- Novo componente `src/components/PainelGestorOs.tsx`, usado em `src/routes/_authenticated/dashboard/gestor.tsx` (reaproveita a query `dashboard_gestor_os`, sem nova chamada ao banco para a lista).
- Agrupamento derivado de `faseDoStatus`/`avaliarFluxo` em `src/lib/os-fluxo.ts` (fonte única do fluxo), não de strings soltas: `criacao`/`checklist` → Abrir e fazer checklist; `laudo`/`custos`/`orcamento` → Passar orçamento; `aprovacao` → Aguardando o cliente; `execucao`/`pronto` → Executar e entregar. OS já entregues ficam fora.
- "Sem responsável" = `tecnico_id` e `operador_atribuido` nulos, entre as OS não finalizadas.
- Atribuição: `update ordens_servico set tecnico_id/operador_atribuido` + registro em `historico_status_os` com `getExecutorEmail()`; a notificação de atribuição já é disparada pelo gatilho existente. Ação restrita a Gestor/Diretor/Financeiro via `useUserRole`.
- Lista de responsáveis vinda de `usuarios` ativos (cargo operador/técnico).
- Sem alteração de banco. Ao final: typecheck, build e conferência em desktop e celular.
