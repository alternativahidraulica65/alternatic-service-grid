# Plano de Implementação: Módulo de Orçamento e Precificação OS

Implementação da tela de Orçamento Comercial (/os/:id/orcamento) com integração completa ao banco de dados, cálculos automáticos de margem e exportação de PDF.

## Alterações Físicas

### 1. Banco de Dados (Supabase)
- Criar tabela `public.orcamentos` para armazenar versões, itens (JSONB), parâmetros financeiros (custo, imposto, margem, comissão) e fotos selecionadas.
- Criar tabela `public.orcamento_versoes` para histórico.
- Habilitar RLS e permissões GRANT.

### 2. Componentes e UI
- **Cálculos Reativos:** Implementar lógica de recálculo instantâneo (Custo Base + Imposto + Margem = Valor Final).
- **Associação Multi-OS:** Interface para buscar e vincular outras OS ao mesmo orçamento.
- **Galeria de Seleção:** Exibição das fotos da OS com checkboxes para inclusão no PDF.
- **Tabela de Itens:** CRUD em linha para peças e mão de obra dentro do orçamento.

### 3. Integração
- Criar `src/routes/_authenticated/os/$id.orcamento.tsx`.
- Conectar a aba "Orçamento" na tela de gestão da OS para esta nova rota.
- Implementar `handleGerarPDF` (mock funcional com toast até integração final do PDF).

## Detalhes Técnicos
- Utilizar `zod` para validação dos inputs financeiros.
- Persistência no Supabase com RLS garantindo acesso apenas a perfis autorizados (Gestor, Diretor).
- Gerenciamento de estado complexo para os itens do orçamento (React Query + State local para edição).

```text
Orçamento -> Itens -> [Cálculo Base] -> [+Impostos] -> [+Margem] -> [Valor Final]
                                                                    |
                                                                    -> [Comissão]
```
