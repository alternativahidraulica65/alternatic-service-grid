# Cláusula Pétrea #01 — Mídias, Compressão e Armazenamento

Objetivo: tornar a diretriz de mídias real no sistema — compressão obrigatória no navegador, buckets dedicados, metadados no banco e geração/versionamento de PDFs de orçamento.

## Situação atual (verificada)

- Todos os uploads hoje vão para o bucket `os-assets` (triagem em `nova-os.tsx`, checklist e laudo em `os/$id.tsx`), sem compressão: o arquivo original da câmera é enviado como está.
- O código usa `getPublicUrl` em um bucket privado — os links gerados não abrem.
- Os metadados de foto são gravados em `public.os_fotos_anexos` (não existe `public.fotos_anexos`).
- Não existe tabela `orcamento_revisoes`, nem buckets `os-midias` / `orcamentos-docs`.
- O botão "Gerar PDF Proposta" na tela de orçamento é um placeholder: mostra um toast de sucesso, não gera nem salva arquivo. Nenhuma biblioteca de PDF está instalada.

## O que será feito

### 1. Compressão obrigatória no navegador
- Instalar `browser-image-compression` e criar um utilitário único de upload de imagem usado por toda a aplicação.
- Regras aplicadas: saída WebP (fallback JPEG), no máximo 1600px na maior borda, qualidade 0.8, alvo abaixo de 200 KB.
- Feedback visual de progresso, tamanho original x comprimido e erro por arquivo.
- Nenhuma tela poderá enviar imagem sem passar por esse utilitário.

### 2. Buckets e caminhos
- Criar bucket privado `os-midias`: `os_{os_id}/{categoria}/{timestamp}_{arquivo}.webp`.
- Criar bucket privado `orcamentos-docs`: `os_{os_id}/orcamentos/ORC_{numero}_REV{n}.pdf`.
- Substituir `getPublicUrl` por URLs assinadas (buckets privados), com renovação automática na exibição das galerias.
- `os-assets` permanece intacto; as telas passam a gravar novos arquivos em `os-midias`.

### 3. Banco de dados
- Padronizar em `public.os_fotos_anexos` (tabela já existente e já usada pelo código), acrescentando `storage_path`, `categoria` e `bucket`. Um alias/visão `fotos_anexos` é criado para atender à nomenclatura da diretriz sem duplicar dados.
- Criar `public.orcamento_revisoes` com `orcamento_id` (referência à OS), `numero_revisao`, `pdf_storage_path`, `fotos_selecionadas` (uuid[]), `valor_total`, `criado_por`, `criado_em`, com GRANTs e RLS.

### 4. Geração de PDF do orçamento
- Instalar `jspdf` + `jspdf-autotable` e gerar o PDF no cliente com identidade industrial (cabeçalho, dados do cliente, tabela de itens, totais, condições).
- Grid de laudo visual com as fotos marcadas nos checkboxes da tela de orçamento (carregadas por URL assinada).
- O PDF é convertido em Blob, enviado a `orcamentos-docs` e registrado como nova revisão em `orcamento_revisoes` (numeração incremental automática).
- Nova seção "Histórico de Revisões" na tela de orçamento, com download por revisão.

### 5. Segurança (RLS)
- `os-midias`: leitura para qualquer usuário autenticado; upload/atualização para operador, gestor, diretor.
- `orcamentos-docs`: leitura e upload apenas para administrativo_financeiro, gestor e diretor — operador e terceirizado bloqueados.
- `orcamento_revisoes`: mesmas restrições de perfil das políticas do bucket de documentos.

### 6. Proibição de mock
- Remover o toast falso de PDF e qualquer dado fictício remanescente nos fluxos de foto e orçamento; tudo passa a ler e escrever no banco.

## Detalhes técnicos

- Novo módulo `src/lib/media/upload.ts` (compressão + caminho padronizado + insert de metadados) e `src/lib/media/signed-url.ts`.
- Novo módulo `src/lib/pdf/orcamento-pdf.ts` para montagem e upload da revisão.
- Telas afetadas: `nova-os.tsx`, `os/$id.tsx` (checklist, laudo, fotos), `os/$id.orcamento.tsx`.
- Migração única cobrindo colunas novas, tabela de revisões, GRANTs, RLS de tabela e políticas de `storage.objects` por bucket.
