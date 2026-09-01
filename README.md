# Alternativa Hidráulica Login

Crie a tela de Login (Tela 1) para um sistema ERP web de alta performance voltado para a gestão industrial e de ordens de serviço (OS) da empresa de manutenção hidráulica "Alternativa Hidráulica".

### Contexto e Objetivo do Aplicativo:
Este aplicativo é a ferramenta central de operação da empresa, projetada para controlar todo o ciclo de vida dos serviços que chegam à oficina: desde a triagem com captura de dados e fotos, passando pela fila técnica dos montadores (Kanban), levantamento de custos de matérias-primas e serviços terceirizados, aprovação de orçamentos e margens pela diretoria, até o faturamento, controle de SLA e comunicação formal com o cliente. O sistema garante o rastreamento rigoroso de prazos, controle financeiro em tempo real e automação de numeração de orçamentos por cliente.

### Diretrizes Técnicas e de Arquitetura:
- Conexão nativa e obrigatória desde já com o projeto Supabase existente para autenticação e manipulação segura de dados:
  * URL do Projeto: https://mpwnrcxyyeqftrejwmmx.supabase.co
  * Organização: alternativahidraulica65's Org
- Integração estrita com a tabela de 'usuarios' e o sistema de controle de perfis baseados em papéis (RBAC): Diretor, Financeiro, Gestor e Operador.

### Diretrizes de Design (Identidade Visual Industrial):
- Paleta de cores inspirada na identidade da marca: Amarelo/Dourado industrial (cor primária para botões de ação principal, destaques e chamadas visuais), Cinza Metálico (para estruturas, bordas e barras de navegação), fundos limpos em branco e cinza claro, com tipografia em preto e cinza chumbo escuro.
- Estilo: Interface limpa, profissional, séria e robusta, voltada para o ambiente de chão de fábrica, contando com botões de bordas levemente arredondadas e cards estruturados com sombras sutis para dar profundidade.
- Tipografia: Uso de fontes modernas, geométricas e de altíssima legibilidade (como Montserrat ou Roboto para títulos e Inter para textos e dados numéricos).

### O que construir nesta etapa (Tela 1 - Login):
- Uma tela de login centralizada, altamente responsiva e visualmente impecável.
- Campos limpos e intuitivos para e-mail e senha, conectados diretamente ao fluxo de autenticação do Supabase.
- Botão de entrada robusto estilizado com a cor primária da marca (Amarelo/Dourado industrial).
- Um rodapé profissional e discreto indicando a marca ("Alternativa Hidráulica").
- Foque exclusivamente nesta primeira tela de login, validando a conexão com o banco de dados e aplicando com precisão a identidade visual industrial definida.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/15e15ceb-c7e2-47fe-90f0-cf091fac34ca).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
