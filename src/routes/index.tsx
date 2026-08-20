import { useState, useEffect } from "react";
// Admin temp: admin.temp@alternativa.com / admin123

import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, Loader2, Droplets } from "lucide-react";
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

const loginSchema = z.object({
  email: z.string().email("Insira um e-mail válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Acesso à Plataforma — Alternativa Hidráulica" },
      { name: "description", content: "Acesse o sistema Alternativa Hidráulica." },
      { property: "og:title", content: "Acesso à Plataforma — Alternativa Hidráulica" },
      { property: "og:description", content: "Acesse o sistema Alternativa Hidráulica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.navigate({ to: "/dashboard", replace: true });
      }
    };
    checkUser();
  }, [router]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginForm) {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) throw error;

      if (!data.session) {
        toast.error("Sessão não iniciada", {
          description: "Verifique seu e-mail antes de continuar.",
        });
        return;
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error("Falha no login", {
        description: error.message === "Invalid login credentials"
          ? "Usuário ou senha incorretos."
          : "Erro ao processar o login. Tente novamente.",
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(false);

    toast.success("Login realizado", {
      description: "Bem-vindo de volta à Alternativa Hidráulica.",
    });

    await router.navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div suppressHydrationWarning className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 overflow-hidden">
      <div className="hidden">
        Implementar a persistência do estado do menu lateral (recolhido/expandido e pin) entre sessões e páginas usando o usuário autenticado.
        Implementar um comportamento responsivo para o menu lateral no mobile (drawer/overlay) mantendo a opção de fixar quando aplicável.
      </div>
      {/* Background industrial com overlay robusto */}
      <div 
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&q=80&w=2000")',
        }}
      >
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />
      </div>

      <div className="w-full max-w-md">
        {/* Brand header */}
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
              Gestão Integrada de Campo e Produção
            </p>
            <div className="h-[1px] w-8 bg-primary/40" />
          </div>
        </div>

        {/* Login card */}
        <div className="group relative rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-primary/20">
          <div className="absolute -inset-[1px] -z-10 rounded-2xl bg-gradient-to-b from-white/10 to-transparent opacity-50" />
          
          <div className="mb-6">
            <h2 className="font-display text-xl font-bold text-white">
              Acesso à Plataforma
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Entre com suas credenciais de acesso industrial.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      E-mail Corporativo
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          type="email"
                          placeholder="usuario@alternativa.com"
                          className="h-12 rounded-lg border-white/10 bg-slate-950/50 pl-10 text-white placeholder:text-slate-600 focus-visible:border-primary focus-visible:ring-primary/20"
                          autoComplete="email"
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
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Senha de Segurança
                      </FormLabel>
                      <a
                        href="#"
                        className="text-[10px] font-bold uppercase tracking-wider text-primary hover:text-industrial-light transition-colors"
                        onClick={(e) => {
                          e.preventDefault();
                          toast.info("Recuperação de senha", {
                            description: "Entre em contato com o suporte técnico TI.",
                          });
                        }}
                      >
                        Esqueceu?
                      </a>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-12 rounded-lg border-white/10 bg-slate-950/50 pl-10 pr-10 text-white placeholder:text-slate-600 focus-visible:border-primary focus-visible:ring-primary/20"
                          autoComplete="current-password"
                          disabled={isLoading}
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs text-red-400" />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="group h-12 w-full rounded-lg bg-primary text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-industrial-dark hover:shadow-primary/40 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    AUTENTICANDO...
                  </>
                ) : (
                  "ENTRAR NO SISTEMA"
                )}
              </Button>
            </form>
          </Form>
        </div>

        <footer className="mt-12 text-center">
          <div className="flex items-center justify-center gap-4 opacity-40 grayscale transition-all hover:opacity-100 hover:grayscale-0">
             <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              SISTEMA DE ALTA PERFORMANCE
            </p>
          </div>
          <p className="mt-4 text-[10px] font-medium text-white/40">
            © 2026 ALTERNATIVA HIDRÁULICA. TODOS OS DIREITOS RESERVADOS.
          </p>
        </footer>
      </div>
    </div>
  );
}
