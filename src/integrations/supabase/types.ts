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
      custos_os: {
        Row: {
          categoria: string
          criado_em: string | null
          criado_por: string | null
          custo_interno: number | null
          descricao: string
          id: string
          is_terceirizado: boolean | null
          os_id: string
          terceiro_nome: string | null
          valor_venda: number | null
        }
        Insert: {
          categoria: string
          criado_em?: string | null
          criado_por?: string | null
          custo_interno?: number | null
          descricao: string
          id?: string
          is_terceirizado?: boolean | null
          os_id: string
          terceiro_nome?: string | null
          valor_venda?: number | null
        }
        Update: {
          categoria?: string
          criado_em?: string | null
          criado_por?: string | null
          custo_interno?: number | null
          descricao?: string
          id?: string
          is_terceirizado?: boolean | null
          os_id?: string
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
      ordens_servico: {
        Row: {
          cliente: string
          criado_em: string | null
          descricao: string | null
          empresa_id: string | null
          id: string
          margem_lucro: number | null
          numero_os: string
          operador_atribuido: string | null
          status: string
          updated_at: string | null
          valor_total: number | null
        }
        Insert: {
          cliente: string
          criado_em?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          margem_lucro?: number | null
          numero_os: string
          operador_atribuido?: string | null
          status?: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Update: {
          cliente?: string
          criado_em?: string | null
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          margem_lucro?: number | null
          numero_os?: string
          operador_atribuido?: string | null
          status?: string
          updated_at?: string | null
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_servico_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas_emissoras"
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
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "diretor" | "financeiro" | "gestor" | "operador"
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
      app_role: ["diretor", "financeiro", "gestor", "operador"],
    },
  },
} as const
