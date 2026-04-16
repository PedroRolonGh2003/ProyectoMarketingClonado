"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { loginSchema, recuperarSchema, resetPasswordSchema } from "@/lib/schemas";
import { ZodError } from "zod";

type Vista = "login" | "recuperar" | "codigo";

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();

  const [vista, setVista]       = useState<Vista>("login");
  const [correo, setCorreo]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [msg, setMsg]           = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [codigo, setCodigo]           = useState("");
  const [nuevaPass, setNuevaPass]     = useState("");
  const [confirmaPass, setConfirmaPass] = useState("");

  // ── Login ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      // Validar con Zod
      loginSchema.parse({ correo, password });

      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password }),
      });
      const data = await res.json().catch(() => null);
      if (!data) { setError(`Respuesta inválida del servidor (HTTP ${res.status}).`); return; }
      if (data.ok) {
        login(data.usuario);
        router.replace(data.usuario.rol === 0 ? "/admin" : "/delegado");
      } else {
        setError(data.mensaje || data.error || "Error al iniciar sesión");
      }
    } catch (err) {
      if (err instanceof ZodError) {
        setError(err.issues[0].message);
      } else {
        setError("No se pudo conectar con el servidor");
      }
    } finally { setLoading(false); }
  };

  // ── Solicitar código ───────────────────────────────
  const handleRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(""); setError(""); setLoading(true);
    try {
      // Validar con Zod
      recuperarSchema.parse({ correo });

      const res  = await fetch("/api/recuperar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });
      const data = await res.json();
      if (data.ok) {
        setVista("codigo");
      } else {
        setError(data.mensaje || data.error || "Error al enviar el código");
      }
    } catch (err) {
      if (err instanceof ZodError) {
        setError(err.issues[0].message);
      } else {
        setError("No se pudo conectar con el servidor");
      }
    } finally { setLoading(false); }
  };

  // ── Verificar código y cambiar contraseña ──────────
  const handleCodigo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      // Validar con Zod
      resetPasswordSchema.parse({ codigo, nuevaPassword: nuevaPass });
      if (nuevaPass !== confirmaPass) { throw new Error("Las contraseñas no coinciden"); }

      const res  = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, codigo, nuevaPassword: nuevaPass }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg("✓ Contraseña actualizada. Ya puedes iniciar sesión.");
        setTimeout(() => {
          setVista("login"); setMsg(""); setCodigo("");
          setNuevaPass(""); setConfirmaPass(""); setCorreo("");
        }, 2000);
      } else {
        setError(data.mensaje || "Código incorrecto o expirado");
      }
    } catch (err: any) {
      if (err instanceof ZodError) {
        setError(err.issues[0].message);
      } else {
        setError(err.message || "No se pudo conectar con el servidor");
      }
    } finally { setLoading(false); }
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

          {/* ── VISTA: LOGIN ── */}
          {vista === "login" && (
            <form className="form" onSubmit={handleSubmit}>
              <div className="form__group">
                <label className="form__label" htmlFor="correo">Correo electrónico</label>
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
                <label className="form__label" htmlFor="password">Contraseña</label>
                <div className="input-eye-wrap">
                  <input
                    id="password"
                    className="form__input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button type="button" className="btn-eye" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form__forgot">
                <button type="button" className="btn-forgot"
                  onClick={() => { setVista("recuperar"); setError(""); setMsg(""); }}>
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              {error && <p className="form__error">{error}</p>}

              <button className="btn-login" type="submit" disabled={loading}>
                {loading ? <span className="btn-login__spinner" /> : (
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
          )}

          {/* ── VISTA: RECUPERAR ── */}
          {vista === "recuperar" && (
            <form className="form" onSubmit={handleRecuperar}>
              <div className="recuperar-header">
                <button type="button" className="btn-back-login"
                  onClick={() => { setVista("login"); setMsg(""); setError(""); }}>
                  ← Volver
                </button>
                <h2 className="recuperar-title">Recuperar contraseña</h2>
                <p className="recuperar-sub">
                  Ingresa tu correo y te enviaremos un código de 6 dígitos.
                </p>
              </div>

              <div className="form__group">
                <label className="form__label" htmlFor="correo-recuperar">Correo electrónico</label>
                <input id="correo-recuperar" className="form__input" type="email"
                  placeholder="ejemplo@correo.com"
                  value={correo} onChange={e => setCorreo(e.target.value)}
                  required/>
              </div>

              {msg   && <p className="form__msg--ok">{msg}</p>}
              {error && <p className="form__error">{error}</p>}

              <button className="btn-login" type="submit" disabled={loading}>
                {loading ? <span className="btn-login__spinner"/> : null}
                {loading ? "Enviando..." : "Enviar código"}
              </button>
            </form>
          )}

          {/* ── VISTA: INGRESAR CÓDIGO ── */}
          {vista === "codigo" && (
            <form className="form" onSubmit={handleCodigo}>
              <div className="recuperar-header">
                <button type="button" className="btn-back-login"
                  onClick={() => { setVista("recuperar"); setError(""); setCodigo(""); setNuevaPass(""); setConfirmaPass(""); }}>
                  ← Volver
                </button>
                <h2 className="recuperar-title">Nueva contraseña</h2>
                <p className="recuperar-sub">
                  Revisa tu correo <strong>{correo}</strong> e ingresa el código de 6 dígitos.
                </p>
              </div>

              <div className="form__group">
                <label className="form__label">Código de verificación</label>
                <input className="form__input codigo-input" type="text"
                  placeholder="000000" maxLength={6}
                  value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, ""))}
                  required/>
              </div>
              <div className="form__group">
                <label className="form__label">Nueva contraseña</label>
                <input className="form__input" type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={nuevaPass} onChange={e => setNuevaPass(e.target.value)}
                  required/>
              </div>
              <div className="form__group">
                <label className="form__label">Confirmar contraseña</label>
                <input className="form__input" type="password"
                  placeholder="Repite la contraseña"
                  value={confirmaPass} onChange={e => setConfirmaPass(e.target.value)}
                  required/>
              </div>

              {msg   && <p className="form__msg--ok">{msg}</p>}
              {error && <p className="form__error">{error}</p>}

              <button className="btn-login" type="submit" disabled={loading}>
                {loading ? <span className="btn-login__spinner"/> : null}
                {loading ? "Guardando..." : "Guardar nueva contraseña"}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
