# Plano de Refatoração do Checklist da OS

Refatorar a aba de Checklist na página de detalhes da Ordem de Serviço (OS) para carregar itens dinamicamente da tabela `checklist_templates` com base no tipo de equipamento, permitindo o preenchimento e salvamento no banco de dados, seguindo o layout da imagem de referência.

## Alterações Físicas

### Backend (Banco de Dados)
- Nenhuma alteração de esquema necessária (tabelas `ordens_servico`, `os_checklist` e `checklist_templates` já existem ou são tratadas como existentes via código).
- Garantir que a tabela `os_checklist` suporte os campos: `item`, `status`, `observacao`, `foto_url`.

### Frontend (Aplicação)
- Modificar `src/routes/_authenticated/os/$id.tsx`:
    - Adicionar busca do tipo de equipamento da OS.
    - Implementar lógica para carregar itens do `checklist_templates` caso a OS ainda não possua itens gravados em `os_checklist`.
    - Atualizar a UI da aba Checklist para corresponder à imagem (colunas: Item, Status, Observação, Foto).
    - Implementar validação de foto obrigatória para itens "Danificado" ou "Substituir".
    - Adicionar botão para "Finalizar Checklist" que avança o status da OS.

## Detalhes Técnicos
- Utilizar `useQuery` para buscar dados da OS e do Checklist.
- Utilizar `useMutation` (ou funções manuais com `supabase.from().upsert()`) para salvar as alterações em tempo real ou ao finalizar.
- Manter o padrão visual "Industrial Gold" (#FFD700) e cinza metálico.
- Mapear os status: Aprovado, Danificado, Substituir, Recuperar, Não Aplicável.

## Verificação
- Verificar se ao trocar o status para "Danificado", o sistema exige a foto.
- Validar se os itens carregados correspondem ao tipo de equipamento da OS.
- Confirmar se o salvamento persiste corretamente no Supabase.
