import { createFileRoute, redirect } from "@tanstack/react-router";

// O Kanban de produção foi substituído pelo Orquestrador.
export const Route = createFileRoute("/_authenticated/kanban")({
  beforeLoad: ({ context }) => {
    const c = context as any;
    throw redirect({
      to: c.isDiretor || c.isGestor ? "/producao/orquestrador" : "/dashboard",
      replace: true,
    });
  },
});
