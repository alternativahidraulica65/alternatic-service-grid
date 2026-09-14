# Plano: cards recolhíveis e totalizadores do orçamento

## Objetivo
Deixar os principais blocos do orçamento mais fáceis de navegar, com abertura/fechamento por ícone e totais visíveis no cabeçalho.

## Alterações na tela de orçamento

### 1. Abrir e fechar blocos
- Adicionar um ícone de seta no cabeçalho de **Custos reais**, **Itens da proposta**, **Fotos do PDF** e **Condições comerciais**.
- O clique no cabeçalho ou no ícone alternará entre conteúdo aberto e recolhido.
- Manter os blocos abertos por padrão e preservar todos os campos e ações existentes.
- Usar estados independentes, permitindo fechar um bloco sem afetar os demais.
- Incluir indicação acessível de “Abrir” ou “Fechar” para cada controle.

### 2. Totalizadores nos cabeçalhos
- **Custos reais:** mostrar o custo real total e o total de venda calculado desses itens.
- **Itens da proposta ao cliente:** mostrar a soma de `quantidade × valor unitário` de todos os itens livres.
- **Fotos do PDF:** mostrar a quantidade selecionada em relação ao total disponível.
- **Condições comerciais:** não receberá total monetário, pois não possui uma lista de valores somáveis.
- Os totalizadores continuarão visíveis mesmo quando o bloco estiver fechado.

### 3. Composição do valor final
- Manter a regra atual escolhida: **venda dos custos reais + itens da proposta + imposto**, respeitando eventual ajuste manual do valor final.
- Destacar no bloco **Itens da proposta ao cliente** que o total exibido é a soma integral desses itens e que esse valor entra integralmente na composição do valor final.
- Garantir que a tela e o PDF usem a mesma soma dos itens da proposta, evitando divergências entre edição, resumo e documento final.

## Validação
- Conferir abertura e fechamento independente dos quatro blocos em computador e celular.
- Confirmar atualização imediata dos totais ao adicionar, editar ou remover itens.
- Validar que o valor final e o PDF permanecem consistentes com a regra atual.
- Confirmar que salvar, gerar PDF e enviar para aprovação continuam funcionando.

## Detalhes técnicos
- Alteração somente na apresentação e nos cálculos derivados já existentes; nenhuma mudança de banco de dados.
- Reutilizar os cálculos atuais de `custoTotal`, `vendaItens` e soma dos itens da proposta como fonte única para os totalizadores.
- Usar os componentes e tokens visuais já adotados pela tela.
