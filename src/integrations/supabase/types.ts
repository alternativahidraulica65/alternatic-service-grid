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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
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
      cliente_contatos: {
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
          cnpj: string | null
          criado_em: string | null
          email: string | null
          endereco: string | null
          id: string
          nome: string
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          criado_em?: string | null
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      custos_os: {
        Row: {
          aprovado_diretoria: boolean | null
          categoria: string
          comissao_vendedor: number | null
          criado_em: string | null
          criado_por: string | null
          custo_interno: number | null
          descricao: string
          id: string
          is_terceirizado: boolean | null
          margem_lucro_percentual: number | null
          os_id: string
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
          descricao: string
          id?: string
          is_terceirizado?: boolean | null
          margem_lucro_percentual?: number | null
          os_id: string
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
          descricao?: string
          id?: string
          is_terceirizado?: boolean | null
          margem_lucro_percentual?: number | null
          os_id?: string
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
        ]
      }
      empresas_emissoras: {
        Row: {
          cnpj: string
          cor_identificacao: string | null
          criado_em: string | null
          id: string
          nome: string
        }
        Insert: {
          cnpj: string
          cor_identificacao?: string | null
          criado_em?: string | null
          id?: string
          nome: string
        }
        Update: {
          cnpj?: string
          cor_identificacao?: string | null
          criado_em?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      fornecedores: {
        Row: {
          ativo: boolean | null
          cnpj: string | null
          contato: string | null
          criado_em: string | null
          id: string
          limite_mensal: number | null
          nome: string
          observacoes: string | null
        }
        Insert: {
          ativo?: boolean | null
          cnpj?: string | null
          contato?: string | null
          criado_em?: string | null
          id?: string
          limite_mensal?: number | null
          nome: string
          observacoes?: string | null
        }
        Update: {
          ativo?: boolean | null
          cnpj?: string | null
          contato?: string | null
          criado_em?: string | null
          id?: string
          limite_mensal?: number | null
          nome?: string
          observacoes?: string | null
        }
        Relationships: []
      }
      historico_processo_os: {
        Row: {
          criado_em: string | null
          executor_id: string | null
          id: string
          observacao: string | null
          os_id: string
          status_anterior: string | null
          status_novo: string
        }
        Insert: {
          criado_em?: string | null
          executor_id?: string | null
          id?: string
          observacao?: string | null
          os_id: string
          status_anterior?: string | null
          status_novo: string
        }
        Update: {
          criado_em?: string | null
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
      materiais: {
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
          criado_em: string | null
          data_abertura: string | null
          data_previsao_conclusao: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          laudo_defeitos: string | null
          laudo_diagnostico: string | null
          laudo_servicos_necessarios: string | null
          margem_lucro: number | null
          numero_os: string
          observacoes: string | null
          operador_atribuido: string | null
          prioridade: string | null
          status: string
          tecnico_id: string | null
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          cliente: string
          cliente_id?: string | null
          criado_em?: string | null
          data_abertura?: string | null
          data_previsao_conclusao?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          laudo_defeitos?: string | null
          laudo_diagnostico?: string | null
          laudo_servicos_necessarios?: string | null
          margem_lucro?: number | null
          numero_os: string
          observacoes?: string | null
          operador_atribuido?: string | null
          prioridade?: string | null
          status?: string
          tecnico_id?: string | null
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          cliente?: string
          cliente_id?: string | null
          criado_em?: string | null
          data_abertura?: string | null
          data_previsao_conclusao?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          laudo_defeitos?: string | null
          laudo_diagnostico?: string | null
          laudo_servicos_necessarios?: string | null
          margem_lucro?: number | null
          numero_os?: string
          observacoes?: string | null
          operador_atribuido?: string | null
          prioridade?: string | null
          status?: string
          tecnico_id?: string | null
          updated_at?: string | null
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
        ]
      }
      os_checklist_tecnico: {
        Row: {
          componente: string
          criado_em: string | null
          criado_por: string | null
          estado: string | null
          id: string
          observacao_tecnica: string | null
          os_id: string
        }
        Insert: {
          componente: string
          criado_em?: string | null
          criado_por?: string | null
          estado?: string | null
          id?: string
          observacao_tecnica?: string | null
          os_id: string
        }
        Update: {
          componente?: string
          criado_em?: string | null
          criado_por?: string | null
          estado?: string | null
          id?: string
          observacao_tecnica?: string | null
          os_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_checklist_tecnico_os_id_fkey"
            columns: ["os_id"]
            isOneToOne: false
            referencedRelation: "ordens_servico"
            referencedColumns: ["id"]
          },
        ]
      }
      os_fotos_anexos: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          foto_url: string
          id: string
          legenda: string | null
          os_id: string
          peca_id: string | null
          tipo: string | null
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          foto_url: string
          id?: string
          legenda?: string | null
          os_id: string
          peca_id?: string | null
          tipo?: string | null
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          foto_url?: string
          id?: string
          legenda?: string | null
          os_id?: string
          peca_id?: string | null
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
      pecas_os: {
        Row: {
          criado_em: string | null
          criado_por: string | null
          foto_url: string | null
          id: string
          localizacao: string | null
          nome: string
          os_id: string
        }
        Insert: {
          criado_em?: string | null
          criado_por?: string | null
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          os_id: string
        }
        Update: {
          criado_em?: string | null
          criado_por?: string | null
          foto_url?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          os_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pecas_os_os_id_fkey"
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
          ativo: boolean
          created_at: string | null
          id: string
          nome: string
          observacao: string | null
          percentual: number
          regra_comissao: Database["public"]["Enums"]["tipo_regra_comissao"]
          tipo_calculo: Database["public"]["Enums"]["tipo_calculo_comissao"]
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          nome: string
          observacao?: string | null
          percentual?: number
          regra_comissao?: Database["public"]["Enums"]["tipo_regra_comissao"]
          tipo_calculo?: Database["public"]["Enums"]["tipo_calculo_comissao"]
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          id?: string
          nome?: string
          observacao?: string | null
          percentual?: number
          regra_comissao?: Database["public"]["Enums"]["tipo_regra_comissao"]
          tipo_calculo?: Database["public"]["Enums"]["tipo_calculo_comissao"]
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      dev_get_storage_stats: {
        Args: never
        Returns: {
          nome_bucket: string
          quantidade_arquivos: number
          total_bytes: number
        }[]
      }
      get_email_by_username: { Args: { p_username: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
