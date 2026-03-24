"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import "./Login.css";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });
      const data = await res.json().catch(() => null);
      if (!data) {
        setError(`Respuesta inválida del servidor (HTTP ${res.status}).`);
        return;
      }
      if (data.ok) {
        login(data.usuario);
        router.replace(data.usuario.rol === 0 ? "/admin" : "/delegado");
      } else {
        setError(data.mensaje || data.error || "Error al iniciar sesión");
      }
    } catch {
      setError("No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg">
      <div className="card">
        <div className="card__header">
          <div className="icon-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
          </div>
          <h1 className="card__title">Colegio de Marketing</h1>
          <p className="card__subtitle">Sistema de Gestión de Defensas de Tesis</p>
        </div>
        <div className="card__body">
          <form className="form" onSubmit={handleSubmit}>
            <div className="form__group">
              <label className="form__label" htmlFor="correo">
                Correo electrónico
              </label>
              <input
                id="correo"
                className="form__input"
                type="email"
                placeholder="ejemplo@correo.com"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                className="form__input"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <p className="form__error">{error}</p>}
            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? (
                <span className="btn-login__spinner" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <polyline points="10 17 15 12 10 7"/>
                  <line x1="15" y1="12" x2="3" y2="12"/>
                </svg>
              )}
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
