export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alertas: {
        Row: {
          ativo: boolean
          canais_notificacao: string[]
          condicao_disparo: Json
          criado_por: string | null
          data_criacao: string
          destinatarios: string[]
          id: string
          mensagem: string
          tempo_expiracao: string | null
          tipo: string
          titulo: string
        }
        Insert: {
          ativo?: boolean
          canais_notificacao: string[]
          condicao_disparo: Json
          criado_por?: string | null
          data_criacao?: string
          destinatarios: string[]
          id?: string
          mensagem: string
          tempo_expiracao?: string | null
          tipo: string
          titulo: string
        }
        Update: {
          ativo?: boolean
          canais_notificacao?: string[]
          condicao_disparo?: Json
          criado_por?: string | null
          data_criacao?: string
          destinatarios?: string[]
          id?: string
          mensagem?: string
          tempo_expiracao?: string | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      auditoria_financeira: {
        Row: {
          acao: string
          criado_em: string | null
          id: string
          registro_id: string
          tabela: string
          user_id: string | null
          valores_antigos: Json | null
          valores_novos: Json | null
        }
        Insert: {
          acao: string
          criado_em?: string | null
          id?: string
          registro_id: string
          tabela: string
          user_id?: string | null
          valores_antigos?: Json | null
          valores_novos?: Json | null
        }
        Update: {
          acao?: string
          criado_em?: string | null
          id?: string
          registro_id?: string
          tabela?: string
          user_id?: string | null
          valores_antigos?: Json | null
          valores_novos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_financeira_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      bancadas: {
        Row: {
          ativo: boolean
          codigo: string
          criado_em: string
          id: string
          is_usinagem: boolean
          nome: string
          tecnico_nome: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          codigo: string
          criado_em?: string
          id?: string
          is_usinagem?: boolean
          nome: string
          tecnico_nome?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          codigo?: string
          criado_em?: string
          id?: string
          is_usinagem?: boolean
          nome?: string
          tecnico_nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          componente_peca: string | null
          criado_em: string
          criado_por: string | null
          descricao_avaliacao: string | null
          id: string
          itens: Json | null
          nome: string | null
          ordem_exibicao: number | null
          tipo_equipamento_id: string | null
        }
        Insert: {
          componente_peca?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao_avaliacao?: string | null
          id?: string
          itens?: Json | null
          nome?: string | null
          ordem_exibicao?: number | null
          tipo_equipamento_id?: string | null
        }
        Update: {
          componente_peca?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao_avaliacao?: string | null
          id?: string
          itens?: Json | null
          nome?: string | null
          ordem_exibicao?: number | null
          tipo_equipamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_tipo_equipamento_id_fkey"
            columns: ["tipo_equipamento_id"]
            isOneToOne: false
            referencedRelation: "tipos_equipamento"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_equipamentos: {
        Row: {
          cliente_id: string
          created_at: string | null
          fabricante: string | null
          id: string
          modelo: string | null
          nome: string
          numero_serie: string | null
          tipo: string | null
          ultima_manutencao: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          fabricante?: string | null
          id?: string
          modelo?: string | null
          nome: string
          numero_serie?: string | null
          tipo?: string | null
          ultima_manutencao?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          fabricante?: string | null
          id?: string
          modelo?: string | null
          nome?: string
          numero_serie?: string | null
          tipo?: string | null
          ultima_manutencao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_equipamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          cnpj: string | null
          criado_em: string | null
          email: string | null
          endereco: string | null
          id: string
          motivo_reprovacao: string | null
          nome: string
          razao_social: string | null
          solicitado_por: string | null
          status_cadastro: string
          telefone: string | null
          ultimo_numero_orcamento: number | null
          updated_at: string | null
          venda_propria: boolean
          vendedor_id: string | null
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cnpj?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          motivo_reprovacao?: string | null
          nome: string
          razao_social?: string | null
          solicitado_por?: string | null
          status_cadastro?: string
          telefone?: string | null
          ultimo_numero_orcamento?: number | null
          updated_at?: string | null
          venda_propria?: boolean
          vendedor_id?: string | null
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          cnpj?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          motivo_reprovacao?: string | null
          nome?: string
          razao_social?: string | null
          solicitado_por?: string | null
          status_cadastro?: string
          telefone?: string | null
          ultimo_numero_orcamento?: number | null
          updated_at?: string | null
          venda_propria?: boolean
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_empresa: {
        Row: {
          condicoes_pagamento: string | null
          created_at: string
          empresa_id: string
          id: string
          imposto_padrao: number
          margem_padrao: number
          observacoes_orcamento: string | null
          prazo_entrega_padrao: number
          prazo_garantia_padrao: number
          updated_at: string
          validade_orcamento_dias: number
        }
        Insert: {
          condicoes_pagamento?: string | null
          created_at?: string
          empresa_id: string
          id?: string
          imposto_padrao?: number
          margem_padrao?: number
          observacoes_orcamento?: string | null
          prazo_entrega_padrao?: number
          prazo_garantia_padrao?: number
          updated_at?: string
          validade_orcamento_dias?: number
        }
        Update: {
          condicoes_pagamento?: string | null
          created_at?: string
          empresa_id?: string
          id?: string
          imposto_padrao?: number
          margem_padrao?: number
          observacoes_orcamento?: string | null
          prazo_entrega_padrao?: number
          prazo_garantia_padrao?: number
          updated_at?: string
          validade_orcamento_dias?: number
        }
        Relationships: [
          {
            foreignKeyName: "configuracoes_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas_emissoras"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_vendedores: {
        Row: {
          id: string
          porcentagem_padrao: number | null
          regra_comissao: Database["public"]["Enums"]["tipo_comissao"] | null
          user_id: string
        }
        Insert: {
          id?: string
          porcentagem_padrao?: number | null
          regra_comissao?: Database["public"]["Enums"]["tipo_comissao"] | null
          user_id: string
        }
        Update: {
          id?: string
          porcentagem_padrao?: number | null
          regra_comissao?: Database["public"]["Enums"]["tipo_comissao"] | null
          user_id?: string
        }
        Relationships: []
      }
      contatos_cliente: {
        Row: {
          cargo: string | null
          cliente_id: string
          created_at: string | null
          email: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          cargo?: string | null
          cliente_id: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          telefone?: string | null
        }
        Update: {
          cargo?: string | null
          cliente_id?: string
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_contatos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas_emissoras: {
        Row: {
          ativo: boolean
          cnpj: string
          cor_identificacao: string | null
          criado_em: string | null
          email: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nome: string
          razao_social: string | null
          site: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          cnpj: string
          cor_identificacao?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          razao_social?: string | null
          site?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          cnpj?: string
          cor_identificacao?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          razao_social?: string | null
          site?: string | null
          telefone?: string | null
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          ativo: boolean | null
          cnpj: string | null
          contato: string | null
          criado_em: string | null
          id: string
          limite_mensal: number | null
          motivo_reprovacao: string | null
          nome: string
          observacoes: string | null
          solicitado_por: string | null
          status_cadastro: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean | null
          cnpj?: string | null
          contato?: string | null
          criado_em?: string | null
          id?: string
          limite_mensal?: number | null
          motivo_reprovacao?: string | null
          nome: string
          observacoes?: string | null
          solicitado_por?: string | null
          status_cadastro?: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          ativo?: boolean | null
          cnpj?: string | null
          contato?: string | null
          criado_em?: string | null
          id?: string
          limite_mensal?: number | null
          motivo_reprovacao?: string | null
          nome?: string
          observacoes?: string | null
          solicitado_por?: string | null
          status_cadastro?: string
        }
        Relationships: []
      }
      fotos_anexos: {
        Row: {
          bucket: string | null
          categoria: string | null
          criado_em: string | null
          criado_por: string | null
          foto_url: string
          id: string
          legenda: string | null
          os_id: string
          peca_id: string | null
          storage_path: string | null
          tipo: string | null
        }
        Insert: {
          bucket?: string | null
          categoria?: string | null
          criado_em?: string | null
          criado_por?: string | null
          foto_url: string
          id?: string
          legenda?: string | null
          os_id: string
          peca_id?: string | null
          storage_path?: string | null
          tipo?: string | null
        }
        Update: {
          bucket?: string | null
          categoria?: string | null
          criado_em?: string | null
          criado_por?: string | null
          foto_url?: string
          id?: string
          legenda?: string | null
          os_id?: string
          peca_id?: string | null
          storage_path?: string | null
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_fotos_anexos_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_fotos_anexos_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "os_guarda_pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_status_os: {
        Row: {
          criado_em: string | null
          executor_email: string | null
          executor_id: string | null
          id: string
          observacao: string | null
          os_id: string
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          criado_em?: string | null
          executor_email?: string | null
          executor_id?: string | null
          id?: string
          observacao?: string | null
          os_id: string
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          criado_em?: string | null
          executor_email?: string | null
          executor_id?: string | null
          id?: string
          observacao?: string | null
          os_id?: string
          status_anterior?: string | null
          status_novo?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_processo_os_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_pedido: {
        Row: {
          criado_em: string | null
          id: string
          pedido_id: string | null
          preco_unitario: number
          produto_id: string | null
          quantidade: number
          subtotal: number
        }
        Insert: {
          criado_em?: string | null
          id?: string
          pedido_id?: string | null
          preco_unitario: number
          produto_id?: string | null
          quantidade?: number
          subtotal: number
        }
        Update: {
          criado_em?: string | null
          id?: string
          pedido_id?: string | null
          preco_unitario?: number
          produto_id?: string | null
          quantidade?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "itens_pedido_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_pedido_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      lancamentos_financeiros: {
        Row: {
          cliente_id: string | null
          criado_em: string | null
          data_competencia: string
          descricao: string | null
          fornecedor_id: string | null
          id: string
          os_id: string | null
          tipo: string | null
          valor: number
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string | null
          data_competencia?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          os_id?: string | null
          tipo?: string | null
          valor: number
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string | null
          data_competencia?: string
          descricao?: string | null
          fornecedor_id?: string | null
          id?: string
          os_id?: string | null
          tipo?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "lancamentos_financeiros_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lancamentos_financeiros_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_sistema: {
        Row: {
          acao: string
          criado_em: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          entidade: string
          id: string
          os_id: string | null
          os_numero: string | null
          registro_id: string | null
          usuario_id: string | null
          usuario_nome: string | null
        }
        Insert: {
          acao: string
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          entidade?: string
          id?: string
          os_id?: string | null
          os_numero?: string | null
          registro_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Update: {
          acao?: string
          criado_em?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          entidade?: string
          id?: string
          os_id?: string | null
          os_numero?: string | null
          registro_id?: string | null
          usuario_id?: string | null
          usuario_nome?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_sistema_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logs_sistema_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      materias_primas: {
        Row: {
          criado_em: string | null
          densidade: number
          id: string
          nome: string
          preco_base_kg: number
        }
        Insert: {
          criado_em?: string | null
          densidade: number
          id?: string
          nome: string
          preco_base_kg: number
        }
        Update: {
          criado_em?: string | null
          densidade?: number
          id?: string
          nome?: string
          preco_base_kg?: number
        }
        Relationships: []
      }
      notificacoes: {
        Row: {
          alerta_id: string | null
          canal_utilizado: string
          data_envio: string
          id: string
          mensagem_enviada: string
          metadados: Json | null
          status_envio: string
          titulo_enviado: string | null
          usuario_id: string
        }
        Insert: {
          alerta_id?: string | null
          canal_utilizado: string
          data_envio?: string
          id?: string
          mensagem_enviada: string
          metadados?: Json | null
          status_envio?: string
          titulo_enviado?: string | null
          usuario_id: string
        }
        Update: {
          alerta_id?: string | null
          canal_utilizado?: string
          data_envio?: string
          id?: string
          mensagem_enviada?: string
          metadados?: Json | null
          status_envio?: string
          titulo_enviado?: string | null
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_alerta_id_fkey"
            columns: ["alerta_id"]
            isOneToOne: false
            referencedRelation: "alertas"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_dados: {
        Row: {
          condicoes: Json | null
          created_at: string
          empresa_snapshot: Json | null
          fotos_selecionadas: string[]
          id: string
          os_id: string
          updated_at: string
          vendedor_snapshot: Json | null
        }
        Insert: {
          condicoes?: Json | null
          created_at?: string
          empresa_snapshot?: Json | null
          fotos_selecionadas?: string[]
          id?: string
          os_id: string
          updated_at?: string
          vendedor_snapshot?: Json | null
        }
        Update: {
          condicoes?: Json | null
          created_at?: string
          empresa_snapshot?: Json | null
          fotos_selecionadas?: string[]
          id?: string
          os_id?: string
          updated_at?: string
          vendedor_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_dados_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: true
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_itens: {
        Row: {
          created_at: string
          custo_unitario: number
          descricao: string
          id: string
          margem_percentual: number
          ordem: number
          os_id: string
          quantidade: number
          tipo_item: string
          updated_at: string
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          custo_unitario?: number
          descricao: string
          id?: string
          margem_percentual?: number
          ordem?: number
          os_id: string
          quantidade?: number
          tipo_item?: string
          updated_at?: string
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          custo_unitario?: number
          descricao?: string
          id?: string
          margem_percentual?: number
          ordem?: number
          os_id?: string
          quantidade?: number
          tipo_item?: string
          updated_at?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_itens_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamento_revisoes: {
        Row: {
          criado_em: string
          criado_por: string | null
          fotos_selecionadas: string[]
          id: string
          numero_orcamento: string | null
          numero_revisao: number
          orcamento_id: string
          parametros: Json | null
          pdf_storage_path: string
          valor_total: number
        }
        Insert: {
          criado_em?: string
          criado_por?: string | null
          fotos_selecionadas?: string[]
          id?: string
          numero_orcamento?: string | null
          numero_revisao?: number
          orcamento_id: string
          parametros?: Json | null
          pdf_storage_path: string
          valor_total?: number
        }
        Update: {
          criado_em?: string
          criado_por?: string | null
          fotos_selecionadas?: string[]
          id?: string
          numero_orcamento?: string | null
          numero_revisao?: number
          orcamento_id?: string
          parametros?: Json | null
          pdf_storage_path?: string
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "orcamento_revisoes_orcamento_id_fkey"
            columns: ["orcamento_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      orcamentos: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_emissao: string | null
          id: string
          numero_orcamento: string
          observacoes: string | null
          status: string | null
          validade: string | null
          valor_total: number | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_emissao?: string | null
          id?: string
          numero_orcamento: string
          observacoes?: string | null
          status?: string | null
          validade?: string | null
          valor_total?: number | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_emissao?: string | null
          id?: string
          numero_orcamento?: string
          observacoes?: string | null
          status?: string | null
          validade?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orcamentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      ordens_servico: {
        Row: {
          cliente: string
          cliente_id: string | null
          comissao_calculada: number | null
          criado_em: string | null
          custo_base: number | null
          data_abertura: string | null
          data_entrega: string | null
          data_previsao_conclusao: string | null
          descricao: string | null
          empresa_id: string | null
          entregue_por: string | null
          id: string
          imposto_aplicado: number | null
          laudo_defeitos: string | null
          laudo_diagnostico: string | null
          laudo_servicos_necessarios: string | null
          margem_lucro: number | null
          margem_lucro_aplicada: number | null
          numero_os: string
          observacoes: string | null
          operador_atribuido: string | null
          orcamento_enviado_em: string | null
          prazo_orcamento: string | null
          prioridade: string | null
          status: string
          status_financeiro: string | null
          tecnico_id: string | null
          testado: boolean | null
          tipo_equipamento_id: string | null
          updated_at: string | null
          valor_final: number | null
          valor_total: number | null
        }
        Insert: {
          cliente: string
          cliente_id?: string | null
          comissao_calculada?: number | null
          criado_em?: string | null
          custo_base?: number | null
          data_abertura?: string | null
          data_entrega?: string | null
          data_previsao_conclusao?: string | null
          descricao?: string | null
          empresa_id?: string | null
          entregue_por?: string | null
          id?: string
          imposto_aplicado?: number | null
          laudo_defeitos?: string | null
          laudo_diagnostico?: string | null
          laudo_servicos_necessarios?: string | null
          margem_lucro?: number | null
          margem_lucro_aplicada?: number | null
          numero_os: string
          observacoes?: string | null
          operador_atribuido?: string | null
          orcamento_enviado_em?: string | null
          prazo_orcamento?: string | null
          prioridade?: string | null
          status?: string
          status_financeiro?: string | null
          tecnico_id?: string | null
          testado?: boolean | null
          tipo_equipamento_id?: string | null
          updated_at?: string | null
          valor_final?: number | null
          valor_total?: number | null
        }
        Update: {
          cliente?: string
          cliente_id?: string | null
          comissao_calculada?: number | null
          criado_em?: string | null
          custo_base?: number | null
          data_abertura?: string | null
          data_entrega?: string | null
          data_previsao_conclusao?: string | null
          descricao?: string | null
          empresa_id?: string | null
          entregue_por?: string | null
          id?: string
          imposto_aplicado?: number | null
          laudo_defeitos?: string | null
          laudo_diagnostico?: string | null
          laudo_servicos_necessarios?: string | null
          margem_lucro?: number | null
          margem_lucro_aplicada?: number | null
          numero_os?: string
          observacoes?: string | null
          operador_atribuido?: string | null
          orcamento_enviado_em?: string | null
          prazo_orcamento?: string | null
          prioridade?: string | null
          status?: string
          status_financeiro?: string | null
          tecnico_id?: string | null
          testado?: boolean | null
          tipo_equipamento_id?: string | null
          updated_at?: string | null
          valor_final?: number | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_emissoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ordens_servico_tipo_equipamento_id_fkey"
            columns: ["tipo_equipamento_id"]
            isOneToOne: false
            referencedRelation: "tipos_equipamento"
            referencedColumns: ["id"]
          },
        ]
      }
      os_checklist_tecnico: {
        Row: {
          componente: string
          criado_em: string | null
          criado_por: string | null
          data_verificacao: string | null
          estado: string | null
          estado_atual: string | null
          foto_url: string | null
          id: string
          item_peca: string | null
          observacao_tecnica: string | null
          os_id: string
          responsavel_id: string | null
          tipo_equipamento_id: string | null
        }
        Insert: {
          componente: string
          criado_em?: string | null
          criado_por?: string | null
          data_verificacao?: string | null
          estado?: string | null
          estado_atual?: string | null
          foto_url?: string | null
          id?: string
          item_peca?: string | null
          observacao_tecnica?: string | null
          os_id: string
          responsavel_id?: string | null
          tipo_equipamento_id?: string | null
        }
        Update: {
          componente?: string
          criado_em?: string | null
          criado_por?: string | null
          data_verificacao?: string | null
          estado?: string | null
          estado_atual?: string | null
          foto_url?: string | null
          id?: string
          item_peca?: string | null
          observacao_tecnica?: string | null
          os_id?: string
          responsavel_id?: string | null
          tipo_equipamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_checklist_tecnico_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_checklist_tecnico_tipo_equipamento_id_fkey"
            columns: ["tipo_equipamento_id"]
            isOneToOne: false
            referencedRelation: "tipos_equipamento"
            referencedColumns: ["id"]
          },
        ]
      }
      os_custos: {
        Row: {
          aprovado_diretoria: boolean | null
          categoria: string
          comissao_vendedor: number | null
          criado_em: string | null
          criado_por: string | null
          custo_interno: number | null
          data_pagamento: string | null
          descricao: string
          fornecedor_id: string | null
          id: string
          is_terceirizado: boolean | null
          margem_lucro_percentual: number | null
          os_id: string
          pago: boolean
          preco_venda_final: number | null
          terceiro_nome: string | null
          valor_venda: number | null
        }
        Insert: {
          aprovado_diretoria?: boolean | null
          categoria: string
          comissao_vendedor?: number | null
          criado_em?: string | null
          criado_por?: string | null
          custo_interno?: number | null
          data_pagamento?: string | null
          descricao: string
          fornecedor_id?: string | null
          id?: string
          is_terceirizado?: boolean | null
          margem_lucro_percentual?: number | null
          os_id: string
          pago?: boolean
          preco_venda_final?: number | null
          terceiro_nome?: string | null
          valor_venda?: number | null
        }
        Update: {
          aprovado_diretoria?: boolean | null
          categoria?: string
          comissao_vendedor?: number | null
          criado_em?: string | null
          criado_por?: string | null
          custo_interno?: number | null
          data_pagamento?: string | null
          descricao?: string
          fornecedor_id?: string | null
          id?: string
          is_terceirizado?: boolean | null
          margem_lucro_percentual?: number | null
          os_id?: string
          pago?: boolean
          preco_venda_final?: number | null
          terceiro_nome?: string | null
          valor_venda?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "custos_os_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "os_custos_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      os_guarda_pecas: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          descricao: string
          id: string
          localizacao: string
          os_id: string
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          descricao: string
          id?: string
          localizacao: string
          os_id: string
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          descricao?: string
          id?: string
          localizacao?: string
          os_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_guarda_pecas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_pecas_rastreio: {
        Row: {
          aprovado_gestor: boolean
          bancada_id: string | null
          criado_em: string | null
          criado_por: string | null
          foto_url: string | null
          id: string
          localizacao: string | null
          localizacao_fisica: string | null
          nome: string
          observacao: string | null
          os_id: string
          status_peca: string | null
          terceiro_enviado_em: string | null
          terceiro_nome: string | null
          terceiro_observacao: string | null
          terceiro_prazo_entrega: string | null
          terceiro_recebido_em: string | null
          terceiro_recebido_por: string | null
        }
        Insert: {
          aprovado_gestor?: boolean
          bancada_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          localizacao_fisica?: string | null
          nome: string
          observacao?: string | null
          os_id: string
          status_peca?: string | null
          terceiro_enviado_em?: string | null
          terceiro_nome?: string | null
          terceiro_observacao?: string | null
          terceiro_prazo_entrega?: string | null
          terceiro_recebido_em?: string | null
          terceiro_recebido_por?: string | null
        }
        Update: {
          aprovado_gestor?: boolean
          bancada_id?: string | null
          criado_em?: string | null
          criado_por?: string | null
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          localizacao_fisica?: string | null
          nome?: string
          observacao?: string | null
          os_id?: string
          status_peca?: string | null
          terceiro_enviado_em?: string | null
          terceiro_nome?: string | null
          terceiro_observacao?: string | null
          terceiro_prazo_entrega?: string | null
          terceiro_recebido_em?: string | null
          terceiro_recebido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "os_pecas_rastreio_bancada_id_fkey"
            columns: ["bancada_id"]
            isOneToOne: false
            referencedRelation: "bancadas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pecas_os_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_tarefas: {
        Row: {
          concluida: boolean
          concluida_em: string | null
          concluida_por: string | null
          criado_em: string
          criado_por: string | null
          descricao: string | null
          id: string
          os_id: string
          prazo: string | null
          responsavel_id: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          os_id: string
          prazo?: string | null
          responsavel_id?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          concluida?: boolean
          concluida_em?: string | null
          concluida_por?: string | null
          criado_em?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          os_id?: string
          prazo?: string | null
          responsavel_id?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_tarefas_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          cliente_id: string | null
          criado_em: string | null
          id: string
          numero_pedido: number
          observacoes: string | null
          status: string
          updated_at: string | null
          valor_total: number
        }
        Insert: {
          cliente_id?: string | null
          criado_em?: string | null
          id?: string
          numero_pedido?: number
          observacoes?: string | null
          status?: string
          updated_at?: string | null
          valor_total?: number
        }
        Update: {
          cliente_id?: string | null
          criado_em?: string | null
          id?: string
          numero_pedido?: number
          observacoes?: string | null
          status?: string
          updated_at?: string | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          categoria: string | null
          criado_em: string | null
          descricao: string | null
          estoque: number
          id: string
          nome: string
          preco_venda: number
          updated_at: string | null
        }
        Insert: {
          categoria?: string | null
          criado_em?: string | null
          descricao?: string | null
          estoque?: number
          id?: string
          nome: string
          preco_venda?: number
          updated_at?: string | null
        }
        Update: {
          categoria?: string | null
          criado_em?: string | null
          descricao?: string | null
          estoque?: number
          id?: string
          nome?: string
          preco_venda?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      tipos_equipamento: {
        Row: {
          categoria_principal: string | null
          criado_em: string | null
          descricao: string | null
          id: string
          nome: string
        }
        Insert: {
          categoria_principal?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome: string
        }
        Update: {
          categoria_principal?: string | null
          criado_em?: string | null
          descricao?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          cargo: string | null
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      vendedor_empresas: {
        Row: {
          empresa_id: string
          vendedor_id: string
        }
        Insert: {
          empresa_id: string
          vendedor_id: string
        }
        Update: {
          empresa_id?: string
          vendedor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendedor_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_emissoras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendedor_empresas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "vendedores"
            referencedColumns: ["id"]
          },
        ]
      }
      vendedores: {
        Row: {
          apelido: string | null
          ativo: boolean
          cpf_cnpj: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          observacao: string | null
          percentual: number
          regra_comissao: Database["public"]["Enums"]["tipo_regra_comissao"]
          telefone: string | null
          tipo_calculo: Database["public"]["Enums"]["tipo_calculo_comissao"]
          tipo_comissao: string | null
          updated_at: string | null
          valor_comissao: number | null
        }
        Insert: {
          apelido?: string | null
          ativo?: boolean
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          observacao?: string | null
          percentual?: number
          regra_comissao?: Database["public"]["Enums"]["tipo_regra_comissao"]
          telefone?: string | null
          tipo_calculo?: Database["public"]["Enums"]["tipo_calculo_comissao"]
          tipo_comissao?: string | null
          updated_at?: string | null
          valor_comissao?: number | null
        }
        Update: {
          apelido?: string | null
          ativo?: boolean
          cpf_cnpj?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          percentual?: number
          regra_comissao?: Database["public"]["Enums"]["tipo_regra_comissao"]
          telefone?: string | null
          tipo_calculo?: Database["public"]["Enums"]["tipo_calculo_comissao"]
          tipo_comissao?: string | null
          updated_at?: string | null
          valor_comissao?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_dias_uteis: {
        Args: { p_base: string; p_dias: number }
        Returns: string
      }
      calc_prazo_orcamento: {
        Args: { p_base: string; p_prioridade: string }
        Returns: string
      }
      dev_get_storage_stats: {
        Args: never
        Returns: {
          nome_bucket: string
          quantidade_arquivos: number
          total_bytes: number
        }[]
      }
      get_distribuicao_status_os: {
        Args: never
        Returns: {
          color: string
          name: string
          value: number
        }[]
      }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      get_faturamento_mensal: {
        Args: never
        Returns: {
          mes: string
          valor: number
        }[]
      }
      get_my_profile_id: { Args: never; Returns: string }
      get_produtividade_tecnicos: {
        Args: never
        Returns: {
          media: number
          os: number
          tecnico: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_evento: {
        Args: {
          p_acao: string
          p_dados_antigos?: Json
          p_dados_novos?: Json
          p_descricao: string
          p_os_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role:
        | "diretor"
        | "financeiro"
        | "gestor"
        | "operador"
        | "tecnico"
        | "administrativo_financeiro"
        | "terceirizado"
      tipo_calculo_comissao: "percentual" | "divisao_custos"
      tipo_comissao: "padrao" | "divisao_50_50"
      tipo_regra_comissao: "percentual_bruto" | "lucro_liquido"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "diretor",
        "financeiro",
        "gestor",
        "operador",
        "tecnico",
        "administrativo_financeiro",
        "terceirizado",
      ],
      tipo_calculo_comissao: ["percentual", "divisao_custos"],
      tipo_comissao: ["padrao", "divisao_50_50"],
      tipo_regra_comissao: ["percentual_bruto", "lucro_liquido"],
    },
  },
} as const
