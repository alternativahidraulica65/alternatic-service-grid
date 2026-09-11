# Corrigir estabilidade do login

## Objetivo
Garantir que uma autenticação válida sempre conclua a entrada no sistema, sem retornar indevidamente à tela de login.

## Alterações
- Remover verificações e redirecionamentos duplicados da tela de entrada.
- Após autenticar, confirmar a sessão, atualizar o estado de navegação e então abrir o painel.
- Fazer a área protegida redirecionar antes de renderizar quando não houver uma sessão válida, evitando disputa entre telas.
- Corrigir a busca do perfil para usar o vínculo correto com a conta autenticada.
- Manter mensagens distintas para senha incorreta, conta inativa e falha temporária.

## Validação
- Testar entrada, atualização da página já autenticada e saída.
- Confirmar que o painel abre sem retorno automático à tela inicial.
- Verificar os registros de execução e compilação.
