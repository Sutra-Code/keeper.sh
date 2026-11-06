import { createFileRoute, redirect } from "@tanstack/react-router";
import { toStringSearchParams } from "@/lib/mcp-auth-flow";

// Registro cerrado: las cuentas las crea un administrador.
export const Route = createFileRoute("/(auth)/register")({
  validateSearch: toStringSearchParams,
  beforeLoad: ({ search }) => {
    throw redirect({ search, to: "/login" });
  },
});
