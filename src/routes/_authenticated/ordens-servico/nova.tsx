import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Save, 
  Calendar as CalendarIcon,
  Loader2,
  X
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  numero_os: z.string().min(1, "Número da OS é obrigatório"),
  data_abertura: z.date({
    required_error: "Data de abertura é obrigatória",
  }),
  cliente_id: z.string().min(1, "Cliente é obrigatório"),
  tecnico_id: z.string().min(1, "Técnico é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  status: z.string().min(1, "Status é obrigatório"),
  prioridade: z.string().min(1, "Prioridade é obrigatória"),
  observacoes: z.string().optional(),
  data_previsao_conclusao: z.date().optional(),
  valor_total: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export const Route = createFileRoute("/_authenticated/ordens-servico/nova")({
  component: NovaOSPage,
  head: () => ({
    meta: [
      { title: "Nova Ordem de Serviço — Alternativa Hidráulica" },
      { name: "description", content: "Criação de nova Ordem de Serviço no sistema ERP." },
    ],
  }),
});

function NovaOSPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries for dynamic selects (client-side only to avoid SSR auth/hydration issues)
  const { data: clientes = [] } = useQuery({
    queryKey: ['clientes_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome')
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ['tecnicos_list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome')
        .eq('cargo', 'tecnico')
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_os: "",
      data_abertura: undefined as any,
      cliente_id: "",
      tecnico_id: "",
      status: "Aberta",
      prioridade: "Média",
      descricao: "",
      observacoes: "",
      valor_total: undefined as any,
    },
  });

  // Set today's date after hydration to keep server/client markup identical
  useEffect(() => {
    if (!form.getValues("data_abertura")) {
      form.setValue("data_abertura", new Date());
    }
  }, [form]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const selectedCliente = clientes.find((c: { id: string; nome: string }) => c.id === values.cliente_id);
      const valorNumerico = values.valor_total ? parseFloat(values.valor_total.replace(/[^\d.-]/g, '')) : null;

      const { error } = await supabase
        .from('ordens_servico')
        .insert({
          numero_os: values.numero_os,
          cliente: selectedCliente?.nome || "Cliente Desconhecido",
          cliente_id: values.cliente_id,
          tecnico_id: values.tecnico_id,
          descricao: values.descricao,
          status: values.status,
          prioridade: values.prioridade,
          observacoes: values.observacoes || null,
          data_abertura: values.data_abertura.toISOString(),
          data_previsao_conclusao: values.data_previsao_conclusao ? values.data_previsao_conclusao.toISOString() : null,
          valor_total: valorNumerico,
        });

      if (error) throw error;

      toast.success("OS criada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['ordens_servico'] });
      router.navigate({ to: "/historico" as any });
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao criar OS. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 industrial-theme">
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-sm">
        <div className="container-industrial flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.history.back()}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-display text-lg font-bold text-slate-900">Nova Ordem de Serviço</h1>
          </div>
        </div>
      </header>

      <main className="container-industrial mt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card className="shadow-md border-l-4 border-l-primary bg-white">
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
                <CardDescription>Preencha os dados básicos da OS.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* ID (Simulado/Desabilitado) */}
                <div className="space-y-2">
                  <Label className="text-muted-foreground">ID da OS</Label>
                  <Input disabled placeholder="Gerado automaticamente" className="bg-slate-50" />
                </div>

                {/* Numero OS */}
                <FormField
                  control={form.control}
                  name="numero_os"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número da OS *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: OS-2024-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data Abertura */}
                <FormField
                  control={form.control}
                  name="data_abertura"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2">Data de Abertura *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Cliente Select */}
                <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientes.map((c: { id: string; nome: string }) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Tecnico Select */}
                <FormField
                  control={form.control}
                  name="tecnico_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Técnico Responsável *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o técnico" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tecnicos.map((t: { id: string; nome: string }) => (
                            <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Status Select */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Aberta">Aberta</SelectItem>
                          <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                          <SelectItem value="Concluída">Concluída</SelectItem>
                          <SelectItem value="Cancelada">Cancelada</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Prioridade Select */}
                <FormField
                  control={form.control}
                  name="prioridade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a prioridade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Baixa">Baixa</SelectItem>
                          <SelectItem value="Média">Média</SelectItem>
                          <SelectItem value="Alta">Alta</SelectItem>
                          <SelectItem value="Urgente">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data Previsão Conclusão */}
                <FormField
                  control={form.control}
                  name="data_previsao_conclusao"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="mb-2">Previsão de Conclusão</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Valor Total */}
                <FormField
                  control={form.control}
                  name="valor_total"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Total (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="text" 
                          placeholder="0,00" 
                          {...field}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, "");
                            val = (Number(val) / 100).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            });
                            field.onChange(val);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="shadow-md bg-white">
              <CardHeader>
                <CardTitle>Detalhes Técnicos</CardTitle>
                <CardDescription>Descreva o problema e observações adicionais.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <FormField
                  control={form.control}
                  name="descricao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição do Problema *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Descreva detalhadamente o serviço..." 
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="observacoes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações Internas</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Observações complementares..." 
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.history.back()}
                disabled={isSubmitting}
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="btn-industrial bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {isSubmitting ? "Salvando..." : "Salvar OS"}
              </Button>
            </div>
          </form>
        </Form>
      </main>
    </div>
  );
}