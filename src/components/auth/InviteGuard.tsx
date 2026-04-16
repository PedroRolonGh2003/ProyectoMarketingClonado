"use client";

import { useEffect, useState, ReactNode } from "react";

interface InviteGuardProps {
  token: string;
  children: ReactNode;
}

export default function InviteGuard({ token, children }: InviteGuardProps) {
  const [status, setStatus] = useState<"loading" | "valid" | "invalid">(
    "loading",
  );
  const [mensaje, setMensaje] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function check() {
      if (!token) {
        setStatus("invalid");
        setMensaje("Token de invitación ausente");
        return;
      }
      try {
        const res = await fetch(
          `/api/signup/validate?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
        if (mounted) {
          if (data.ok) {
            setStatus("valid");
          } else {
            setStatus("invalid");
            setMensaje(data.mensaje || "Token no válido.");
          }
        }
      } catch {
        if (mounted) {
          setStatus("invalid");
          setMensaje("No se pudo validar el token.");
        }
      }
    }

    check();
    return () => {
      mounted = false;
    };
  }, [token]);

  if (status === "loading") {
    return <p>Cargando verificación de invitación...</p>;
  }

  if (status === "invalid") {
    return (
      <p className="form__error">
        Acceso restringido: {mensaje || "Invitación inválida"}
      </p>
    );
  }

  return <>{children}</>;
}
