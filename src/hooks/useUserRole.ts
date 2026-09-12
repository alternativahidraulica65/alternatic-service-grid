import { useRouteContext } from "@tanstack/react-router";

export function useUserRole() {
  const { profile, roles } = useRouteContext({ from: '/_authenticated' });

  const cargo = profile?.cargo || '';
  const userRoles = roles || [];

  const isFinanceiro = userRoles.includes('administrativo_financeiro') || cargo === 'administrativo_financeiro';
  // Financeiro tem acesso irrestrito (mesmo nível do Diretor).
  const isDiretor = userRoles.includes('diretor') || cargo === 'diretor' || isFinanceiro;
  const isGestor = userRoles.includes('gestor') || cargo === 'gestor';
  const isOperador = userRoles.includes('operador') || cargo === 'operador';
  const isDev = profile?.email === "dev@admin.com" || profile?.email === "teste.dev@alternativahidraulica.local" || profile?.email === "admin@teste.com";

  const isDiretorOuFinanceiro = isDiretor || isFinanceiro || isDev;

  return {
    perfil: cargo,
    podeVerValoresFinanceiros: isDiretorOuFinanceiro,
    podeGerenciarOS: isDiretorOuFinanceiro || isGestor,
    podeExecutarChecklist: true,
    isDiretor,
    isFinanceiro,
    isGestor,
    isOperador,
    isDev
  };
}
