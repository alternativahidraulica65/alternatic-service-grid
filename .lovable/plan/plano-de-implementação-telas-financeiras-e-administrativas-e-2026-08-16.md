# Plano de Implementação: Telas Financeiras e Administrativas ERP

Este plano detalha a criação das Telas 7, 8, 9, 11 e 12 para o ERP da Alternativa Hidráulica, focando em gestão financeira, orçamentação, rastreabilidade e cadastros.

## Mudanças no Banco de Dados

### Tabelas e Estrutura SQL
- **public.materiais**: Cadastro de matéria-prima (Aço 1045, 1050, Nylon, etc) com densidade (kg/dm³) e preço por kg.
- **public.orcamentos_pdf**: Registro de orçamentos gerados, vinculados à OS, com data de expiração para cálculo de SLA.
- **public.configuracoes_comissao**: Regras de comissão por usuário/vendedor (Padrão ou 50/50).
- **Políticas de RLS**: Garantir que apenas Diretores/Financeiro acessem margens e custos sensíveis.

## Novas Telas

### Tela 7: Precificação e Aprovação (`/orcamento/precificacao`)
- Dashboard de custos consolidando: Peças (estoque/compras) + Mão de Obra (interna/terceirizada).
- Calculadora de Preço de Venda:
    - Input de Margem Desejada (%).
    - Cálculo automático de Lucro Bruto e Preço Final.
    - Seletor de Regra de Comissão (Ex: Diretor/Vendedor divide 50/50 do lucro).
- Ação: Botão "Aprovar Orçamento" que trava os custos e libera para geração do PDF.

### Tela 8: SLA e PDF (`/orcamento/pdf/$osId`)
- Visualização de pré-impressão do orçamento.
- Integração com biblioteca de PDF (ex: `react-pdf` ou print styles) contendo Logotipo e dados formais.
- Indicador de SLA: "X dias desde a triagem", "Aguardando aprovação há Y dias".

### Tela 11: Matéria-Prima Inteligente (`/engenharia/materiais`)
- Cadastro de materiais base.
- **Calculadora de Peso Teórico**:
    - Fórmulas para Cilindros/Barras: `Volume (π * r² * L) * Densidade`.
    - Input: Diâmetro (mm), Comprimento (mm).
    - Output: Peso estimado e Custo baseado no preço/kg atualizado.

### Tela 12: Gestão de Vendedores e Comissões (`/admin/usuarios`)
- Interface de administração de usuários.
- Toggle de perfil/cargo.
- Configuração de "Regra de Negócio": [Padrão | Divisão 50/50].

### Tela 9: Histórico e Busca Global (`/historico`)
- Filtros avançados:
    - Status (Finalizada, Garantia, Cancelada).
    - Range de datas.
    - Cliente/Equipamento.
- Busca por texto (Full Text Search) nos laudos técnicos salvos no banco.

## Detalhes Técnicos
- Uso de `createServerFn` para cálculos complexos e geração de dados para o PDF.
- Validação de segurança baseada em `has_role(auth.uid(), 'diretor')` para visualização de lucros.
- Gráficos de margem utilizando `recharts`.
