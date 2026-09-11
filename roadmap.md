# Roadmap — Unificação em banco único

REGRA PERMANENTE: um único banco de dados neste projeto — o Supabase
`mpwnrcxyyeqftrejwmmx`. Nenhum outro banco pode ser criado ou usado.

## Situação

- Banco atual do app (Lovable Cloud, `omyaiprywidpxtbnntiq`): contém todos os
  dados operacionais construídos até aqui + as contas de login + os arquivos.
- Banco oficial (`mpwnrcxyyeqftrejwmmx`): esquema mais enxuto e praticamente
  vazio (16 clientes, 6 usuários, 11 tipos de equipamento). Sem OS, custos,
  peças, fotos, fornecedores.

## Tarefas

- [x] Inventariar as tabelas e colunas dos dois bancos
- [x] Confirmar duplicidade e mapear divergências de nomes
- [ ] BLOQUEADO: obter a chave publicável (anon key) do banco oficial
      — sem ela o app não consegue conectar no navegador com segurança
- [ ] BLOQUEADO: obter acesso de administração/senha do banco oficial
      — sem isso não é possível criar as tabelas e colunas que faltam lá
- [ ] Completar o esquema do banco oficial (bancadas, os_tarefas, colunas de
      terceiros, pagamento de custos, entrega/testado, etc.)
- [ ] Migrar dados na ordem de dependência
- [ ] Recriar contas de login e copiar arquivos (fotos, comprovantes, PDFs)
- [ ] Apontar o app para o banco oficial e ajustar nomes divergentes no código
- [ ] Validar login, dashboards, OS, peças, bancadas, terceiros, custos e logs

## Divergências de nome a tratar na etapa de código

| App atual | Banco oficial |
| --- | --- |
| usuarios (user_id, cargo) | usuarios (perfil, role) + profiles |
| cliente_equipamentos | equipamentos |
| logs_sistema | logs_auditoria |
| clientes.nome | clientes.razao_social / contato_nome |
| ordens_servico.criado_em | ordens_servico.data_entrada |
| ordens_servico.numero_os | ordens_servico.numero_orcamento_cliente |
| os_pecas_rastreio.nome | os_pecas_rastreio.componente |
| historico_status_os.executor_id | historico_status_os.alterado_por |
| fotos_anexos.foto_url | fotos_anexos.url_arquivo |
