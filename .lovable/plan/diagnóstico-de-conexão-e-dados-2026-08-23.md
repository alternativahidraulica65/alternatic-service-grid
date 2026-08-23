# Diagnóstico de Conexão e Dados

Este plano detalha o status da conexão com o banco de dados e a visibilidade dos dados no front-end da Alternativa Hidráulica.

## Status da Conexão
- **Backend:** Conectado ao Lovable Cloud (Supabase).
- **ID do Projeto (Interno):** `omyaiprywidpxtbnntiq`.
- **Database:** `postgres` (esquema `public`).

## Verificação de Dados
Após inspeção técnica, confirmamos que o banco de dados **possui dados**, mas há uma falha de sincronização visual:
1. **Usuários:** 6 usuários cadastrados (incluindo `dev@admin.com` e `diretor@alternativa.com`).
2. **Perfis:** 6 perfis configurados na tabela `usuarios`.
3. **Roles (RBAC):** Permissões atribuídas corretamente (Diretor, Gestor, Operador, Financeiro).
4. **Tabelas de Negócio:** Tabelas como `tipos_equipamento` e `empresas_emissoras` foram detectadas como vazias ou com RLS restritivo no front-end.

## Problema Identificado
O erro "não aparece dados" geralmente ocorre por um dos três motivos abaixo que iremos sanar:
- **Políticas de RLS:** As tabelas podem estar com RLS habilitado mas sem políticas de `SELECT` para usuários autenticados.
- **Cache do Navegador:** O token de sessão pode estar obsoleto.
- **Sincronização de FK:** Algumas tabelas podem estar falhando na consulta devido a filtros de ID de empresa/usuário.

## Próximos Passos (Após Aprovação)
1. **Reset de Políticas:** Re-aplicar permissões de leitura total (`SELECT`) para usuários autenticados em tabelas básicas.
2. **Carga de Dados Base:** Garantir que `tipos_equipamento` e `empresas_emissoras` tenham registros padrão visíveis.
3. **Log de Depuração:** Inserir logs temporários no console do navegador para capturar erros de rede específicos durante as consultas.

*Nenhuma alteração foi realizada até o momento.*
