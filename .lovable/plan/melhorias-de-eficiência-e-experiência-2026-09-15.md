# Melhorias de eficiência e experiência

Sugestões priorizadas, pensando no dia a dia de quem usa o sistema (oficina, gestor, financeiro e diretoria). Nada aqui muda regras financeiras já validadas — são ganhos de agilidade e clareza.

## Prioridade 1 — ganho imediato de tempo

1. **Busca global (Ctrl+K)**
   Um campo único no topo para achar OS pelo número, cliente, placa/equipamento ou peça, e ir direto para a tela. Hoje é preciso navegar por menus.

2. **Barra de ação rápida na OS**
   Botões fixos no topo da OS: próxima fase, anexar foto, lançar custo, abrir orçamento, imprimir. Evita rolar a página inteira.

3. **"O que falta nesta OS"**
   Um bloco curto listando as pendências que travam o avanço (itens do checklist sem resposta, custo abaixo do mínimo, laudo vazio), cada uma clicável e levando ao campo. Hoje a informação aparece só como aviso ao tentar avançar.

4. **Duplicar OS e orçamento**
   Botão para criar uma nova OS/orçamento a partir de um existente, mantendo itens e condições. Serviços repetidos ficam em segundos.

## Prioridade 2 — controle e visibilidade

5. **Filtros salvos e exportação em todas as listas**
   Estender o padrão já usado em Clientes (seleção de linhas + exportar) para OS, fornecedores e lançamentos, com filtros por período, status, vendedor e empresa emissora.

6. **Coluna "parado há X dias" no Kanban e alerta de estagnação**
   Cartão muda de cor após um limite configurável por coluna. Mostra gargalo real (usinagem, terceiros) sem relatório.

7. **Painel de terceiros**
   Lista única de tudo que está fora da empresa, com prazo prometido, dias em atraso e botão de registrar retorno. Hoje a informação está espalhada por OS.

8. **Histórico visível na OS**
   Linha do tempo com quem mudou o quê e quando, já que os registros existem, apresentada de forma legível dentro da OS.

## Prioridade 3 — experiência de campo e comunicação

9. **Modo oficina (mobile)**
   Checklist e fotos em tela cheia, botões grandes, foto direto da câmera, e envio em fila quando a internet cair.

10. **Envio do orçamento ao cliente**
    Botão para gerar link ou anexo do PDF e registrar data de envio; campo para anotar a resposta do cliente (aprovado, recusado, pediu revisão) com motivo.

11. **Lembretes automáticos**
    Aviso para orçamentos sem resposta há X dias e OS sem movimento, no painel de Diretor e Financeiro.

12. **Notas internas na OS**
    Campo de comentários com menção a colega, separado das observações que saem no documento do cliente.

## Prioridade 4 — cadastros e consistência

13. **Campos de endereço estruturados no cliente** (cidade, estado, CEP) para filtrar e exportar por região de verdade, em vez de depender de texto livre.
14. **Preenchimento de CNPJ** buscando dados públicos da empresa ao cadastrar cliente ou fornecedor.
15. **Modelos de checklist por tipo de equipamento** aplicados automaticamente na criação da OS.
16. **Anexos com categoria** (antes, durante, depois, nota fiscal) para escolher fotos do PDF mais rápido.

## Observação técnica

Cada item acima é independente e pode ser implementado isoladamente. Alguns exigem ajuste de banco (endereço estruturado, notas internas, resposta do cliente ao orçamento, limites de estagnação por coluna) — sempre por migração incremental, com RLS e GRANT, no banco em uso.

## Próximo passo

Escolha os itens que quer primeiro (sugestão: 1, 2, 3 e 6) e eu detalho o plano de implementação de cada um.
