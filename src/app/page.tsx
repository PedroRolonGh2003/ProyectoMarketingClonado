"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function HomePage() {
  const { usuario, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!usuario) router.replace("/login");
    else if (usuario.rol === 0) router.replace("/admin");
    else router.replace("/delegado");
  }, [usuario, loading, router]);

  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <p>Cargando...</p>
    </div>
  );
}
