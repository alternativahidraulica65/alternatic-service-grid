# Configurações: Empresas (CNPJs) + Gestão de Usuários

## Objetivo

Transformar a tela de Configurações em um painel real, ligado ao banco, com duas áreas:

1. **Empresas emissoras (CNPJs)** com regras padrão que alimentam automaticamente o orçamento.
2. **Gestão de usuários**: criar usuário, resetar senha, editar permissão (cargo/role) e ativar/desativar.

Acesso restrito a Diretor e Administrativo/Financeiro.

## 1. Empresas e regras padrão

Verifiquei o banco agora: **a tabela `configuracoes_empresa` ainda não existe** (só existe `configuracoes_vendedores` e `empresas_emissoras`). Então ela será criada com esse nome, uma linha por CNPJ, ligada às empresas já cadastradas (Alternativa Matriz, Filial Sul, Equipamentos, Hidráulica Matriz).

Campos por empresa:
- Identificação: razão social, nome fantasia, CNPJ, inscrição estadual, endereço, cidade/UF, CEP, telefone, e-mail, site
- Regras do orçamento: prazo de entrega padrão (dias úteis), prazo de garantia (dias/meses), imposto (%), margem de lucro padrão (%), comissão padrão (%), validade da proposta (dias)
- Sugestões extras (padrões da empresa): condição de pagamento padrão, forma de pagamento, observações/termos padrão que entram no rodapé do orçamento, texto de garantia, prefixo de numeração de orçamento, empresa padrão do sistema (marcar uma como principal)

Na tela: lista de CNPJs à esquerda, formulário completo à direita, botão para adicionar novo CNPJ e para desativar. Tudo salvo direto no banco.

**Efeito no orçamento:** ao abrir o orçamento de uma OS, os campos imposto, margem, comissão, prazo de entrega, garantia e validade já vêm preenchidos com os padrões da empresa vinculada à OS (com a empresa principal como reserva). O gestor ainda pode alterar manualmente naquele orçamento.

## 2. Gestão de usuários

Na mesma tela, a lista de colaboradores passa a ter ações reais:
- **Novo usuário**: nome, e-mail, senha inicial, cargo — cria a conta de acesso e o perfil
- **Resetar senha**: define uma nova senha na hora ou envia e-mail de redefinição
- **Editar permissão**: troca de cargo/role (Diretor, Administrativo/Financeiro, Gestor, Operador, Técnico, Terceirizado), gravando na tabela de papéis
- **Ativar/desativar acesso**
- Busca por nome/e-mail funcionando

Cada ação fica registrada no log de auditoria com o e-mail de quem executou.

## Detalhes técnicos

- Migração incremental: `CREATE TABLE public.configuracoes_empresa` com `empresa_id` referenciando `empresas_emissoras`, `unique(empresa_id)`, `created_at/updated_at` + trigger; GRANTs para `authenticated`/`service_role`; RLS: leitura para autenticados, escrita apenas para `has_role(diretor)`/`administrativo_financeiro`.
- Colunas extras em `empresas_emissoras` apenas se necessário (`ativo`, `principal`) — nada é apagado.
- Criação de usuário / reset de senha exigem privilégio de administrador: server functions em `src/lib/admin-usuarios.functions.ts` com `requireSupabaseAuth`, validando o papel do chamador via `has_role` antes de usar o cliente administrativo (import dinâmico dentro do handler).
- Front: reescrita de `src/routes/_authenticated/configuracoes.tsx` (abas Empresas / Usuários / Segurança), mantendo o estilo industrial existente.
- Orçamento: `src/routes/_authenticated/os/$id.orcamento.tsx` passa a buscar as configurações da empresa da OS para inicializar imposto/margem/comissão/prazos, em vez do valor fixo 8,5%.
