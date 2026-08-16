import { useState } from "react";
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
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
  email: z.string().email("Digite um e-mail válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

type LoginForm = z.infer<typeof loginSchema>;

export const Route = createFileRoute("/")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Acesso à Plataforma — Gestão Agrícola" },
      { name: "description", content: "Acesse o sistema de gestão agrícola." },
      { property: "og:title", content: "Acesso à Plataforma — Gestão Agrícola" },
      { property: "og:description", content: "Acesse o sistema de gestão agrícola." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginForm) {
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    setIsLoading(false);

    if (error) {
      toast.error("Falha no login", {
        description: error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : error.message,
      });
      return;
    }

    if (!data.session) {
      toast.error("Sessão não iniciada", {
        description: "Verifique seu e-mail antes de continuar.",
      });
      return;
    }

    toast.success("Login realizado", {
      description: "Bem-vindo de volta à plataforma agrícola.",
    });

    await router.navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      {/* Agricultural background with overlay */}
      <div 
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&q=80&w=2000")',
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFD700] shadow-lg shadow-yellow-500/20">
            <Wheat className="h-8 w-8 text-black" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl drop-shadow-md">
            Plataforma Agrícola
          </h1>
          <p className="mt-2 text-sm font-medium text-white/80">
            Gestão Integrada de Campo e Produção
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="font-display text-xl font-semibold text-slate-900">
              Acesso à Plataforma
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Insira suas credenciais para entrar.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      E-mail
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="seu.email@empresa.com"
                          className="h-11 rounded-lg border-slate-200 bg-white pl-10 text-sm focus-visible:ring-[#FFD700]"
                          autoComplete="email"
                          disabled={isLoading}
                          aria-label="E-mail"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Senha
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 rounded-lg border-slate-200 bg-white pl-10 pr-10 text-sm focus-visible:ring-[#FFD700]"
                          autoComplete="current-password"
                          disabled={isLoading}
                          aria-label="Senha"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                          tabIndex={-1}
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-lg bg-[#FFD700] text-sm font-semibold text-black shadow-md shadow-yellow-500/10 transition-all hover:bg-[#FFC800] focus-visible:ring-[#FFD700]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Login"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <a
              href="#"
              className="text-xs font-medium text-slate-500 hover:text-[#FFD700] hover:underline transition-colors"
              onClick={(e) => {
                e.preventDefault();
                toast.info("Recuperação de senha", {
                  description: "Funcionalidade disponível em breve.",
                });
              }}
            >
              Esqueceu a senha?
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs font-medium text-white/60">
            © {new Date().getFullYear()} Plataforma Agrícola.
          </p>
        </footer>
      </div>
    </div>

  );
}
