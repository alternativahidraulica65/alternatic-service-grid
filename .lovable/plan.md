# Alerta de orçamentos nos dashboards

## O que será criado
- Adicionar um card de alerta chamativo nos dashboards do Diretor e Financeiro.
- Mostrar o total geral e separar os números em:
  - **Pendentes para fazer**: apenas OS marcadas como "Pendente de Orçamento". A OS só entra nesse estado depois que as fases anteriores estiverem completas (checklist técnico, laudo/relatório e custos lançados); quem quiser iniciar um orçamento antes disso será avisado do que ainda falta preencher.
  - **Aguardando cliente**: orçamentos enviados e ainda sem aprovação do cliente.
- Ao clicar, abrir uma lista com OS, cliente, prazo e situação.
- Permitir ação direta em cada item:
  - abrir a tela para elaborar o orçamento;
  - abrir a OS ou registrar que o cliente aprovou.

## Dados e segurança
- Consultar somente dados reais do banco em `ordens_servico`.
- Registrar no histórico quando a aprovação do cliente for confirmada.
- Atualizar os contadores imediatamente após a ação.

## Detalhes técnicos
- Criar um componente compartilhado para evitar duplicação entre os dois dashboards.
- Usar os estados atuais do fluxo: `vistoria` para pendente de elaboração e `orcamento_pendente` para aguardando aprovação.
- Manter o acesso restrito aos perfis Diretor e Financeiro/Administrativo.
- Validar a experiência em desktop e celular e conferir a compilação após as alterações.
