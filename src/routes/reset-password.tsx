import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Lock, Eye, EyeOff, Loader2, Droplets } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
  head: () => ({
    meta: [
      { title: "Redefinir Senha — Alternativa Hidráulica" },
      { name: "description", content: "Defina uma nova senha de acesso ao sistema Alternativa Hidráulica." },
      { property: "og:title", content: "Redefinir Senha — Alternativa Hidráulica" },
      { property: "og:description", content: "Defina uma nova senha de acesso ao sistema Alternativa Hidráulica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRecovery, setHasRecovery] = useState(false);

  useEffect(() => {
    const hash = window.location.hash || "";
    if (hash.includes("type=recovery")) setHasRecovery(true);
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasRecovery(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setHasRecovery(true);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("As senhas não conferem.");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast.error("Não foi possível redefinir", { description: error.message });
      return;
    }
    toast.success("Senha atualizada com sucesso.");
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary ring-1 ring-white/20">
            <Droplets className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white">
            REDEFINIR <span className="text-primary">SENHA</span>
          </h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
          {!hasRecovery && (
            <p className="mb-5 rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-400">
              Abra esta página pelo link enviado ao seu e-mail para poder definir uma nova senha.
            </p>
          )}
          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Nova senha</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo de 6 caracteres"
                  disabled={isLoading}
                  className="h-12 rounded-lg border-white/10 bg-slate-950/50 pl-10 pr-10 text-white placeholder:text-slate-600 focus-visible:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Confirmar senha</label>
              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repita a nova senha"
                  disabled={isLoading}
                  className="h-12 rounded-lg border-white/10 bg-slate-950/50 pl-10 text-white placeholder:text-slate-600 focus-visible:border-primary"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="h-12 w-full rounded-lg bg-primary text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-lg hover:bg-industrial-dark"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> SALVANDO...
                </>
              ) : (
                "SALVAR NOVA SENHA"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
