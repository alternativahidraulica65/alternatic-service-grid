# Gestão de Colaboradores (RH) — acesso exclusivo do Financeiro

## Objetivo
Nova tela `/rh/colaboradores` para cadastro de pessoal, com cards estilo "RG", ficha detalhada com anexos e painel de alertas de vencimentos. Somente o perfil **Financeiro/Administrativo** acessa. Diretor, Gestor, Operador e Terceirizado não veem o menu nem os dados.

## Tela

**1. Topo — Avisos e Vencimentos**
- Filtro de tempo: Vencidos | Até 30 dias | Até 60 dias.
- Cards de contagem por tipo: ASO, NRs/Certificações, Fim de Experiência, Férias (início/término).
- Lista abaixo com colaborador, tipo, data, dias restantes/atraso (vermelho = vencido, amarelo = 30 dias, cinza = 60 dias). Clique abre a ficha.

**2. Grade de cards "RG"**
- Foto, nome, cargo/função, matrícula, CPF mascarado, data de admissão, status (Ativo, Experiência, Férias, Afastado, Desligado) e selo de pendência quando houver alerta.
- Busca por nome/CPF, filtro por status e setor, botão "Novo colaborador".

**3. Ficha detalhada (ao clicar)**
- Abas: Dados pessoais (CPF, RG, nascimento, contato, endereço), Contrato (cargo, setor, admissão, salário, tipo de contrato, fim da experiência 45/90 dias calculado), ASO (tipo, data, validade), NRs/Certificações (lista: NR-35, NR-10, NR-12, outras; emissão e validade), Férias (períodos com início/fim), Anexos (upload de qualquer arquivo com categoria: ASO, Certificado, Contrato, Documento pessoal, Outros; baixar e remover).
- Editar e inativar (sem exclusão de histórico).

**4. Notificações**
- A rotina diária existente passa a avisar apenas usuários Financeiro sobre itens vencidos ou vencendo em 30 dias (sem repetir no mesmo dia).

## Detalhes técnicos
- Migration incremental (sem DROP), aplicada direto no banco Supabase real usado pelo app (sem dados fictícios ou armazenamento local; todas as leituras e gravações vão direto ao banco):
  - `colaboradores` (dados pessoais/contrato, foto_url, status, ativo).
  - `colaborador_aso` (tipo, data_exame, validade).
  - `colaborador_certificacoes` (norma, descricao, emissao, validade).
  - `colaborador_ferias` (inicio, fim, observacao).
  - `colaborador_anexos` (categoria, nome, storage_path, criado_por).
  - Bucket privado `colaboradores-docs`.
  - Função `is_financeiro(uid)` security definer verificando `user_roles.role = 'administrativo_financeiro'` (não usa bypass de diretor). RLS + GRANT `authenticated` em todas as tabelas e storage apenas com essa função.
- Front: rota `src/routes/_authenticated/rh/colaboradores.tsx` com guarda própria baseada em `roles.includes('administrativo_financeiro')` (o contexto atual trata diretor como financeiro, por isso não reutilizar `isFinanceiro`).
- Alertas calculados a partir das datas de validade/fim de experiência/férias; queries via TanStack Query.
- Item de menu visível só para Financeiro. Aplicar no backend em uso e recarregar o cache de schema.
