# Unificar bancos de dados duplicados

## Diagnóstico confirmado

Existem DOIS bancos de dados ativos:

1. **Banco do app** (gerenciado pelo Lovable, usado pelo código hoje): `omyaiprywidpxtbnntiq`
   - Contém tudo que construímos: ordens_servico, os_pecas_rastreio, os_custos, bancadas, os_tarefas, historico_status_os, usuarios, user_roles, fornecedores, clientes etc.
2. **Banco da imagem do usuário**: `mpwnrcxyyeqftrejwmmx`
   - Contém tabelas diferentes: configuracoes_empresa, profiles, equipamentos, terceirizados, logs_auditoria, materia_prima_precos, vendedor_clientes, além de clientes, ordens_servico, usuarios, fornecedores.
   - Acesso confirmado (tabelas respondem 200 via API).

**Conclusão**: não há dados falsos — o app está olhando para um banco e o usuário para outro. Isso explica por que a tabela configuracoes_empresa "existia" para o usuário mas não para nós.

## Objetivo

O app deve usar UM único banco: o `mpwnrcxyyeqftrejwmmx` (o banco oficial do usuário).

## Plano

1. **Inventário completo do banco oficial** — listar todas as tabelas e colunas do `mpwnrcxyyeqftrejwmmx` para mapear diferenças de estrutura (ex.: profiles vs usuarios, equipamentos vs cliente_equipamentos, logs_auditoria vs logs_sistema).
2. **Apontar o app para o banco oficial** — trocar as credenciais/URL de conexão do projeto Lovable para `mpwnrcxyyeqftrejwmmx` (o segredo EXTERNAL_SUPABASE_SECRET_KEY já funciona nele).
3. **Criar no banco oficial o que falta** — migration incremental com as tabelas/colunas que o app precisa e não existem lá (bancadas, os_tarefas, historico_status_os, colunas de terceiros/pagamento etc.), sem DROP nem perda de dados.
4. **Migrar dados essenciais** (se houver dados reais no banco do app que devam ser preservados) — copiar linhas de ordens_servico, os_pecas_rastreio, os_custos etc. para o banco oficial. Se o usuário confirmar que os dados atuais do app são só teste, pular esta etapa.
5. **Adaptar o código** onde os nomes de tabela/coluna divergirem (profiles vs usuarios etc.), mantendo o Supabase como fonte única de verdade.
6. **Validar** — login, dashboards, detalhe da OS e lista de peças apontando para o banco oficial.

## Decisões que preciso de você

- Confirmar que o banco oficial é mesmo o `mpwnrcxyyeqftrejwmmx` (o da imagem).
- Os dados atuais dentro do app (OS de teste, peças, custos) devem ser migrados ou podem ser descartados?
