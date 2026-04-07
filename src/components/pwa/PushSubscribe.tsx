// src\components\pwa\PushSubscribe.tsx
"use client";

import { useEffect, useState } from "react";

interface PushSubscribeProps {
  usuarioId: number;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushSubscribe({ usuarioId }: PushSubscribeProps) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "loading" | "subscribed" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const canRegister =
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window;
      setSupported(canRegister);
      if (canRegister && Notification.permission === "granted") {
        setStatus("subscribed");
      }
    }
  }, []);

  const handleSubscribe = async () => {
    if (!supported) {
      setStatus("error");
      setMessage("Tu navegador no soporta notificaciones push.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("error");
        setMessage("Permiso de notificaciones rechazado.");
        return;
      }

      const vapidRes = await fetch("/api/push/vapid");
      const vapidData = await vapidRes.json();
      if (!vapidData.ok) {
        throw new Error(vapidData.mensaje || "No se obtuvo la clave VAPID.");
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, subscription }),
      });
      const result = await res.json();
      if (!result.ok) {
        throw new Error(result.mensaje || "No se pudo guardar la suscripción.");
      }

      setStatus("subscribed");
      setMessage(
        "Notificaciones activadas. Recibirás recordatorios de defensas pendientes.",
      );
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "Error al activar notificaciones.";
      setStatus("error");
      setMessage(mensaje);
    }
  };

  return (
    <section className="push-subscribe-card">
      <div className="push-subscribe-content">
        <div>
          <h2>Notificaciones Push</h2>
          <p>
            Activa recordatorios para defensas pendientes y recibe avisos
            incluso cuando la app esté en segundo plano.
          </p>
        </div>
        <div className="push-subscribe-actions">
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleSubscribe}
            disabled={
              !supported || status === "loading" || status === "subscribed"
            }
          >
            {status === "loading"
              ? "Activando..."
              : status === "subscribed"
                ? "Activado"
                : "Activar notificaciones"}
          </button>
        </div>
      </div>
      {message && (
        <p className={`form__${status === "error" ? "error" : "success"}`}>
          {message}
        </p>
      )}
      {!supported && (
        <p className="form__error">
          Este navegador no soporta notificaciones push.
        </p>
      )}
    </section>
  );
}
