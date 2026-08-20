# Plan: Sistema de Alertas e Notificações

Implementar um sistema robusto de alertas e notificações para a Alternativa Hidráulica, abrangendo desde a infraestrutura do banco de dados até as interfaces de administração e do usuário, com suporte a múltiplos canais.

## User Review Required

> [!IMPORTANT]
> A implementação de notificações Push e E-mail requer chaves de API externas (FCM e SendGrid/Mailgun). O sistema será construído de forma modular para que essas integrações possam ser ativadas assim que as chaves forem fornecidas via `add_secret`.

- A interface de administração de alertas permite definir condições de disparo baseadas em qualquer tabela do sistema.
- Notificações internas no app serão sincronizadas em tempo real via Supabase Realtime.

## Proposed Changes

### Database Schema (Supabase)
- Criar tipos enum: `tipo_alerta` (informativo, aviso, erro, urgente), `canal_notificacao` (email, push, app_interno), `status_envio` (enviado, falha, lido).
- Criar tabela `public.alertas`: Armazena definições de alertas, condições de disparo (JSONB) e destinatários.
- Criar tabela `public.notificacoes`: Registra o envio de notificações individuais para usuários, histórico e status de leitura.
- Habilitar RLS em ambas as tabelas com permissões RBAC apropriadas.
- Criar trigger global ou função de processo para avaliar condições de disparo em eventos de `INSERT/UPDATE` nas tabelas principais (`ordens_servico`, `pedidos`, etc).

### Backend & Business Logic
- Desenvolver `src/lib/notifications/engine.functions.ts`: Lógica para processar disparos, filtrar destinatários e encaminhar para os provedores de canal.
- Implementar mock/placeholder para provedores de E-mail e Push, prontos para integração real.

### Admin Interface (`/admin/alertas`)
- Desenvolver `src/routes/_authenticated/admin/alertas.tsx`.
- Lista de alertas com filtros e ações (Editar/Excluir/Ativar).
- Formulário dinâmico para criação de alertas:
  - Seleção de modelo de dados (OS, Clientes, Financeiro).
  - Construtor de condições visual (Campo, Operador, Valor).
  - Seletor de destinatários (por Role ou Usuário específico).

### User Interface & Header
- Desenvolver `src/routes/_authenticated/notificacoes.tsx`: Central de notificações do usuário com marcação de leitura.
- Atualizar `src/routes/_authenticated/route.tsx` (ou componente de Nav):
  - Adicionar contador de notificações não lidas no cabeçalho.
  - Implementar Popover de notificações rápidas.

## Technical Details
- **Realtime**: Uso de `supabase.channel('notificacoes')` para atualização instantânea do badge no header.
- **Zod**: Validação rigorosa das condições de disparo JSON no admin.
- **Lucide Icons**: Uso de ícones semânticos para os diferentes tipos de alerta.
- **Tailwind v4**: Estilização seguindo o design industrial gold/slate.
