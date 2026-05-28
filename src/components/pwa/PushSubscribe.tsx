// src\components\pwa\PushSubscribe.tsx
"use client";

import { useEffect, useState } from "react";

interface PushSubscribeProps {
  usuarioId: number;
}

type PushStatus = "idle" | "loading" | "subscribed" | "error";

type PushSubscriptionResponse = {
  ok: boolean;
  mensaje: string;
  activo?: boolean;
};

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

function toPushSubscriptionBody(subscription: PushSubscription): {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  const raw = subscription.toJSON() as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  return {
    endpoint: raw.endpoint,
    keys: {
      p256dh: raw.keys.p256dh,
      auth: raw.keys.auth,
    },
  };
}

export default function PushSubscribe({ usuarioId }: PushSubscribeProps) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<PushStatus>("idle");
  const [message, setMessage] = useState<string>("");
  const [activo, setActivo] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const canRegister =
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window;
    setSupported(canRegister);

    if (!canRegister) {
      setStatus("error");
      setMessage("Este navegador no soporta notificaciones push.");
      return;
    }

    const cargarEstado = async () => {
      try {
        const res = await fetch(`/api/push/status?usuarioId=${usuarioId}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as PushSubscriptionResponse;
        if (data.ok) {
          setActivo(Boolean(data.activo));
          setStatus(data.activo ? "subscribed" : "idle");
        } else {
          setStatus("idle");
          setMessage(data.mensaje || "No se pudo consultar el estado de notificaciones.");
        }
      } catch (error) {
        const mensaje =
          error instanceof Error
            ? error.message
            : "Error al consultar el estado de notificaciones.";
        setStatus("error");
        setMessage(mensaje);
      }
    };

    cargarEstado();
  }, [usuarioId]);

  const handleSubscribe = async () => {
    if (!supported) {
      setStatus("error");
      setMessage("Tu navegador no soporta notificaciones push.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      let permission = Notification.permission;
      if (permission !== "granted") {
        permission = await Notification.requestPermission();
      }
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
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidData.publicKey),
        });
      }

      const subscriptionBody = toPushSubscriptionBody(subscription);
      if (!subscriptionBody.endpoint || !subscriptionBody.keys.p256dh || !subscriptionBody.keys.auth) {
        throw new Error("No se pudo obtener la suscripción de push.");
      }

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, subscription: subscriptionBody }),
      });
      const result = (await res.json()) as PushSubscriptionResponse;
      if (!result.ok) {
        throw new Error(result.mensaje || "No se pudo guardar la suscripción.");
      }

      setActivo(true);
      setStatus("subscribed");
      setMessage("Notificaciones activadas. Recibirás recordatorios de defensas pendientes.");
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "Error al activar notificaciones.";
      setStatus("error");
      setMessage(mensaje);
    }
  };

  const handleUnsubscribe = async () => {
    if (!supported) {
      setStatus("error");
      setMessage("Tu navegador no soporta notificaciones push.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      let endpoint = "";
      if (subscription) {
        endpoint = subscription.endpoint;
        await subscription.unsubscribe();
      }

      const res = await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarioId, endpoint: endpoint || undefined }),
      });
      const result = (await res.json()) as PushSubscriptionResponse;
      if (!result.ok) {
        throw new Error(result.mensaje || "No se pudo desactivar la suscripción.");
      }

      setActivo(false);
      setStatus("idle");
      setMessage("Notificaciones desactivadas.");
    } catch (error: unknown) {
      const mensaje =
        error instanceof Error
          ? error.message
          : "Error al desactivar notificaciones.";
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
          <p className="toggle-sub">
            {activo
              ? "Tus notificaciones push están activadas en la cuenta."
              : "Activa las notificaciones para recibir recordatorios de defensas."}
          </p>
        </div>
        <div className="push-subscribe-actions">
          {activo ? (
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={handleUnsubscribe}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Desactivando..." : "Desactivar notificaciones"}
            </button>
          ) : (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={handleSubscribe}
              disabled={status === "loading"}
            >
              {status === "loading"
                ? "Procesando..."
                : "Activar notificaciones"}
            </button>
          )}
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
