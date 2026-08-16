# Plano de Implementação: Tela de Nova OS e Triagem

Este plano descreve a implementação da terceira tela do ERP "Alternativa Hidráulica", focada na abertura de Ordens de Serviço (OS), rastreabilidade de peças e monitoramento da fila de produção (especialmente o gargalo do torneiro).

## Alterações Sugeridas

### 1. Banco de Dados (Supabase)
*   **Novas Tabelas**:
    *   `pecas_os`: Registro de sub-itens retirados durante a desmontagem (nome, localização física, link da foto, OS vinculada).
    *   `historico_processo_os`: Rastreabilidade do status (Triagem, Desmontagem, Torneiro, Montagem, Teste).
*   **Bucket de Storage**:
    *   `os-assets`: Para armazenamento das fotos das peças.

### 2. Frontend (TanStack Start)
*   **Nova Rota**: `src/routes/_authenticated/nova-os.tsx`.
*   **Funcionalidades**:
    *   **Formulário de Abertura**: Seleção de cliente, tipo de equipamento (Cilindro, Bomba, Motor) e checklist dinâmico.
    *   **Módulo de Peças**: Interface para listar peças retiradas, definir gaveta/caixa e botão de upload de foto.
    *   **Kanban de Status**: Visualização do progresso global da OS.
    *   **Dashboard do Torneiro**: Widget destacado com contador de serviços na fila e listagem de tarefas atuais.

### 3. Design e Experiência do Usuário
*   Manutenção do estilo industrial (Cinza Metálico, Amarelo/Dourado).
*   Botões grandes e campos de fácil toque para uso em tablets na oficina.

## Detalhes Técnicos
*   Utilização de `sonner` para notificações de upload e salvamento.
*   Integração com Supabase Storage para persistência de imagens.
*   Uso de `lucide-react` para ícones técnicos (Câmera, Wrench, Box, UserCheck).

## Considerações de Segurança
*   Políticas RLS para garantir que operadores só manipulem OS atribuídas ou de sua competência.
*   Grants necessários na `public` schema para as novas tabelas.
