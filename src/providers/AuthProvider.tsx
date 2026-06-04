"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { UsuarioSesion } from "@/types";
import { isUsuarioSesionValido } from "@/lib/usuario-sesion";

/** Claves legacy; se eliminan al restaurar o cerrar sesión. */
const LEGACY_STORAGE_KEYS = ["col_marketing_usuario"] as const;

function clearLegacyClientStorage() {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    } catch {
      /* ignorar */
    }
  }
}

type AuthContextValue = {
  usuario: UsuarioSesion | null;
  loading: boolean;
  login: (u: UsuarioSesion) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      clearLegacyClientStorage();

      try {
        const res = await fetch("/api/session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (
          res.ok &&
          data?.ok === true &&
          isUsuarioSesionValido(data.usuario)
        ) {
          setUsuario(data.usuario);
        } else {
          setUsuario(null);
          clearLegacyClientStorage();
        }
      } catch {
        if (!cancelled) {
          setUsuario(null);
          clearLegacyClientStorage();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((u: UsuarioSesion) => {
    if (!isUsuarioSesionValido(u)) return;
    setUsuario(u);
    clearLegacyClientStorage();
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });
    } catch {
      /* continuar limpieza local */
    }
    setUsuario(null);
    clearLegacyClientStorage();
    window.location.href = "/login";
  }, []);

  const value = useMemo(
    () => ({ usuario, loading, login, logout }),
    [usuario, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
