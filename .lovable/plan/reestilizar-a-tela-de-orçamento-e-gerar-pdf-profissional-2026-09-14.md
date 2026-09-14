# Reestilizar a tela de Orçamento e gerar PDF profissional

A tela de orçamento ganha um visual industrial mais limpo (blocos bem separados, tipografia forte, amarelo só nas ações) e passa a produzir uma proposta em PDF pronta para enviar ao cliente.

## 1. Itens livres do orçamento (valores de apresentação)

Novo bloco "Itens da proposta ao cliente", separado dos custos reais da OS:

- Criar linhas livres com descrição, quantidade, valor unitário e total.
- Esses itens **não** viram custo da OS e não afetam o custo real nem o lucro interno.
- Entram no valor apresentado ao cliente e aparecem no PDF junto com os itens reais.
- O resumo financeiro mostra lado a lado: valor ao cliente, custo real, lucro e margem — deixando claro quanto do valor é apresentação.

## 2. Dados de empresa e vendedor com edição só no orçamento

- Empresa emissora (nome, razão social, CNPJ, endereço, telefone, e-mail, logo) e vendedor (nome, telefone, e-mail) vêm preenchidos do cadastro.
- Cada bloco ganha um ícone de lápis que abre a edição desses campos **apenas para este orçamento**.
- O que for editado fica gravado no orçamento, então reimprimir depois gera o mesmo PDF. O cadastro da empresa e do vendedor não muda.
- Um aviso discreto indica quando um campo foi alterado em relação ao cadastro, com opção de restaurar o valor original.

## 3. Fotos da OS no PDF

- Galeria com todas as fotos da OS (checklist e peças), cada uma com caixa de seleção e legenda.
- Só as selecionadas entram no PDF, em uma seção "Registro fotográfico" com grade de 2 ou 3 por linha.
- Nenhuma selecionada: o PDF sai sem seção de fotos, sem espaço vazio.

## 4. Botão "Gerar PDF"

Gera uma proposta em página A4 com:

- Cabeçalho com logo, dados da empresa emissora e número/data do orçamento.
- Dados do cliente e do equipamento/OS.
- Resumo do laudo técnico (diagnóstico e serviços necessários).
- Tabela de itens (reais + livres) com quantidade, unitário e total; totais, imposto e valor final.
- Condições comerciais: prazo de entrega, garantia, validade, forma de pagamento e observações.
- Registro fotográfico (quando houver seleção).
- Rodapé com vendedor responsável e contato.

Valores internos (custo, margem, lucro, comissão) **nunca** aparecem no PDF.

## 5. Logo e dados da empresa em Configurações

Na aba Configurações, cada CNPJ emissor passa a ter: logo (upload de imagem), endereço, telefone, e-mail e site — usados no cabeçalho do PDF.

## Detalhes técnicos

- Banco:
  - `configuracoes_empresa`: novas colunas `logo_url`, `endereco`, `telefone`, `email`, `site`.
  - Bucket público `empresa-assets` para as logos, com política de leitura pública e escrita restrita a diretor/financeiro.
  - Nova tabela `public.orcamento_itens` (`os_id`, `descricao`, `quantidade`, `valor_unitario`, `ordem`) para os itens livres, com GRANT + RLS (leitura para autenticado, escrita para diretor/financeiro).
  - Nova tabela `public.orcamento_dados` (`os_id` único, `empresa_snapshot` jsonb, `vendedor_snapshot` jsonb, `fotos_selecionadas` uuid[], `condicoes` jsonb) para guardar as edições pontuais e a seleção de fotos.
- Tela `src/routes/_authenticated/os/$id.orcamento.tsx` reorganizada em seções; blocos extraídos para `src/components/orcamento/` (`BlocoEmissor`, `ItensLivres`, `SeletorFotos`, `ResumoFinanceiro`).
- PDF: novo documento imprimível em `src/components/orcamento/PropostaPdf.tsx`, renderizado em rota dedicada `/os/$id/proposta` com CSS `@page A4` e `@media print`, acionado por `window.print()` — sem dependência nova.
- Fotos: leitura de `fotos_anexos` com URLs assinadas (padrão já usado em `FotoThumb`).
- Sem alteração nas regras de fluxo da OS (`src/lib/os-fluxo.ts`) nem nos bloqueios de fase existentes.
- Ao final: build validado e conferência do layout do PDF em A4.
