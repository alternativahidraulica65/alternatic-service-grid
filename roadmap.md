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
- [ ] Endurecer RLS: as políticas aplicadas na migração são permissivas
      (`USING (true)`) para todos os autenticados. Precisam virar políticas
      por perfil (financeiro/margens fora do alcance de operador e gestor).
- [ ] Endurecer políticas de Storage (hoje abertas a qualquer autenticado).
- [ ] Rever constraints de domínio relaxadas durante a migração
      (campos obrigatórios legados de clientes, OS, peças e custos).
