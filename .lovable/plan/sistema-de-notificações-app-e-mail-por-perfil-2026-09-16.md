# Sistema de notificações (app + e-mail, por perfil)

O banco já tem a estrutura de alertas/notificações, mas nenhuma tela usa. Este plano ativa notificações reais com regras prontas, sino no app e e-mail nos avisos importantes.

## O que será criado

### 1. Central de notificações no app
- Sino no topo de todas as telas com contador de não lidas.
- Ao clicar: lista de avisos (título, mensagem, data, link direto para a OS/tela relacionada).
- Marcar como lida individualmente e "marcar todas".
- Atualização automática a cada 30 segundos.

### 2. Regras prontas do sistema (disparo automático)
- **OS atribuída** → avisa o técnico/operador designado (app + e-mail).
- **Orçamento respondido pelo cliente** (aprovado, recusado ou pediu revisão) → avisa Diretor e Financeiro (app + e-mail).
- **Orçamento sem resposta há X dias** → aviso diário para Diretor e Financeiro (app).
- **OS parada há X dias** (sem movimento) → aviso diário para Gestor (app).
- **Peça de terceiro com prazo vencido** → aviso para Gestor (app).
- **Fornecedor com limite mensal estourado** → avisa Financeiro (app + e-mail).

### 3. Avisos por perfil
- Cada regra tem destinatários definidos por perfil (diretor, administrativo_financeiro, gestor, operador/tecnico).
- Cada usuário vê e recebe apenas os avisos do seu perfil.

### 4. E-mails
- Apenas os eventos importantes (itens marcados acima com e-mail) disparam e-mail, um por destinatário, no momento do evento.
- Layout profissional com a identidade da Alternativa Hidráulica e link direto para a OS.
- Pré-requisito: domínio de e-mail próprio configurado e verificado (a plataforma gerencia envio, reenvio e descadastro). Se o domínio ainda não estiver configurado, abro o assistente de configuração na hora da implantação; até lá os avisos funcionam só no app.

## Dados e segurança
- Usa as tabelas `alertas` e `notificacoes` já existentes (regras gravadas como registros de alerta ativos; histórico em `notificacoes`).
- Verificação das regras periódicas (sem resposta, OS parada, terceiro atrasado, limite estourado) por rotina agendada no banco, sem disparo duplicado no mesmo dia.
- Leitura de notificações restrita ao próprio usuário (RLS).

## Detalhes técnicos
- Componente de sino no layout autenticado (`dashboard.tsx`), com React Query e invalidação por tempo real.
- Regras periódicas via `pg_cron` chamando função SQL que gera as notificações; eventos imediatos (OS atribuída, resposta do cliente) via trigger/fluxo existente.
- E-mail via infraestrutura gerenciada da plataforma (domínio verificado, template React Email, um envio por destinatário com chave de idempotência).
- Migration incremental no banco oficial, com GRANT/RLS, seguida de recarga do cache.
- Verificação final: typecheck, build e teste manual de um disparo de cada tipo.
