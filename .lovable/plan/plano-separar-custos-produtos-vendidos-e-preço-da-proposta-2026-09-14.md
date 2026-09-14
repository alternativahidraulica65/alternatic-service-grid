# Plano: separar custos, produtos vendidos e preço da proposta

## Objetivo
Organizar o orçamento em três partes distintas:

1. **Custos reais de manutenção** — despesas internas do serviço, sem margem individual.
2. **Produtos para venda** — itens vendidos junto com o serviço, com custo e margem próprios.
3. **Itens da proposta ao cliente** — composição do valor do serviço que será apresentado ao cliente.

## Regra financeira recomendada
O indicador principal será a **margem líquida prevista do orçamento**, por representar o lucro estimado depois de todos os custos conhecidos:

```text
Receita do orçamento
− custos reais de manutenção
− custo dos produtos vendidos
− impostos
− comissão do vendedor
= lucro líquido previsto

Margem líquida prevista = lucro líquido previsto ÷ receita do orçamento × 100
```

Essa visão evita tratar despesas de manutenção como produtos e mostra quanto realmente tende a sobrar no orçamento.

## Alterações na tela

### 1. Card “Custos reais de manutenção”
- Manter os lançamentos existentes vindos dos custos da OS.
- Remover as colunas e controles de margem e venda individual.
- Exibir descrição, categoria, fornecedor e custo real.
- Totalizar apenas o custo de manutenção.
- Continuar permitindo adicionar, editar e remover custos, respeitando o valor mínimo já adotado pelo fluxo da OS.

### 2. Novo card “Produtos para venda”
- Criar um bloco separado e recolhível para produtos vendidos no mesmo orçamento, como a fabricação de um cilindro novo.
- Cada produto terá descrição, quantidade, custo unitário e margem percentual.
- Calcular automaticamente preço unitário e total de venda.
- Mostrar total de custo, total de venda e lucro previsto dos produtos no cabeçalho.
- Os produtos entrarão no PDF como itens vendidos ao cliente.

### 3. Card “Itens da proposta ao cliente”
- Manter os itens livres que representam o preço do serviço apresentado ao cliente.
- Totalizar `quantidade × valor unitário`.
- A receita sugerida será a soma dos itens da proposta com a venda dos produtos.
- O valor final continuará podendo ser ajustado manualmente.
- O PDF mostrará itens da proposta e produtos vendidos sem revelar custos, margens internas ou lucro.

### 4. Cálculo nos dois sentidos
Adicionar dois modos claros no resumo financeiro:

- **Definir valor do orçamento:** o usuário informa o valor final desejado; o sistema calcula lucro líquido e margem líquida previstos.
- **Definir margem desejada:** o usuário informa a margem líquida desejada; o sistema calcula o valor final necessário para atingi-la.

O cálculo da margem desejada considerará custo de manutenção, custo dos produtos, imposto e a regra efetiva de comissão do vendedor. Como algumas comissões variam por faixa ou pela própria margem, o valor necessário será resolvido usando a regra real cadastrada, não uma porcentagem fixa presumida.

### 5. Resumo financeiro
Exibir separadamente:
- custo de manutenção;
- custo dos produtos vendidos;
- custo total direto;
- valor dos itens de serviço da proposta;
- venda dos produtos;
- receita final ao cliente;
- impostos;
- comissão;
- lucro líquido previsto em reais;
- margem líquida prevista em percentual.

Se o valor final manual ficar abaixo dos custos e encargos, destacar margem negativa de forma clara.

## Banco de dados
Evoluir incrementalmente `orcamento_itens`, preservando todos os itens existentes como itens de proposta:
- adicionar tipo do item (`proposta` ou `produto`), com padrão `proposta`;
- adicionar custo unitário e margem percentual para produtos;
- manter quantidade e valor unitário, usando o valor unitário como preço calculado de venda do produto;
- manter GRANT e RLS atuais, sem exclusão ou recriação de dados.

## PDF
- Agrupar visualmente os serviços da proposta e os produtos vendidos.
- Usar o mesmo valor final salvo na tela.
- Não exibir custos internos, margens, lucro ou comissão, salvo a opção já existente para mostrar comissão.
- Quando houver ajuste manual entre a soma das linhas e o total final, apresentar uma linha de ajuste comercial para o documento fechar exatamente no valor aprovado.

## Validação
- Confirmar que custos existentes aparecem sem margem individual.
- Testar inclusão, edição e remoção de produto vendido.
- Verificar cálculo pelo valor informado e pela margem desejada.
- Conferir margem positiva, zerada e negativa.
- Confirmar igualdade entre o total da tela, o valor salvo na OS e o PDF.
- Validar que itens antigos continuam classificados como proposta.
