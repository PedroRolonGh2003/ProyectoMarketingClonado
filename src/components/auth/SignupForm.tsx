"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signupSchema } from "@/lib/schemas";
import { ZodError } from "zod";
import "./Login.css";

interface SignupFormProps {
  token: string;
}

export default function SignupForm({ token }: SignupFormProps) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      // Validar con Zod
      signupSchema.parse({
        nombre,
        apellido,
        correo,
        telefono,
        password,
        passwordConfirm,
      });

      setLoading(true);

      const response = await fetch("/api/signup/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          nombre,
          apellido,
          correo,
          telefono,
          password,
          passwordConfirm,
        }),
      });
      const data = await response.json();
      if (data.ok) {
        setSuccess(data.mensaje || "Registro exitoso");
        setTimeout(() => {
          router.push("/login");
        }, 1200);
      } else {
        setError(data.mensaje || "Error en registro");
      }
    } catch (err) {
      if (err instanceof ZodError) {
        setError(err.issues[0].message);
      } else {
        setError("Error de conexión al servidor");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-bg">
      <div className="card">
        <div className="card__header">
          <div className="icon-wrap">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
          </div>
          <h1 className="card__title">Registro de Delegado</h1>
          <p className="card__subtitle">
            Completa los datos para crear tu cuenta
          </p>
        </div>
        <div className="card__body">
          <form className="form" onSubmit={handleSubmit}>
            <div className="form__group">
              <label className="form__label" htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                className="form__input"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="apellido">
                Apellido
              </label>
              <input
                id="apellido"
                className="form__input"
                type="text"
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                required
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="correo">
                Correo electrónico
              </label>
              <input
                id="correo"
                className="form__input"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                required
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="telefono">
                Teléfono (opcional)
              </label>
              <input
                id="telefono"
                className="form__input"
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="form__group">
              <label className="form__label" htmlFor="passwordConfirm">
                Confirmar contraseña
              </label>
              <input
                id="passwordConfirm"
                className="form__input"
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
              />
            </div>
            {error && <p className="form__error">{error}</p>}
            {success && <p className="form__success">{success}</p>}
            <button className="btn-login" type="submit" disabled={loading}>
              {loading ? (
                <span className="btn-login__spinner" />
              ) : (
                "Registrarse"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
