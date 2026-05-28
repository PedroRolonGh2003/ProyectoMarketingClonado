"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function DelegadoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { usuario, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!usuario) router.replace("/login");
    else if (usuario.rol !== 1) router.replace("/admin");
  }, [usuario, loading, router]);

  if (loading || !usuario || usuario.rol !== 1) {
    return (
      <div className="page-bg page-loading">
        <p>Cargando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
