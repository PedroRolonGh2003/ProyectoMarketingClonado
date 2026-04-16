"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Login from "@/components/auth/Login";

export default function LoginPage() {
  const { usuario, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (usuario) router.replace(usuario.rol === 0 ? "/admin" : "/delegado");
  }, [usuario, loading, router]);

  if (loading || usuario) {
    return (
      <div
        className="page-bg"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <p>Cargando...</p>
      </div>
    );
  }

  return <Login />;
}
