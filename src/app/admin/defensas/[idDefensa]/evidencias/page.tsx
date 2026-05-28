"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Evidencia = {
  idEvidencia: number | null;
  idAsignacion: number;
  imagenNombre: string | null;
  imagenMime: string | null;
  pdfNombre: string | null;
  pdfMime: string | null;
  urlImagen: string | null;
  urlPdf: string | null;
  comentarios: string | null;
  urlArchivo: string | null;
  fechaSubida: string | null;
  idDelegado: number | null;
  nombreDelegado: string | null;
  apellidoDelegado: string | null;
};

type DefensaInfo = {
  idDefensa: number;
  titulo: string;
  fecha: string | null;
  lugar: string | null;
  nombreEstudiante: string;
  apellidoEstudiante: string;
  nombreDelegado: string | null;
  apellidoDelegado: string | null;
};

const Icon = ({ d, size = 18 }: { d: React.ReactNode; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const icons = {
  back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  info: (
    <>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </>
  ),
  doc: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="15" x2="15" y2="15" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </>
  ),
  pdf: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </>
  ),
  chat: (
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
};

function fFecha(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fHora(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fFechaHora(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminEvidenciasPage() {
  const params = useParams<{ idDefensa: string }>();
  const router = useRouter();
  const [defensa, setDefensa] = useState<DefensaInfo | null>(null);
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.idDefensa) return;
    setLoading(true);
    fetch(`/api/admin/defensas/${params.idDefensa}/evidencias`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setDefensa(d.defensa ?? null);
          setEvidencias(d.evidencias ?? []);
        } else {
          setError(d.mensaje || "No se pudieron cargar las evidencias");
        }
      })
      .catch(() => setError("Sin conexión"))
      .finally(() => setLoading(false));
  }, [params?.idDefensa]);

  return (
    <div className="evid-shell">
      <header className="evid-header">
        <div className="evid-header__inner">
          <button
            className="evid-header__back"
            onClick={() => router.push("/admin/defensas")}
            type="button"
          >
            <Icon d={icons.back} size={16} />
            Volver al listado
          </button>
          <h1 className="evid-header__title">Evidencias de la defensa</h1>
          {defensa && (
            <p className="evid-header__sub">
              {defensa.nombreEstudiante} {defensa.apellidoEstudiante}
              {defensa.titulo && (
                <>
                  {" · "}
                  <span style={{ opacity: 0.85 }}>{defensa.titulo}</span>
                </>
              )}
            </p>
          )}
        </div>
      </header>

      <div className="evid-container">
        {defensa && (
          <section className="evid-card evid-card--info">
            <div className="evid-card__head">
              <div className="evid-card__title">
                <span className="evid-icon-wrap">
                  <Icon d={icons.info} size={18} />
                </span>
                Información de la defensa
              </div>
            </div>
            <div className="evid-meta">
              <div className="evid-meta__item">
                <span className="evid-meta__label">Título</span>
                <span className="evid-meta__value">{defensa.titulo}</span>
              </div>
              <div className="evid-meta__item">
                <span className="evid-meta__label">
                  <Icon d={icons.calendar} size={11} /> Fecha
                </span>
                <span className="evid-meta__value">
                  {fFecha(defensa.fecha)}
                </span>
              </div>
              <div className="evid-meta__item">
                <span className="evid-meta__label">
                  <Icon d={icons.clock} size={11} /> Hora
                </span>
                <span className="evid-meta__value">{fHora(defensa.fecha)}</span>
              </div>
              <div className="evid-meta__item">
                <span className="evid-meta__label">
                  <Icon d={icons.pin} size={11} /> Lugar
                </span>
                <span className="evid-meta__value">{defensa.lugar || "-"}</span>
              </div>
              {defensa.nombreDelegado && (
                <div className="evid-meta__item">
                  <span className="evid-meta__label">
                    <Icon d={icons.user} size={11} /> Delegado
                  </span>
                  <span className="evid-meta__value">
                    {defensa.nombreDelegado} {defensa.apellidoDelegado}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {loading && (
          <div className="evid-empty">
            <p>Cargando evidencias...</p>
          </div>
        )}
        {error && (
          <div className="evid-empty">
            <p className="form__error">{error}</p>
          </div>
        )}
        {!loading && !error && evidencias.length === 0 && (
          <div className="evid-empty">
            <p>Esta defensa aún no tiene evidencias cargadas.</p>
          </div>
        )}

        {evidencias.map((e, idx) => {
          const comentariosTexto =
            e.comentarios?.trim() || e.urlArchivo?.trim() || null;
          return (
            <section
              key={`${e.idAsignacion}-${idx}`}
              className="evid-card evid-card--evidence"
            >
              <div className="evid-card__head">
                <div className="evid-card__title">
                  <span className="evid-icon-wrap">
                    <Icon d={icons.doc} size={18} />
                  </span>
                  Evidencia subida
                </div>
                {e.fechaSubida && (
                  <span className="evid-chip-time">
                    <Icon d={icons.clock} size={12} />
                    {fFechaHora(e.fechaSubida)}
                  </span>
                )}
              </div>

              {e.nombreDelegado && (
                <div className="evid-meta">
                  <div className="evid-meta__item">
                    <span className="evid-meta__label">
                      <Icon d={icons.user} size={11} /> Subido por
                    </span>
                    <span className="evid-meta__value">
                      {e.nombreDelegado} {e.apellidoDelegado}
                    </span>
                  </div>
                </div>
              )}

              <div className="evid-section">
                <div className="evid-section__label">
                  <span className="evid-icon-wrap">
                    <Icon d={icons.image} size={14} />
                  </span>
                  Imagen del acta
                </div>
                {e.idEvidencia && e.imagenMime ? (
                  <a
                    href={`/api/evidencias/${e.idEvidencia}/imagen`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evid-image-wrap"
                  >
                    <img
                      src={`/api/evidencias/${e.idEvidencia}/imagen`}
                      alt="Acta de la defensa"
                    />
                  </a>
                ) : e.urlImagen ? (
                  <a
                    href={e.urlImagen}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="evid-image-wrap"
                  >
                    <img src={e.urlImagen} alt="Acta de la defensa" />
                  </a>
                ) : (
                  <span className="evid-placeholder">Sin imagen cargada</span>
                )}
              </div>

              <div className="evid-section">
                <div className="evid-section__label">
                  <span className="evid-icon-wrap">
                    <Icon d={icons.pdf} size={14} />
                  </span>
                  Informe (PDF)
                </div>
                {e.idEvidencia && e.pdfMime ? (
                  <a
                    className="evid-pdf-btn"
                    href={`/api/evidencias/${e.idEvidencia}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon d={icons.pdf} size={16} />
                    Abrir informe PDF
                  </a>
                ) : e.urlPdf ? (
                  <a
                    className="evid-pdf-btn"
                    href={e.urlPdf}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon d={icons.pdf} size={16} />
                    Abrir informe PDF
                  </a>
                ) : (
                  <span className="evid-placeholder">Sin PDF cargado</span>
                )}
              </div>

              <div className="evid-section">
                <div className="evid-section__label">
                  <span className="evid-icon-wrap">
                    <Icon d={icons.chat} size={14} />
                  </span>
                  Comentarios del delegado
                </div>
                {comentariosTexto ? (
                  <div className="evid-comments">{comentariosTexto}</div>
                ) : (
                  <span className="evid-placeholder">Sin comentarios</span>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
