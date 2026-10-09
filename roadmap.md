# Roadmap — Alternativa Hidráulica

## REGRA PERMANENTE (não violar)
O sistema tem **um único banco de dados**: o projeto Supabase
`mpwnrcxyyeqftrejwmmx` (https://mpwnrcxyyeqftrejwmmx.supabase.co).
- Proibido criar, usar ou apontar o app para qualquer outro banco.
- Proibido mock data, arrays locais ou localStorage como fonte de dados.
- Proibido `DROP TABLE` ou exclusão de dados sem validação prévia.

## Concluído
- [x] Inventário e comparação dos dois bancos (duplicidade confirmada).
- [x] Schema do banco oficial completado de forma incremental (39 tabelas).
- [x] Funções, triggers e chaves estrangeiras recriadas no oficial.
- [x] Migração de dados: clientes, OS, checklist, peças, custos, fotos,
      histórico, fornecedores, bancadas, vendedores, tipos e matérias-primas.
- [x] Contas de acesso migradas e vinculadas a `usuarios` + `user_roles`.
- [x] Buckets e arquivos de storage copiados.
- [x] App apontado para o banco oficial
      (`src/integrations/supabase/app-client.ts` + alias no `vite.config.ts`).
- [x] Validação: login e telas de dashboard (gestor, diretor, financeiro,
      operador), clientes, kanban e configurações sem erros.

## Pendente
- [x] Custos da OS: impedir duplicação automática, separar pagamento, renomear fornecedor e melhorar valores/cartões.
- [ ] Validar custos com sessão real no banco oficial (lançamento, destinação e quitação); registros duplicados anteriores preservados para revisão.
- [x] Checklist da OS: ícones, avaliação em massa, documento assinado e remoção restrita.
- [ ] Validar checklist com sessão real: avaliação em massa, finalizar, editar e remover (teste depende de acesso autenticado ao banco oficial).
- [ ] Endurecer RLS: as políticas aplicadas na migração são permissivas
      (`USING (true)`) para todos os autenticados. Precisam virar políticas
      por perfil (financeiro/margens fora do alcance de operador e gestor).
- [ ] Endurecer políticas de Storage (hoje abertas a qualquer autenticado).
- [ ] Rever constraints de domínio relaxadas durante a migração
      (campos obrigatórios legados de clientes, OS, peças e custos).

## Alerta de orçamentos (dashboards Diretor/Financeiro)
- [x] Card de alerta com totais de orçamentos pendentes e aguardando cliente.
- [x] Status "Pendente de Orçamento" só após checklist, laudo e custos preenchidos.

## Sequência da OS (fluxo único)
- [x] src/lib/os-fluxo.ts como fonte única (fases, pendências, bloqueio de avanço)
- [x] Kanban: coluna derivada da fase, validação de transição + perfil + histórico
- [x] Detalhe da OS: etapas derivadas do fluxo; checklist exige todos os itens avaliados
- [x] Orçamento: bloqueio pelas pendências das fases anteriores (custos >= R$ 0,50)
- [x] Card de alerta: para fazer / aguardando cliente derivados da fase

## Formação de preço do orçamento
- [x] Separar custos de manutenção, produtos vendidos e itens da proposta.
- [x] Calcular preço por valor informado ou margem líquida desejada.
- [x] Manter tela, OS salva e PDF com o mesmo valor final.

## Sistema de notificações (16/09/2026)
- [x] Sino com central de avisos no topo (contador, marcar lidas, link para a OS)
- [x] Regras prontas por perfil: OS atribuída, orçamento respondido (imediatas) + sem resposta, OS parada, terceiro atrasado, limite de fornecedor (verificação diária 08h)
- [ ] E-mails dos avisos importantes — aguardando configuração do domínio de e-mail
