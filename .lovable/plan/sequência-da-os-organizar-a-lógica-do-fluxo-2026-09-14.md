# Sequência da OS — organizar a lógica do fluxo

Nenhuma tela muda de aparência. O que muda é a regra que define em que fase a OS está, o que libera a próxima fase e o que aparece no quadro de produção.

## Fluxo oficial (uma única definição para todo o sistema)

```text
Criar OS > Checklist > Laudo técnico > Custos > Orçamento > Aprovação do cliente > Execução > Pronto > Entrega
```

Cada fase só abre quando a anterior está concluída de verdade, com base nos dados reais da OS:

| Fase | Concluída quando |
| --- | --- |
| Criar OS | OS cadastrada com cliente e equipamento |
| Checklist | todos os itens preenchidos como Bom ou Ruim, fotos obrigatórias nos itens ruins (regra que já existe) e o botão Finalizar Checklist acionado |
| Laudo técnico | diagnóstico, defeitos ou serviços necessários preenchidos |
| Custos | nenhum custo pode ficar zerado: todo item lançado precisa ter valor de no mínimo R$ 0,50. A fase só pode ser concluída com valores zerados se não houver nenhum custo lançado |
| Orçamento | orçamento salvo com valor e enviado para aprovação |
| Aprovação | aprovação do cliente registrada |
| Execução | peças, usinagem e terceiros resolvidos (sem pendências em aberto) |
| Pronto | serviço testado |
| Entrega | data de entrega, quem entregou e teste confirmado |

## Peças, Terceiros e Execução: controle, não etapa

Essas três áreas deixam de influenciar o avanço das fases iniciais. Elas passam a ser ferramentas de acompanhamento do gestor: onde está cada peça, o que está fora com terceiro, o que falta fazer. A única fase que olha para elas é a **Execução**, que só é considerada concluída quando não houver peça sem destino, serviço de bancada sem baixa ou peça em terceiro sem retorno.

O guia de execução continua listando essas pendências como hoje.

## Bloqueio de etapas

Conforme definido: **bloqueia**. Quem tentar pular uma fase recebe um aviso claro listando exatamente o que falta (ex.: "Falta o laudo técnico e nenhum custo foi lançado"). Vale no quadro de produção, na tela da OS e na tela de orçamento.

Voltar uma fase para trás continua permitido (correção de erro), sempre registrado no histórico com quem fez.

## Quem pode avançar

Somente **Gestor, Diretor e Financeiro** movem a OS de fase. Operador e técnico continuam preenchendo checklist, laudo, peças e tarefas normalmente — só não mudam a fase.

## OS com laudo enviado ao gestor

Hoje uma OS nessa situação some do quadro de produção, porque a situação gravada não corresponde a nenhuma coluna (há uma OS assim no banco agora). Recomendação: tratá-la como parte da coluna **Orçamento**, já que o próximo passo real é precificar. Ela aparece lá com a indicação de que ainda faltam os custos, sem criar coluna nova e sem mexer no visual.

## Registro e rastreabilidade

Toda mudança de fase — pelo quadro, pela tela da OS ou pelo card de orçamentos — grava no histórico da OS com a situação anterior, a nova e o e-mail de quem executou. Hoje o quadro de produção altera a fase sem registrar; isso passa a registrar.

## Detalhes técnicos

- Novo módulo `src/lib/os-fluxo.ts` como fonte única: lista ordenada de fases, rótulos, mapa de status legados (`aberta`, `vistoria`, `aguardando_gestor`, `orcamento_pendente`, `aprovada`, `usinagem`, `montagem`, `pronto`, `entregue`) para fase canônica, `avaliarFluxo(os, { checklist, custos, pecas, bancadas })` devolvendo `faseAtual`, `concluidas`, `proximaFase` e `pendencias[]` por fase, e `podeAvancar(de, para)`.
- Consumidores atualizados para usar o módulo em vez de listas de status espalhadas:
  - `src/routes/_authenticated/kanban.tsx` — coluna derivada da fase canônica (inclui `aguardando_gestor` em Orçamento), `handleUpdateStatus` valida transição, checa perfil via `useUserRole` e insere em `historico_status_os` com `getExecutorEmail()`.
  - `src/routes/_authenticated/os/$id.index.tsx` — `steps` e `isTabCompleted` derivados de `avaliarFluxo`; conclusão do checklist e envio do laudo passam a gravar a fase correta; entrega mantém as validações atuais.
  - `src/routes/_authenticated/os/$id.orcamento.tsx` — reaproveita as mesmas pendências (hoje duplicadas nas linhas ~333-342) e bloqueia salvar/enviar quando houver pendência.
  - `src/components/AlertaOrcamentosCard.tsx` — "para fazer" / "aguardando cliente" derivados da fase, não de strings soltas.
  - `src/components/GuiaExecucaoOs.tsx` — usa `pendencias` da fase Execução como fonte das pendências automáticas.
- Sem migração de banco: nenhuma coluna nova; os status existentes continuam válidos e são normalizados em código.
- Ao final: typecheck, build e verificação das telas de OS, quadro e dashboards em desktop e celular.
