# Plano de Refatoração e Diagnóstico - Alternativa Hidráulica

O objetivo deste plano é consolidar a interface de criação de Ordens de Serviço (OS), diagnosticar a visibilidade de equipamentos para operadores e garantir que todos os tipos de equipamentos cadastrados no banco de dados sejam exibidos corretamente.

## 1. Consolidação de Páginas de OS
Atualmente existem duas rotas que parecem servir ao propósito de criar uma OS:
- `/os/nova` (`src/routes/_authenticated/nova-os.tsx`): Focada em Triagem inicial.
- `/ordens-servico/nova` (`src/routes/_authenticated/ordens-servico/nova.tsx`): Focada em dados cadastrais.

**Ações:**
- Remover a rota `/ordens-servico/nova` e seu arquivo correspondente.
- Atualizar o menu lateral em `src/routes/_authenticated/dashboard.tsx` para apontar exclusivamente para `/os/nova`.
- Renomear/ajustar o título da página em `nova-os.tsx` para refletir que é a página oficial de "Nova OS / Triagem".

## 2. Diagnóstico e Correção de Visibilidade de Equipamentos
O usuário (Operador) relatou que não consegue ver todos os equipamentos. A busca direta no banco retornou 5 itens (`Cilindro`, `Bomba`, `Válvula`, `Motor`, `Comando`), mas o front-end pode estar limitando a exibição ou falhando em carregar devido a RLS ou filtros.

**Ações:**
- Verificar e garantir que as políticas de RLS na tabela `tipos_equipamento` permitam `SELECT` para o perfil `operador`.
- Adicionar logs de depuração em `nova-os.tsx` para monitorar o retorno da query `tipos_equipamento`.
- Garantir que a query não tenha filtros restritivos que omitam itens específicos.

## 3. Melhoria na Interface de Triagem
Ajustar a página de triagem para ser mais robusta, garantindo que a seleção de equipamento carregue corretamente os templates de checklist.

## Detalhes Técnicos
- **Remoção de arquivo:** `src/routes/_authenticated/ordens-servico/nova.tsx`.
- **Alteração de Menu:** Modificar `menuItems` em `src/routes/_authenticated/dashboard.tsx`.
- **RLS Check:** Rodar comando SQL para garantir `GRANT SELECT ON public.tipos_equipamento TO authenticated;`.
- **Componentes:** Manter o uso de `@tanstack/react-query` para fetching de dados.

---
*Nada foi alterado ainda. Este é o plano para execução após aprovação.*
