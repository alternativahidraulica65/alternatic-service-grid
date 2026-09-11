# Unificar em um único banco de dados

## Diagnóstico confirmado

Existem DOIS bancos ativos hoje:

1. **Banco atual do app** (`omyaiprywidpxtbnntiq`) — é para onde o código aponta. Contém tudo que construímos: ordens_servico, os_pecas_rastreio, os_custos, bancadas, os_tarefas, historico_status_os, usuarios, user_roles, clientes, fornecedores, orcamentos etc.
2. **Seu banco oficial** (`mpwnrcxyyeqftrejwmmx`, o da imagem) — acesso já validado. Contém tabelas que não existem no banco do app: configuracoes_empresa, profiles, equipamentos, terceirizados, logs_auditoria, materia_prima_precos, vendedor_clientes, além de clientes, ordens_servico, usuarios, fornecedores.

Não havia dados falsos: o app estava gravando em um banco e você olhando outro.

## Regra permanente

**Um único banco: o Supabase `mpwnrcxyyeqftrejwmmx`.** Nenhum outro banco pode ser criado ou usado neste projeto. Vou gravar isso na memória do projeto para valer em todas as sessões futuras.

## Etapas

1. **Inventário completo do banco oficial** — todas as tabelas, colunas, chaves, políticas de acesso e funções, para mapear o que existe, o que falta e onde os nomes divergem (profiles vs usuarios, equipamentos vs cliente_equipamentos, logs_auditoria vs logs_sistema, terceirizados).
2. **Completar o esquema do banco oficial** — migration incremental criando somente o que falta para o app funcionar (bancadas, os_tarefas, historico_status_os, colunas de terceiros, pagamento de custos, prazo de orçamento, entrega/testado etc.), com as permissões e regras de acesso corretas. Sem apagar nada do que já existe lá.
3. **Migrar os dados** do banco atual para o oficial, na ordem de dependência (clientes, usuários/perfis, fornecedores, ordens de serviço, peças, custos, checklists, laudos, fotos, logs). Registros que já existirem no destino não são duplicados; nada é apagado na origem.
4. **Migrar contas de acesso e arquivos** — usuários/senhas de login e os arquivos guardados (fotos das peças, comprovantes, PDFs de orçamento) precisam ser recriados/copiados no banco oficial para que login e imagens continuem funcionando.
5. **Apontar o app para o banco oficial** — trocar a conexão do projeto e ajustar o código onde os nomes de tabela/coluna divergirem.
6. **Validar de ponta a ponta** — login por perfil, dashboards, detalhe da OS, peças, bancadas, terceiros, custos e logs, todos lendo do banco oficial.

## Observações técnicas

- O segredo de acesso ao banco oficial já existe no projeto e responde corretamente via API.
- A migração dos dados será feita por script, tabela a tabela, com verificação de contagem antes e depois.
- Contas de autenticação não são copiáveis por SQL comum: serão recriadas com senha temporária e você define a definitiva no primeiro acesso, a menos que você prefira outra abordagem.
- Nenhum DROP TABLE nem exclusão de dados será executado em nenhum dos dois bancos.
