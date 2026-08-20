import { createFileRoute } from "@tanstack/react-router";
import { 
  UserCircle, 
  Mail, 
  Lock, 
  Camera, 
  ShieldCheck, 
  Save, 
  Moon, 
  Sun, 
  Monitor,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const profileSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  tema: z.enum(["claro", "escuro", "automatico"]),
});

const passwordSchema = z.object({
  senhaAtual: z.string().min(6, "Senha atual é necessária"),
  novaSenha: z.string().min(6, "Nova senha deve ter pelo menos 6 caracteres"),
  confirmarNovaSenha: z.string().min(6, "Confirme a nova senha"),
}).refine((data) => data.novaSenha === data.confirmarNovaSenha, {
  message: "As senhas não coincidem",
  path: ["confirmarNovaSenha"],
});

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const queryClient = useQueryClient();
  const { user } = Route.useRouteContext();
  const [isUploading, setIsUploading] = useState(false);

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["user_profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("user_id", user?.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      nome: "",
      email: "",
      tema: "automatico",
    },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      senhaAtual: "",
      novaSenha: "",
      confirmarNovaSenha: "",
    },
  });

  useEffect(() => {
    if (profile) {
      profileForm.reset({
        nome: profile.nome,
        email: user?.email || "",
        tema: (profile as any).tema || "automatico",
      });
    }
  }, [profile, user, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileSchema>) => {
      // Update Auth Email if changed
      if (values.email !== user?.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: values.email });
        if (authError) throw authError;
        toast.info("Um e-mail de confirmação foi enviado para o novo endereço.");
      }

      // Update Public Profile
      const { error } = await supabase
        .from("usuarios")
        .update({
          nome: values.nome,
          // tema: values.tema (assuming field exists or using local storage/metadata)
        })
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_profile"] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar perfil: " + error.message);
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (values: z.infer<typeof passwordSchema>) => {
      const { error } = await supabase.auth.updateUser({
        password: values.novaSenha
      });
      if (error) throw error;
    },
    onSuccess: () => {
      passwordForm.reset();
      toast.success("Senha alterada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao alterar senha: " + error.message);
    },
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-profiles')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ foto_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: ["user_profile"] });
      toast.success("Foto de perfil atualizada!");
    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container-industrial py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-display font-black text-slate-900 uppercase tracking-tight">
            Perfil do Usuário
          </h1>
          <p className="text-slate-500 font-medium">
            Gerencie seus dados pessoais, segurança e preferências do sistema.
          </p>
        </div>
        <Button 
          onClick={profileForm.handleSubmit((values) => updateProfileMutation.mutate(values))}
          disabled={updateProfileMutation.isPending}
          className="btn-industrial bg-slate-900 text-white hover:bg-slate-800"
        >
          <Save className="mr-2 h-4 w-4" />
          Salvar Alterações
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Lado Esquerdo - Foto e Acesso */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Foto do Perfil</CardTitle>
            </CardHeader>
            <CardContent className="pt-8 flex flex-col items-center">
              <div className="relative group">
                <div className="h-32 w-32 rounded-full bg-slate-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                  {profile?.foto_url ? (
                    <img src={profile.foto_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserCircle className="h-20 w-20 text-slate-300" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 h-10 w-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center border-4 border-white cursor-pointer hover:scale-110 transition-transform shadow-lg">
                  <Camera className="h-5 w-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                </label>
              </div>
              <div className="mt-6 text-center">
                <Button variant="outline" size="sm" className="font-bold uppercase text-[10px] border-slate-200" asChild>
                  <label className="cursor-pointer">
                    {isUploading ? "Enviando..." : "Alterar Foto"}
                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={isUploading} />
                  </label>
                </Button>
                <p className="mt-2 text-[10px] text-slate-400 font-medium">PNG, JPG ou GIF. Máx 2MB.</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Nível de Acesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Perfil Atual</p>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    {profile?.cargo || "Colaborador"}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-500 font-medium bg-white/80 p-2 rounded-lg border border-slate-100">
                    <Info className="h-3 w-3 text-slate-400" />
                    Este campo é informativo e não pode ser alterado.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lado Direito - Dados e Senha */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <Form {...profileForm}>
                <form className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={profileForm.control}
                    name="nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nome Completo</FormLabel>
                        <FormControl>
                          <Input {...field} className="bg-slate-50 border-slate-200 font-bold" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={profileForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">E-mail de Login</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input {...field} className="bg-slate-50 border-slate-200 pl-9 font-medium" />
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50 border-b border-slate-200">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-500">Tema do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <FormField
                control={profileForm.control}
                name="tema"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col sm:flex-row gap-4"
                      >
                        <div className="flex items-center space-x-2 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors cursor-pointer flex-1">
                          <RadioGroupItem value="claro" id="claro" />
                          <Label htmlFor="claro" className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-widest">
                            <Sun className="h-4 w-4 text-amber-500" />
                            Claro
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors cursor-pointer flex-1">
                          <RadioGroupItem value="escuro" id="escuro" />
                          <Label htmlFor="escuro" className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-widest">
                            <Moon className="h-4 w-4 text-indigo-500" />
                            Escuro
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2 border border-slate-200 rounded-lg p-3 hover:bg-slate-50 transition-colors cursor-pointer flex-1">
                          <RadioGroupItem value="automatico" id="automatico" />
                          <Label htmlFor="automatico" className="flex items-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-widest">
                            <Monitor className="h-4 w-4 text-slate-500" />
                            Automático
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white border-b border-white/5">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-8">
              <Form {...passwordForm}>
                <form 
                  onSubmit={passwordForm.handleSubmit((values) => updatePasswordMutation.mutate(values))}
                  className="space-y-6"
                >
                  <div className="grid gap-6 sm:grid-cols-3">
                    <FormField
                      control={passwordForm.control}
                      name="senhaAtual"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Senha Atual</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="bg-slate-50 border-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="novaSenha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="bg-slate-50 border-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmarNovaSenha"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Confirmar Nova Senha</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" {...field} className="bg-slate-50 border-slate-200" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                      className="btn-industrial bg-slate-100 text-slate-900 hover:bg-slate-200 font-black uppercase text-[10px] tracking-widest h-10 px-6"
                    >
                      Atualizar Senha
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}