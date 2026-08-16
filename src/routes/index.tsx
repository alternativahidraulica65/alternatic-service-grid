import { useState } from "react";
import { createFileRoute, useRouter, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Lock, Eye, EyeOff, Loader2, Wheat } from "lucide-react";
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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 py-12 sm:px-6 lg:px-8">
      {/* Industrial background texture */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--color-industrial-light)_0%,transparent_35%)] opacity-40" />

      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-md shadow-primary/20">
            <Wrench className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Alternativa Hidráulica
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            Sistema ERP — Gestão Industrial & Ordem de Serviço
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl shadow-metal/5">
          <div className="mb-6">
            <h2 className="font-display text-xl font-semibold text-foreground">
              Acesso ao sistema
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
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
                    <FormLabel className="text-sm font-medium text-foreground">
                      E-mail
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                          type="email"
                          placeholder="seu.email@alternativa.com"
                          className="h-11 rounded-lg border-input bg-background pl-10 text-sm focus-visible:ring-primary"
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
                    <FormLabel className="text-sm font-medium text-foreground">
                      Senha
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-11 rounded-lg border-input bg-background pl-10 pr-10 text-sm focus-visible:ring-primary"
                          autoComplete="current-password"
                          disabled={isLoading}
                          aria-label="Senha"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
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
                className="h-11 w-full rounded-lg bg-primary text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:bg-industrial-dark focus-visible:ring-primary"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar no sistema"
                )}
              </Button>
            </form>
          </Form>

          <div className="mt-4 text-center">
            <a
              href="#"
              className="text-xs font-medium text-metal hover:text-industrial-dark hover:underline"
              onClick={(e) => {
                e.preventDefault();
                toast.info("Recuperação de senha", {
                  description: "Funcionalidade disponível em breve.",
                });
              }}
            >
              Esqueceu sua senha?
            </a>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-xs font-medium text-muted-foreground">
            © {new Date().getFullYear()} Alternativa Hidráulica. Todos os direitos reservados.
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-metal-light">
            Sistema Interno de Gestão Industrial
          </p>
        </footer>
      </div>
    </div>
  );
}
