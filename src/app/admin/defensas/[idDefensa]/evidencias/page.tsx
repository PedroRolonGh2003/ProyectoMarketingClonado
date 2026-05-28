"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

type Evidencia = {
  comentarios?: string | null;
  imagenUrl?: string | null;
  pdfUrl?: string | null;
  imagenNombre?: string | null;
  pdfNombre?: string | null;
  fechaRegistro?: string | null;
  idAsignacion?: number | null;
};

export default function AdminEvidenciasPage() {
  const { usuario, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ idDefensa: string }>();
  const idDefensa = useMemo(() => Number(params?.idDefensa), [params]);

  const [data, setData] = useState<Evidencia[]>([]);
  const [error, setError] = useState<string>("");
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!usuario) router.replace("/login");
    else if (usuario.rol !== 0) router.replace("/delegado");
  }, [usuario, loading, router]);

  useEffect(() => {
    if (!usuario || usuario.rol !== 0) return;
    if (!Number.isFinite(idDefensa)) {
      setError("ID de defensa inválido");
      setFetching(false);
      return;
    }
    setFetching(true);
    setError("");
    fetch(`/api/admin/defensas/${idDefensa}/evidencias`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setData(Array.isArray(d.evidencias) ? d.evidencias : []);
        else setError(d?.mensaje || "No se pudieron cargar las evidencias");
      })
      .catch(() => setError("No se pudieron cargar las evidencias"))
      .finally(() => setFetching(false));
  }, [usuario, idDefensa]);

  if (loading || !usuario || usuario.rol !== 0) {
    return (
      <div className="page-bg loading-center">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="page-bg" style={{ minHeight: "100vh" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 16px" }}>
        <button
          className="btn-back"
          onClick={() => router.push("/admin/defensas")}
        >
          Volver
        </button>
        <h2 className="page-title" style={{ marginTop: 12 }}>
          Evidencias — Defensa #{idDefensa}
        </h2>
        <p className="page-sub">
          Imagen de asistencia e informe PDF subidos por el delegado
        </p>

        {fetching ? (
          <p>Cargando evidencias...</p>
        ) : error ? (
          <p className="form__error">{error}</p>
        ) : data.length === 0 ? (
          <p className="text-muted">No hay evidencias registradas.</p>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {data.map((e, idx) => (
              <div
                key={`${e.idAsignacion ?? "x"}-${e.fechaRegistro ?? idx}`}
                className="admin-panel"
              >
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                      className="btn-outline"
                      href={e.imagenUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!e.imagenUrl}
                      style={{
                        pointerEvents: e.imagenUrl ? "auto" : "none",
                        opacity: e.imagenUrl ? 1 : 0.55,
                      }}
                    >
                      Ver imagen
                    </a>
                    <a
                      className="btn-outline"
                      href={e.pdfUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!e.pdfUrl}
                      style={{
                        pointerEvents: e.pdfUrl ? "auto" : "none",
                        opacity: e.pdfUrl ? 1 : 0.55,
                      }}
                    >
                      Ver PDF
                    </a>
                  </div>

                  {e.imagenUrl && (
                    <img
                      src={e.imagenUrl}
                      alt="Evidencia de asistencia"
                      style={{
                        width: "100%",
                        maxWidth: 720,
                        borderRadius: 12,
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                    />
                  )}

                  {e.comentarios && (
                    <div>
                      <div className="font-semibold">Comentarios</div>
                      <div className="text-muted">{e.comentarios}</div>
                    </div>
                  )}

                  <div className="text-muted" style={{ fontSize: 12 }}>
                    {e.fechaRegistro
                      ? `Registrado: ${String(e.fechaRegistro)}`
                      : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
