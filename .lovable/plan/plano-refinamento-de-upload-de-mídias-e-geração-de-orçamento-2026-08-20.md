# Plano: Refinamento de Upload de Mídias e Geração de Orçamentos (Cláusula Pétrea #01)

Implementar interface de seleção de fotos para PDF, estados de progresso com retry para uploads e persistência de seleção na revisão do orçamento.

## Alterações Técnicas

### 1. Interface de Checkboxes e Persistência
- **Local:** `src/routes/_authenticated/os/$id.orcamento.tsx`
- **Ação:** Refinar o componente de seleção de fotos para garantir que a lista de IDs selecionados seja persistida corretamente na tabela `orcamento_revisoes`.
- **Ação:** Adicionar feedback visual claro de quais fotos estão selecionadas para o PDF.

### 2. Estados de Progresso e Retry (Upload de Fotos)
- **Local:** `src/lib/media/upload.ts`
- **Ação:** Implementar função `uploadOsPhotoWithRetry` com lógica de backoff exponencial simples (3 tentativas).
- **Ação:** Adicionar suporte a callback de progresso no upload para o Supabase Storage.
- **Ação:** Atualizar `src/routes/_authenticated/nova-os.tsx` e `src/routes/_authenticated/os/$id.tsx` para exibir barras de progresso durante o upload de fotos da OS.

### 3. Melhoria na Geração de PDF (Retry e Estabilidade)
- **Local:** `src/lib/pdf/orcamento-pdf.ts`
- **Ação:** Envolver a chamada de upload do PDF em uma lógica de retry para evitar falhas em conexões instáveis.
- **Ação:** Garantir que o `SignedImage` lide corretamente com estados de carregamento e erro (skeletons).

## Detalhes Técnicos
- Uso de `supabase.storage.upload` com opção de `onUploadProgress`.
- Implementação de utilitário `withRetry` genérico para promessas.
- Persistência no campo `fotos_selecionadas` (JSONB/Text Array) da tabela `orcamento_revisoes`.
