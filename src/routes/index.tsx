import { useState, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, Loader2, Droplets, UserCircle, Shield, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const loginSchema = z.object({
  email: z.string().min(1, "Insira seu e-mail."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

const registerSchema = z.object({
  nome: z.string().min(3, "Insira seu nome completo."),
  email: z.string().email("Insira um e-mail válido."),
  perfil: z.enum(["operador", "gestor", "financeiro", "diretor"], {
    required_error: "Selecione o nível de permissão.",
  }),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Acesso à Plataforma — Alternativa Hidráulica" },
      { name: "description", content: "Acesse o sistema Alternativa Hidráulica." },
    ],
  }),
});

function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.replace("/dashboard");
      }
    };
    checkUser();
  }, []);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { nome: "", email: "", perfil: "operador", password: "" },
  });

  async function onLoginSubmit(values: LoginForm) {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (error) throw error;
      if (!data.session) {
        toast.error("Sessão não iniciada", { description: "Verifique seu e-mail." });
        setIsLoading(false);
        return;
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('nome')
        .eq('id', data.session.user.id)
        .single();

      toast.success("Login realizado", {
        description: `Bem-vindo de volta, ${usuario?.nome || 'Colaborador'}.`,
      });
      window.location.replace("/dashboard");
    } catch (error: any) {
      toast.error("Falha no acesso", {
        description: error.message.includes("Invalid login") 
          ? "Usuário ou senha incorretos." 
          : "Erro ao processar. Tente novamente.",
        style: { backgroundColor: '#0f172a', color: '#ef4444', border: '1px solid #ef4444' }
      });
      setIsLoading(false);
    }
  }

  async function onRegisterSubmit(values: RegisterForm) {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        options: {
          data: {
            nome: values.nome.trim(),
            perfil: values.perfil
          }
        }
      });

      if (error) throw error;

      toast.success("Conta criada com sucesso!", {
        description: "Seu cadastro foi concluído. Faça login para continuar.",
      });
      registerForm.reset();
      setIsRegistering(false);
    } catch (error: any) {
      toast.error("Falha ao criar conta", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div suppressHydrationWarning className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      <div 
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000")' }}
      >
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
      </div>

      <div className="w-full max-w-md transition-all duration-500 z-10">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-[0_0_30px_rgba(255,215,0,0.3)] ring-1 ring-white/20">
            <Droplets className="h-10 w-10 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl drop-shadow-2xl">
            ALTERNATIVA <span className="text-primary">HIDRÁULICA</span>
          </h1>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-[1px] w-8 bg-primary/40" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
              Gestão Integrada de Produção
            </p>
            <div className="h-[1px] w-8 bg-primary/40" />
          </div>
        </div>

        {/* FLUXO DE LOGIN */}
        {!isRegistering && (
          <div className="transition-all duration-500 opacity-100 translate-y-0">
            <div className="group relative rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
              <div className="absolute -inset-[1px] -z-10 rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-50" />
              <div className="mb-6">
                <h2 className="font-display text-xl font-bold text-white">Acesso à Plataforma</h2>
                <p className="mt-1 text-sm text-slate-400">Entre com suas credenciais corporativas.</p>
              </div>

              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400">E-mail</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                              type="email"
                              placeholder="usuario@alternativa.com"
                              className="h-12 rounded-lg border-white/10 bg-slate-950/50 pl-10 text-white placeholder:text-slate-600 focus-visible:border-primary"
                              disabled={isLoading}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400">Senha</FormLabel>
                        </div>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              className="h-12 rounded-lg border-white/10 bg-slate-950/50 pl-10 pr-10 text-white placeholder:text-slate-600 focus-visible:border-primary"
                              disabled={isLoading}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading} className="group h-12 w-full rounded-lg bg-primary text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 hover:bg-industrial-dark">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> AUTENTICANDO...</> : "ENTRAR NO SISTEMA"}
                  </Button>
                </form>
              </Form>
            </div>

            {/* CAMPO INFERIOR PARA CRIAÇÃO DE CONTA */}
            <div className="mt-6 rounded-xl border border-white/10 bg-slate-900/40 p-5 text-center backdrop-blur-md shadow-lg transition-all hover:bg-slate-900/60">
              <p className="text-sm text-slate-300">
                Ainda não tem acesso ao sistema?{' '}
                <button 
                  type="button" 
                  onClick={() => setIsRegistering(true)} 
                  className="ml-1 font-bold text-primary hover:text-industrial-light hover:underline transition-all"
                >
                  Criar uma conta
                </button>
              </p>
            </div>
          </div>
        )}

        {/* FLUXO DE REGISTRO (CARD INFERIOR QUE SUBSTITUI O PRINCIPAL) */}
        {isRegistering && (
          <div className="transition-all duration-500 opacity-100 translate-y-0">
            <div className="group relative rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
              <div className="absolute -inset-[1px] -z-10 rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-50" />
              
              <div className="mb-6 flex flex-col">
                <button 
                  onClick={() => setIsRegistering(false)}
                  className="mb-4 inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" /> VOLTAR AO LOGIN
                </button>
                <h2 className="font-display text-xl font-bold text-white">Solicitar Acesso</h2>
                <p className="mt-1 text-sm text-slate-400">Preencha os dados obrigatórios para criar sua conta.</p>
              </div>

              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nome Completo</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <UserCircle className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                              placeholder="Seu nome completo"
                              className="h-11 rounded-lg border-white/10 bg-slate-950/50 pl-10 text-white placeholder:text-slate-600 focus-visible:border-primary"
                              disabled={isLoading}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">E-mail Corporativo</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                              type="email"
                              placeholder="usuario@alternativa.com"
                              className="h-11 rounded-lg border-white/10 bg-slate-950/50 pl-10 text-white placeholder:text-slate-600 focus-visible:border-primary"
                              disabled={isLoading}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="perfil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nível de Permissão</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                          <FormControl>
                            <div className="relative">
                              <Shield className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 z-10" />
                              <SelectTrigger className="h-11 rounded-lg border-white/10 bg-slate-950/50 pl-10 text-white focus:border-primary focus:ring-1 focus:ring-primary/20">
                                <SelectValue placeholder="Selecione o acesso..." />
                              </SelectTrigger>
                            </div>
                          </FormControl>
                          <SelectContent className="bg-slate-900 border-white/10 text-white">
                            <SelectItem value="operador">Operador de Produção</SelectItem>
                            <SelectItem value="gestor">Gestor / Supervisor</SelectItem>
                            <SelectItem value="financeiro">Financeiro / Administrativo</SelectItem>
                            <SelectItem value="diretor">Diretoria</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Senha de Acesso</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Mínimo de 6 caracteres"
                              className="h-11 rounded-lg border-white/10 bg-slate-950/50 pl-10 pr-10 text-white placeholder:text-slate-600 focus-visible:border-primary"
                              disabled={isLoading}
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage className="text-xs text-red-400" />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={isLoading} className="mt-4 h-12 w-full rounded-lg bg-primary text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-lg hover:bg-industrial-dark">
                    {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> REGISTRANDO...</> : "CRIAR CONTA"}
                  </Button>
                </form>
              </Form>
            </div>
          </div>
        )}

        <footer className="mt-10 text-center">
          <p className="text-[10px] font-medium text-white/40">
            © 2026 ALTERNATIVA HIDRÁULICA.
          </p>
        </footer>
      </div>
    </div>
  );
}