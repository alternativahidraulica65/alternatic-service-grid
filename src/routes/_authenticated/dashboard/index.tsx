import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  beforeLoad: ({ context }) => {
    const home = (context as any)?.homeDashboard || "operador";
    throw redirect({ to: `/dashboard/${home}` as any, replace: true });
  },
  component: () => null,
});
