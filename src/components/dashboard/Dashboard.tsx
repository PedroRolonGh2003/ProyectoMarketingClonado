// src\components\dashboard\Dashboard.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import PushSubscribe from "@/components/pwa/PushSubscribe";
import {
  adminPathFromNav,
  delegadoPathFromNav,
  navFromAdminPath,
  navFromDelegadoPath,
} from "@/lib/routes";
import {
  buildFechaHoraISO,
  isoALocalNaive,
  localNaiveAISO,
  parseNombreEstudiante,
  validarFechaHoraDefensa,
} from "@/lib/defensa-form";
import {
  defensaEditarSchema,
  delegadoEditarSchema,
  delegadoNuevoSchema,
} from "@/lib/schemas";
import "@/components/dashboard/Dashboard.css";

const API = "/api";

// TIPOS
interface Usuario {
  id: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  rol: number;
  rolNombre: string;
}

interface Defensa {
  idDefensa: number;
  idAsignacion: number;
  fecha: string;
  lugar: string;
  estado: string;
  estadoAsignacion: string;
  estadoPago?: string;
  titulo: string;
  nombreEstudiante: string;
  apellidoEstudiante: string;
  nombreDelegado?: string;
  apellidoDelegado?: string;
  idDelegado?: number;
  motivoRechazo?: string | null;
  tieneEvidencia?: boolean;
}

interface Delegado {
  idUsuario: number;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  activo: number;
  defensasAsignadas?: number;
}

interface Pago {
  idPago: number;
  idDefensa: number;
  monto: number;
  estado: string;
  fechaPago: string | null;
  titulo?: string;
  nombreEstudiante: string;
  apellidoEstudiante: string;
  nombreDelegado?: string;
  apellidoDelegado?: string;
  fecha: string;
}

function esPagoCompletado(estado?: string | null, fechaPago?: string | null) {
  if (fechaPago) return true;
  if (!estado) return false;
  const e = String(estado).toLowerCase().trim();
  return e === "completado" || e === "pagado";
}

function esPagoPendiente(estado?: string | null, fechaPago?: string | null) {
  return !esPagoCompletado(estado, fechaPago);
}

// ICONOS
const Ico = ({ d, size = 22 }: { d: React.ReactNode; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

const icons: Record<string, React.ReactNode> = {
  home: (
    <>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  doc: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </>
  ),
  check: <polyline points="20 6 9 17 4 12" />,
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  checkCirc: (
    <>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </>
  ),
  back: (
    <>
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </>
  ),
  upload: (
    <>
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  mail: (
    <>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </>
  ),
  phone: (
    <>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.55 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </>
  ),
  pin: (
    <>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  close: (
    <>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </>
  ),
  eye: (
    <>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: (
    <>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </>
  ),
  trash: (
    <>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4h6v2" />
    </>
  ),
  dollar: (
    <>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </>
  ),
  filter: (
    <>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </>
  ),
};

// HELPERS
// Las fechas de defensa se manejan como wall-clock literal: lo que está en la
// cadena (ISO o "YYYY-MM-DD HH:MM:SS") es lo que el usuario ve y edita. No
// hacemos conversión de timezone para evitar desfases por años extremos o por
// la zona horaria del proceso.
const MESES_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];
const DIAS_ES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const fFecha = (f: string) => {
  if (!f) return "-";
  const m = f.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "-";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // Día de la semana usando algoritmo de Zeller (timezone-independent).
  const yy = mo < 3 ? y - 1 : y;
  const mm = mo < 3 ? mo + 12 : mo;
  const k = yy % 100;
  const j = Math.floor(yy / 100);
  const h =
    (d +
      Math.floor((13 * (mm + 1)) / 5) +
      k +
      Math.floor(k / 4) +
      Math.floor(j / 4) +
      5 * j) %
    7;
  // Zeller: 0=sábado, 1=domingo, ..., 6=viernes → mapear a domingo=0..sábado=6.
  const idxDia = (h + 6) % 7;
  return `${DIAS_ES[idxDia]}, ${d} de ${MESES_ES[mo - 1]} de ${y}`;
};
const fFechaCorta = (f: string) => {
  if (!f) return "-";
  const m = f.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "-";
  return `${m[3]}/${m[2]}/${m[1]}`;
};
const fHora = (f: string) => {
  if (!f) return "-";
  const m = f.match(/[T ](\d{2}):(\d{2})/);
  if (!m) return "-";
  let h = Number(m[1]);
  const mins = m[2];
  const ampm = h >= 12 ? "p. m." : "a. m.";
  h = h % 12 || 12;
  return `${h.toString().padStart(2, "0")}:${mins} ${ampm}`;
};

function estadoAdminDefensa(d: Defensa): string {
  if (d.estadoAsignacion) return d.estadoAsignacion;
  if (!d.nombreDelegado && !d.idDelegado) return "sin asignar";
  return d.estado || "pendiente";
}

function esEstadoFinalizado(estado: string) {
  const norm = String(estado).toLowerCase().trim();
  return (
    norm === "completada" ||
    norm === "completado" ||
    norm === "cancelada" ||
    norm === "cancelado"
  );
}

function esDefensaCompletada(d: Defensa) {
  const estado = String(d.estado ?? "")
    .toLowerCase()
    .trim();
  const estadoAsignacion = String(d.estadoAsignacion ?? "")
    .toLowerCase()
    .trim();
  return (
    estado === "completada" ||
    estado === "completado" ||
    estadoAsignacion === "completada" ||
    estadoAsignacion === "completado" ||
    Boolean(d.tieneEvidencia)
  );
}

function BadgeEstado({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    pendiente: "badge--pendiente",
    aceptada: "badge--aceptada",
    rechazada: "badge--rechazada",
    completada: "badge--completada",
    completado: "badge--completada",
    convocada: "badge--convocada",
    cancelada: "badge--cancelada",
    "sin asignar": "badge--sin-asignar",
  };
  const labels: Record<string, string> = {
    pendiente: "Pendiente",
    aceptada: "Aceptada",
    rechazada: "Rechazada",
    completada: "Completada",
    completado: "Completada",
    convocada: "Convocada",
    cancelada: "Cancelada",
    "sin asignar": "Sin asignar",
  };
  const cls = map[estado?.toLowerCase()] || "badge--pendiente";
  return (
    <span className={`badge ${cls}`}>
      {labels[estado?.toLowerCase()] || estado}
    </span>
  );
}

// COMPONENTES COMPARTIDOS
function Spinner() {
  return (
    <div className="loading">
      <div className="loading__spinner" />
      <p>Cargando...</p>
    </div>
  );
}
function Vacio({ texto }: { texto: string }) {
  return <div className="empty">{texto}</div>;
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal ${wide ? "modal--wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div>
            <h3 className="modal__title">{title}</h3>
            {subtitle && <p className="modal__sub">{subtitle}</p>}
          </div>
          <button
            className="modal__close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Ico d={icons.close} size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Topbar({
  usuario,
  onBack,
}: {
  usuario: Usuario;
  onBack?: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar__left">
        {onBack && (
          <button className="topbar__back" onClick={onBack} aria-label="Volver">
            <Ico d={icons.back} size={20} />
          </button>
        )}
        <div>
          <span className="topbar__title">Colegio de Marketing</span>
          <span className="topbar__sub">Portal {usuario.rolNombre}</span>
        </div>
      </div>
    </header>
  );
}

function BottomNav({
  active,
  onChange,
}: {
  active: string;
  onChange: (key: string) => void;
}) {
  const items = [
    { key: "inicio", label: "Inicio", d: icons.home },
    { key: "nuevas", label: "Nuevas", d: icons.doc },
    { key: "pendientes", label: "Pendientes", d: icons.doc },
    { key: "completadas", label: "Completadas", d: icons.check },
    { key: "perfil", label: "Perfil", d: icons.user },
  ];
  return (
    <nav className="bottom-nav">
      {items.map(({ key, label, d }) => (
        <button
          key={key}
          className={`bottom-nav__item ${active === key ? "bottom-nav__item--active" : ""}`}
          onClick={() => onChange(key)}
        >
          <Ico d={d} size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

// VISTAS DELEGADO
function VistaInicio({
  usuario,
  defensas,
  loading,
  onNav,
}: {
  usuario: Usuario;
  defensas: Defensa[];
  loading: boolean;
  onNav: (k: string) => void;
}) {
  const counts = {
    nuevas: defensas.filter((d) => d.estadoAsignacion === "pendiente").length,
    pendientes: defensas.filter((d) => d.estadoAsignacion === "aceptada")
      .length,
    completadas: defensas.filter((d) => d.estadoAsignacion === "completada")
      .length,
  };
  return (
    <>
      <Topbar usuario={usuario} />
      <main className="main-content">
        <section className="welcome">
          <h1 className="welcome__title">Bienvenida/o</h1>
          <p className="welcome__name">
            {usuario.nombre} {usuario.apellido}
          </p>
          <span className="welcome__rol">{usuario.rolNombre}</span>
        </section>
        <section className="stats">
          {(
            [
              { key: "nuevas", label: "Nuevas", ico: icons.bell, cls: "blue" },
              {
                key: "pendientes",
                label: "Pendientes",
                ico: icons.calendar,
                cls: "yellow",
              },
              {
                key: "completadas",
                label: "Completadas",
                ico: icons.checkCirc,
                cls: "green",
              },
            ] as const
          ).map(({ key, label, ico, cls }) => (
            <button key={key} className="stat-card" onClick={() => onNav(key)}>
              <div className={`stat-card__icon stat-card__icon--${cls}`}>
                <Ico d={ico} size={24} />
              </div>
              <span className="stat-card__num">
                {loading ? "..." : counts[key]}
              </span>
              <span className="stat-card__label">{label}</span>
            </button>
          ))}
        </section>
      </main>
    </>
  );
}

function VistaNuevas({
  usuario,
  defensas,
  loading,
  onDetalle,
}: {
  usuario: Usuario;
  defensas: Defensa[];
  loading: boolean;
  onDetalle: (d: Defensa) => void;
}) {
  const lista = defensas.filter((d) => d.estadoAsignacion === "pendiente");
  return (
    <>
      <Topbar usuario={usuario} />
      <main className="main-content">
        <div className="page-header">
          <h2 className="page-title">Nuevas Convocatorias</h2>
          <p className="page-sub">Revisa y acepta las invitaciones</p>
        </div>
        {loading ? (
          <Spinner />
        ) : lista.length === 0 ? (
          <Vacio texto="No hay nuevas convocatorias" />
        ) : (
          lista.map((d) => (
            <div key={d.idDefensa} className="inv-card">
              <div className="inv-card__head">
                <div>
                  <h3 className="inv-card__nombre">
                    {d.nombreEstudiante} {d.apellidoEstudiante}
                  </h3>
                  <p className="inv-card__titulo">{d.titulo}</p>
                </div>
                <span className="badge badge--nueva">Nueva</span>
              </div>
              <div className="inv-card__meta">
                <p>
                  <Ico d={icons.calendar} size={14} /> <strong>Fecha:</strong>{" "}
                  {fFecha(d.fecha)}
                </p>
                <p>
                  <Ico d={icons.bell} size={14} /> <strong>Hora:</strong>{" "}
                  {fHora(d.fecha)}
                </p>
                <p>
                  <Ico d={icons.pin} size={14} /> <strong>Lugar:</strong>{" "}
                  {d.lugar || "Sin lugar"}
                </p>
              </div>
              <button className="btn-primary" onClick={() => onDetalle(d)}>
                Ver detalle
              </button>
            </div>
          ))
        )}
      </main>
    </>
  );
}

function VistaDetalle({
  usuario,
  defensa,
  onBack,
  onAceptar,
  onRechazar,
}: {
  usuario: Usuario;
  defensa: Defensa;
  onBack: () => void;
  onAceptar: (id: number) => Promise<void>;
  onRechazar: (id: number, j: string) => Promise<void>;
}) {
  const [modalRechazo, setModalRechazo] = useState(false);
  const [justificacion, setJustificacion] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <>
      <Topbar usuario={usuario} />
      <main className="main-content">
        <button className="btn-back" onClick={onBack}>
          <Ico d={icons.back} size={16} /> Volver
        </button>
        <h2 className="page-title mb-24">Detalle de Convocatoria</h2>
        <div className="detail-section">
          <h4 className="detail-section__title">Información del Estudiante</h4>
          <div className="detail-field">
            <span className="detail-field__label">Nombre completo</span>
            <span className="detail-field__value">
              {defensa.nombreEstudiante} {defensa.apellidoEstudiante}
            </span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Título de tesis</span>
            <span className="detail-field__value">{defensa.titulo}</span>
          </div>
        </div>
        <div className="detail-section">
          <h4 className="detail-section__title">Fecha y Hora</h4>
          <div className="detail-field">
            <span className="detail-field__label">Fecha</span>
            <span className="detail-field__value">{fFecha(defensa.fecha)}</span>
          </div>
          <div className="detail-field">
            <span className="detail-field__label">Hora</span>
            <span className="detail-field__value">{fHora(defensa.fecha)}</span>
          </div>
        </div>
        <div className="detail-section">
          <h4 className="detail-section__title">Ubicación</h4>
          <div className="detail-field">
            <span className="detail-field__label">Lugar</span>
            <span className="detail-field__value">
              {defensa.lugar || "Sin lugar"}
            </span>
          </div>
        </div>
        <div className="detail-actions">
          <button
            className="btn-primary"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await onAceptar(defensa.idAsignacion);
              setLoading(false);
            }}
          >
            <Ico d={icons.check} size={16} /> Aceptar convocatoria
          </button>
          <button
            className="btn-danger"
            disabled={loading}
            onClick={() => setModalRechazo(true)}
          >
            <Ico d={icons.close} size={16} /> Rechazar
          </button>
        </div>
      </main>
      {modalRechazo && (
        <Modal
          title="Rechazar convocatoria"
          subtitle="Proporciona un justificativo."
          onClose={() => setModalRechazo(false)}
        >
          <div className="modal__body">
            <label className="form__label">Justificativo *</label>
            <textarea
              className="form__textarea"
              placeholder="Ej. Conflicto de horario..."
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
            />
          </div>
          <div className="modal__footer">
            <button
              className="btn-outline"
              onClick={() => setModalRechazo(false)}
            >
              Cancelar
            </button>
            <button
              className="btn-danger"
              disabled={!justificacion.trim()}
              onClick={async () => {
                setLoading(true);
                await onRechazar(defensa.idAsignacion, justificacion);
                setLoading(false);
                setModalRechazo(false);
              }}
            >
              Confirmar rechazo
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function VistaPendientes({
  usuario,
  defensas,
  loading,
  onEvidencia,
}: {
  usuario: Usuario;
  defensas: Defensa[];
  loading: boolean;
  onEvidencia: (d: Defensa) => void;
}) {
  const lista = defensas.filter((d) => d.estadoAsignacion === "aceptada");
  return (
    <>
      <Topbar usuario={usuario} />
      <main className="main-content">
        <div className="page-header">
          <h2 className="page-title">Defensas Pendientes</h2>
          <p className="page-sub">Defensas aceptadas por completar</p>
        </div>
        {loading ? (
          <Spinner />
        ) : lista.length === 0 ? (
          <Vacio texto="No hay defensas pendientes" />
        ) : (
          lista.map((d) => (
            <div key={d.idDefensa} className="inv-card">
              <h3 className="inv-card__nombre">
                {d.nombreEstudiante} {d.apellidoEstudiante}
              </h3>
              <p className="inv-card__titulo">{d.titulo}</p>
              <div className="inv-card__meta">
                <p>
                  <strong>Fecha:</strong> {fFechaCorta(d.fecha)}
                </p>
                <p>
                  <strong>Hora:</strong> {fHora(d.fecha)}
                </p>
                <p>
                  <strong>Lugar:</strong> {d.lugar || "Sin lugar"}
                </p>
              </div>
              <button className="btn-primary" onClick={() => onEvidencia(d)}>
                <Ico d={icons.upload} size={16} /> Completar defensa
              </button>
            </div>
          ))
        )}
      </main>
    </>
  );
}

function VistaEvidencia({
  usuario,
  defensa,
  onBack,
  onEnviar,
}: {
  usuario: Usuario;
  defensa: Defensa;
  onBack: () => void;
  onEnviar: (p: any) => Promise<void>;
}) {
  const [imagen, setImagen] = useState<File | null>(null);
  const [pdf, setPdf] = useState<File | null>(null);
  const [comentarios, setComent] = useState("");
  const [loading, setLoading] = useState(false);
  return (
    <>
      <Topbar usuario={usuario} />
      <main className="main-content">
        <button className="btn-back" onClick={onBack}>
          <Ico d={icons.back} size={16} /> Volver
        </button>
        <h2 className="page-title">Subir Evidencia</h2>
        <p className="page-sub mb-20">
          {defensa.nombreEstudiante} {defensa.apellidoEstudiante}
        </p>
        <div className="detail-section">
          <h4 className="detail-section__title">Información de la Defensa</h4>
          <p className="ev-info">
            <strong>Título:</strong> {defensa.titulo}
          </p>
          <p className="ev-info">
            <strong>Fecha:</strong> {fFechaCorta(defensa.fecha)}
          </p>
          <p className="ev-info">
            <strong>Hora:</strong> {fHora(defensa.fecha)}
          </p>
          <p className="ev-info">
            <strong>Lugar:</strong> {defensa.lugar}
          </p>
        </div>
        <div className="detail-section">
          <h4 className="detail-section__title">Subir Imagen de Asistencia</h4>
          <input
            type="file"
            accept="image/*"
            className="file-input"
            onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
            aria-label="Seleccionar imagen de asistencia"
          />
          <p className="file-hint">Fotografía del acta de defensa</p>
        </div>
        <div className="detail-section">
          <h4 className="detail-section__title">
            Subir Archivo PDF del Informe
          </h4>
          <input
            type="file"
            accept=".pdf"
            className="file-input"
            onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
            aria-label="Seleccionar archivo PDF del informe"
          />
          <p className="file-hint">Informe de la defensa en formato PDF</p>
        </div>
        <div className="detail-section">
          <h4 className="detail-section__title">Comentarios</h4>
          <textarea
            className="form__textarea"
            placeholder="Observaciones adicionales..."
            value={comentarios}
            onChange={(e) => setComent(e.target.value)}
          />
        </div>
        <button
          className="btn-primary btn-primary--full"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            await onEnviar({ defensa, imagen, pdf, comentarios });
            setLoading(false);
          }}
        >
          {loading ? (
            <span className="btn-spinner" />
          ) : (
            <Ico d={icons.upload} size={16} />
          )}
          {loading ? " Enviando..." : " Enviar evidencia"}
        </button>
      </main>
    </>
  );
}

function VistaCompletadas({
  usuario,
  defensas,
  loading,
}: {
  usuario: Usuario;
  defensas: Defensa[];
  loading: boolean;
}) {
  const lista = defensas.filter((d) => d.estadoAsignacion === "completada");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mm = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mm.matches);
    update();
    mm.addEventListener?.("change", update);
    window.addEventListener("resize", update);
    return () => {
      mm.removeEventListener?.("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <>
      <Topbar usuario={usuario} />
      <main className="main-content">
        <div className="page-header">
          <h2 className="page-title">Defensas Completadas</h2>
          <p className="page-sub">Historial de defensas realizadas</p>
        </div>
        {loading ? (
          <Spinner />
        ) : lista.length === 0 ? (
          <Vacio texto="Sin registros" />
        ) : isMobile ? (
          <div className="comp-cards">
            {lista.map((d) => (
              <div key={d.idDefensa} className="comp-card">
                <div className="comp-card__head">
                  <div>
                    <div className="comp-card__student">
                      {d.nombreEstudiante} {d.apellidoEstudiante}
                    </div>
                    <div className="comp-card__title">{d.titulo}</div>
                  </div>
                  <div className="comp-card__meta">
                    <div className="comp-card__date">
                      {fFechaCorta(d.fecha)}
                    </div>
                    {d.lugar && (
                      <div className="comp-card__place">{d.lugar}</div>
                    )}
                  </div>
                </div>
                <div className="comp-card__footer">
                  <span
                    className={`badge ${esPagoCompletado(d.estadoPago) ? "badge--pagado" : "badge--pend-pago"}`}
                  >
                    {esPagoCompletado(d.estadoPago, null)
                      ? "Completado"
                      : "Pendiente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Perfil de tesis</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((d) => (
                  <tr key={d.idDefensa}>
                    <td className="td-bold">
                      {d.nombreEstudiante} {d.apellidoEstudiante}
                    </td>
                    <td className="td-truncate">{d.titulo}</td>
                    <td>{fFechaCorta(d.fecha)}</td>
                    <td>
                      <span
                        className={`badge ${esPagoCompletado(d.estadoPago) ? "badge--pagado" : "badge--pend-pago"}`}
                      >
                        {esPagoCompletado(d.estadoPago, null)
                          ? "Completado"
                          : "Pendiente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

function VistaPerfil({
  usuario,
  onLogout,
}: {
  usuario: Usuario;
  onLogout: () => void;
}) {
  const [modalPass, setModalPass] = useState(false);
  const [passForm, setPassForm] = useState({
    actual: "",
    nueva: "",
    confirmar: "",
  });
  const [passMsg, setPassMsg] = useState("");

  const handleChangePass = async () => {
    if (passForm.nueva !== passForm.confirmar) {
      setPassMsg("Las contraseñas no coinciden");
      return;
    }
    const res = await fetch(`${API}/usuario/${usuario.id}/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual: passForm.actual, nueva: passForm.nueva }),
    });
    const data = await res.json();
    if (data.ok) {
      setPassMsg("Contraseña actualizada ✓");
      setTimeout(() => {
        setModalPass(false);
        setPassMsg("");
        setPassForm({ actual: "", nueva: "", confirmar: "" });
      }, 1500);
    } else {
      setPassMsg(data.mensaje || "Error");
    }
  };

  return (
    <>
      <Topbar usuario={usuario} />
      <main className="main-content">
        <div className="page-header">
          <h2 className="page-title">Mi Perfil</h2>
          <p className="page-sub">Gestiona tu información personal</p>
        </div>
        <div className="profile-avatar-row">
          <div className="profile-avatar">
            <Ico d={icons.user} size={32} />
          </div>
          <div>
            <p className="profile-nombre">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="profile-rol">{usuario.rolNombre}</p>
          </div>
        </div>
        <div className="detail-section">
          <h4 className="detail-section__title">Información Personal</h4>
          <div className="profile-field">
            <span className="detail-field__label">Nombre completo</span>
            <span className="detail-field__value">
              {usuario.nombre} {usuario.apellido}
            </span>
          </div>
          <div className="profile-field">
            <span className="detail-field__label">Correo electrónico</span>
            <span className="detail-field__value">{usuario.correo}</span>
          </div>
          <div className="profile-field">
            <span className="detail-field__label">Teléfono</span>
            <span className="detail-field__value">
              {usuario.telefono || "No registrado"}
            </span>
          </div>
        </div>
        <div className="detail-section">
          <h4 className="detail-section__title">Seguridad</h4>
          <button
            className="btn-outline btn-outline--full"
            onClick={() => setModalPass(true)}
          >
            <Ico d={icons.lock} size={16} /> Cambiar contraseña
          </button>
        </div>

        {usuario.rol === 1 && (
          <div className="detail-section">
            <PushSubscribe usuarioId={usuario.id} />
          </div>
        )}

        <button className="btn-logout-full" onClick={onLogout}>
          <Ico d={icons.logout} size={18} /> Cerrar sesión
        </button>
      </main>
      {modalPass && (
        <Modal
          title="Cambiar Contraseña"
          subtitle="Ingresa tu contraseña actual y la nueva."
          onClose={() => setModalPass(false)}
        >
          <div className="modal__body">
            <div className="form__group mb-14">
              <label className="form__label" htmlFor="pass-actual">
                Contraseña actual
              </label>
              <input
                id="pass-actual"
                type="password"
                className="form__input"
                title="Contraseña actual"
                aria-label="Contraseña actual"
                value={passForm.actual}
                onChange={(e) =>
                  setPassForm({ ...passForm, actual: e.target.value })
                }
              />
            </div>

            <div className="form__group mb-14">
              <label className="form__label" htmlFor="pass-nueva">
                Nueva contraseña
              </label>
              <input
                id="pass-nueva"
                type="password"
                className="form__input"
                title="Nueva contraseña"
                aria-label="Nueva contraseña"
                value={passForm.nueva}
                onChange={(e) =>
                  setPassForm({ ...passForm, nueva: e.target.value })
                }
              />
            </div>

            <div className="form__group mb-14">
              <label className="form__label" htmlFor="pass-confirmar">
                Confirmar nueva contraseña
              </label>
              <input
                id="pass-confirmar"
                type="password"
                className="form__input"
                title="Confirmar nueva contraseña"
                aria-label="Confirmar nueva contraseña"
                value={passForm.confirmar}
                onChange={(e) =>
                  setPassForm({ ...passForm, confirmar: e.target.value })
                }
              />
            </div>
            {passMsg && (
              <p
                className={
                  passMsg.includes("✓") ? "form__msg--ok" : "form__error"
                }
              >
                {passMsg}
              </p>
            )}
          </div>
          <div className="modal__footer">
            <button className="btn-outline" onClick={() => setModalPass(false)}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleChangePass}>
              Cambiar contraseña
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

// VISTAS ADMIN
function VistaAdminDashboard({
  defensas,
  onNav,
}: {
  defensas: Defensa[];
  onNav: (k: string) => void;
}) {
  const [pagosPendientes, setPagosPendientes] = useState(0);

  useEffect(() => {
    fetch(`${API}/admin/pagos`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.pagos)) {
          setPagosPendientes(
            typeof d.pendientes === "number"
              ? d.pendientes
              : (d.pagos || []).length,
          );
        }
      })
      .catch(() => {});
  }, []);

  const hoy = new Date();
  const defensasHoy = defensas.filter((x) => {
    const fx = new Date(x.fecha);
    return fx.toDateString() === hoy.toDateString();
  }).length;
  const sinAsignar = defensas.filter((x) => !x.nombreDelegado).length;
  const completadas = defensas.filter((x) => x.estado === "completada").length;
  const proximas = [...defensas]
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .slice(0, 5);

  const cards = [
    {
      label: "Defensas hoy",
      value: defensasHoy,
      tone: "blue",
      ico: icons.calendar,
    },
    {
      label: "Defensas sin asignar",
      value: sinAsignar,
      tone: "orange",
      ico: icons.bell,
    },
    {
      label: "Convocatorias enviadas",
      value: defensas.length,
      tone: "purple",
      ico: icons.doc,
    },
    {
      label: "Defensas completadas",
      value: completadas,
      tone: "green",
      ico: icons.checkCirc,
    },
    {
      label: "Pagos pendientes",
      value: pagosPendientes,
      tone: "yellow",
      ico: icons.dollar,
    },
  ];

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Dashboard</h2>
          <p className="admin-page-sub">
            Resumen general del sistema de defensas de tesis
          </p>
        </div>
      </div>
      <div className="admin-cards">
        {cards.map((c) => (
          <div key={c.label} className="admin-card">
            <div className="admin-card__top">
              <span className="admin-card__label">{c.label}</span>
              <div className={`admin-card__ico admin-card__ico--${c.tone}`}>
                <Ico d={c.ico} size={16} />
              </div>
            </div>
            <div className="admin-card__value">{c.value}</div>
          </div>
        ))}
      </div>
      <div className="admin-panel">
        <div className="admin-panel__head">
          <div>
            <h3 className="page-title">Próximas defensas</h3>
            <p className="page-sub">
              Defensas programadas para los próximos días
            </p>
          </div>
          <button
            className="btn-outline"
            onClick={() => onNav("admin_defensas")}
            type="button"
          >
            Ver todas
          </button>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Título de tesis</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Lugar</th>
                <th>Delegado asignado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {proximas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="td-empty td-empty-muted">
                    Sin registros
                  </td>
                </tr>
              ) : (
                proximas.map((x) => (
                  <tr key={x.idDefensa}>
                    <td className="td-bold">
                      {x.nombreEstudiante} {x.apellidoEstudiante}
                    </td>
                    <td className="td-truncate">{x.titulo}</td>
                    <td>{fFechaCorta(x.fecha)}</td>
                    <td>{fHora(x.fecha)}</td>
                    <td className="td-truncate">{x.lugar || "-"}</td>
                    <td>
                      {x.nombreDelegado ? (
                        `${x.nombreDelegado} ${x.apellidoDelegado}`
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <BadgeEstado estado={x.estadoAsignacion || x.estado} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function VistaAdminDefensas({
  defensas,
  loading,
  delegados,
  onIrCrear,
  onRecargar,
  onQuitarDefensa,
}: {
  defensas: Defensa[];
  loading: boolean;
  delegados: Delegado[];
  onIrCrear: () => void;
  onRecargar: () => void | Promise<void>;
  onQuitarDefensa: (idDefensa: number) => void;
}) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [filtroDelegado, setFiltro] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [modalAsignar, setModalAsignar] = useState<Defensa | null>(null);
  const [modalVer, setModalVer] = useState<Defensa | null>(null);
  const [editForm, setEditForm] = useState<Defensa | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [editFieldErrors, setEditFieldErrors] = useState<
    Record<string, string>
  >({});
  const [busqDelegado, setBusqDelegado] = useState("");
  const [delegadoSel, setDelegadoSel] = useState<Delegado | null>(null);
  const [msgAsignar, setMsgAsignar] = useState("");
  const [recordatorioLoading, setRecordatorioLoading] = useState<Set<number>>(
    new Set(),
  );

  const filtradas = defensas.filter((d) => {
    const nombre =
      `${d.nombreEstudiante} ${d.apellidoEstudiante}`.toLowerCase();
    const matchBusq = !busqueda || nombre.includes(busqueda.toLowerCase());
    const matchDel =
      !filtroDelegado ||
      `${d.nombreDelegado} ${d.apellidoDelegado}`.includes(filtroDelegado);
    const estado = estadoAdminDefensa(d).toLowerCase();
    const matchEstado =
      !filtroEstado ||
      (filtroEstado === "pendientes"
        ? ![
            "completada",
            "completado",
            "rechazada",
            "cancelada",
            "sin asignar",
          ].includes(estado)
        : filtroEstado === "completadas"
          ? ["completada", "completado"].includes(estado)
          : filtroEstado === "rechazadas"
            ? estado === "rechazada"
            : filtroEstado === "canceladas"
              ? estado === "cancelada"
              : filtroEstado === "sin asignar"
                ? estado === "sin asignar"
                : true);
    return matchBusq && matchDel && matchEstado;
  });

  const delegadosFiltrados = delegados.filter((d) =>
    `${d.nombre} ${d.apellido}`
      .toLowerCase()
      .includes(busqDelegado.toLowerCase()),
  );

  const handleAsignar = async () => {
    if (!delegadoSel || !modalAsignar) return;
    setMsgAsignar("");
    try {
      const res = await fetch(
        `${API}/defensas/${modalAsignar.idDefensa}/asignar`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idDelegado: delegadoSel.idUsuario }),
        },
      );
      const data = await res.json();
      if (data.ok) {
        setModalAsignar(null);
        setDelegadoSel(null);
        setBusqDelegado("");
        await onRecargar();
      } else setMsgAsignar(data.mensaje || data.error || "Error al asignar");
    } catch {
      setMsgAsignar("Sin conexión");
    }
  };

  const handleEliminar = async (idDefensa: number) => {
    if (!window.confirm("¿Eliminar esta defensa?")) return;
    try {
      const res = await fetch(`${API}/defensas/${idDefensa}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        onQuitarDefensa(idDefensa);
        await onRecargar();
      } else {
        alert(data.mensaje || "No se pudo eliminar la defensa");
      }
    } catch {
      alert("Sin conexión al eliminar la defensa");
    }
  };

  const handleGuardarEdicion = async () => {
    if (!editForm) return;

    const fechaError = validarFechaHoraDefensa(editForm.fecha);
    if (fechaError) {
      setEditMsg(fechaError);
      return;
    }

    const parsed = defensaEditarSchema.safeParse({
      titulo: editForm.titulo,
      nombreEstudiante: editForm.nombreEstudiante,
      apellidoEstudiante: editForm.apellidoEstudiante,
      fecha: editForm.fecha,
      lugar: editForm.lugar,
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setEditFieldErrors(errs);
      return;
    }
    setEditFieldErrors({});

    setEditLoading(true);
    setEditMsg("");
    try {
      const fechaUTC = localNaiveAISO(editForm.fecha);
      const res = await fetch(`${API}/admin/defensas/${editForm.idDefensa}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editForm.titulo,
          nombreEstudiante: editForm.nombreEstudiante,
          apellidoEstudiante: editForm.apellidoEstudiante,
          fecha: fechaUTC,
          lugar: editForm.lugar,
          estado: editForm.estado,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setModalVer(null);
        setEditForm(null);
        await onRecargar();
      } else {
        setEditMsg(data.mensaje || "Error al guardar");
      }
    } catch {
      setEditMsg("Sin conexión");
    } finally {
      setEditLoading(false);
    }
  };

  const minFechaHoraActual = (() => {
    const ahora = new Date();
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(
      ahora.getDate(),
    )}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}`;
  })();

  const handleCancelarDefensa = async () => {
    if (!editForm) return;
    if (!window.confirm("¿Cancelar esta defensa?")) return;
    setEditLoading(true);
    setEditMsg("");
    try {
      const fechaUTC = localNaiveAISO(editForm.fecha);
      const res = await fetch(`${API}/admin/defensas/${editForm.idDefensa}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: editForm.titulo,
          nombreEstudiante: editForm.nombreEstudiante,
          apellidoEstudiante: editForm.apellidoEstudiante,
          fecha: fechaUTC,
          lugar: editForm.lugar,
          estado: "cancelada",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setModalVer(null);
        setEditForm(null);
        await onRecargar();
      } else {
        setEditMsg(data.mensaje || "Error al cancelar");
      }
    } catch {
      setEditMsg("Sin conexión");
    } finally {
      setEditLoading(false);
    }
  };

  const handleRecordatorio = async (idDefensa: number, idDelegado: number) => {
    setRecordatorioLoading((prev) => new Set(prev).add(idDefensa));
    try {
      const res = await fetch(
        `${API}/admin/defensas/${idDefensa}/recordatorio`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idDelegado }),
        },
      );
      const data = await res.json();
      if (data.ok) {
        alert(data.mensaje || "Recordatorio enviado");
      } else {
        alert(
          data.mensaje || data.detalle || "No se pudo enviar el recordatorio",
        );
      }
    } catch {
      alert("Sin conexión");
    } finally {
      setRecordatorioLoading((prev) => {
        const newSet = new Set(prev);
        newSet.delete(idDefensa);
        return newSet;
      });
    }
  };

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Gestión de Defensas</h2>
          <p className="admin-page-sub">
            Administra todas las defensas de tesis
          </p>
        </div>
        <button className="btn-primary" onClick={onIrCrear}>
          <Ico d={icons.plus} size={16} /> Nueva Defensa
        </button>
      </div>

      {/* Filtros */}
      <div className="admin-panel mb-16">
        <div className="filtros-row">
          <Ico d={icons.filter} size={16} />
          <span className="font-semibold">Filtros</span>
        </div>
        <div className="filtros-inputs">
          <div className="search-wrap">
            <Ico d={icons.search} size={15} />
            <input
              className="form__input search-input"
              placeholder="Buscar por estudiante..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar defensas por nombre de estudiante"
            />
          </div>
          <select
            className="form__input filtro-select"
            value={filtroDelegado}
            onChange={(e) => setFiltro(e.target.value)}
            aria-label="Filtrar por delegado"
          >
            <option value="">Todos los delegados</option>
            {delegados.map((d) => (
              <option key={d.idUsuario} value={`${d.nombre} ${d.apellido}`}>
                {d.nombre} {d.apellido}
              </option>
            ))}
          </select>
          <select
            className="form__input filtro-select"
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="">Todas</option>
            <option value="pendientes">Pendientes</option>
            <option value="completadas">Completadas</option>
            <option value="rechazadas">Rechazadas</option>
            <option value="canceladas">Canceladas</option>
            <option value="sin asignar">Sin asignar</option>
          </select>
          <button
            className="btn-outline"
            onClick={() => {
              setBusqueda("");
              setFiltro("");
            }}
          >
            Limpiar filtros
          </button>
        </div>
        <p className="filtros-count">
          Mostrando {filtradas.length} de {defensas.length} defensas
        </p>
      </div>

      <div className="admin-panel">
        {loading ? (
          <Spinner />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Perfil de tesis</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Lugar</th>
                  <th>Delegado</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="td-empty">
                      Sin defensas
                    </td>
                  </tr>
                ) : (
                  filtradas.map((d) => (
                    <tr key={d.idDefensa}>
                      <td className="td-bold">
                        {d.nombreEstudiante} {d.apellidoEstudiante}
                      </td>
                      <td className="td-truncate">{d.titulo}</td>
                      <td>{fFechaCorta(d.fecha)}</td>
                      <td>{fHora(d.fecha)}</td>
                      <td className="td-truncate">{d.lugar || "-"}</td>
                      <td>
                        {d.nombreDelegado ? (
                          `${d.nombreDelegado} ${d.apellidoDelegado}`
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <div className="status-with-note">
                          <BadgeEstado estado={estadoAdminDefensa(d)} />
                          {estadoAdminDefensa(d).toLowerCase() ===
                            "rechazada" && d.motivoRechazo ? (
                            <p
                              className="rejected-reason"
                              title={d.motivoRechazo}
                            >
                              {d.motivoRechazo.length > 70
                                ? `${d.motivoRechazo.slice(0, 70)}...`
                                : d.motivoRechazo}
                            </p>
                          ) : null}
                        </div>
                      </td>
                      <td>
                        <div className="acciones-row">
                          {(() => {
                            const bloqueaAsignar =
                              esDefensaCompletada(d) ||
                              estadoAdminDefensa(d).toLowerCase() === "aceptada";
                            return (
                              <button
                                className={`btn-primary btn-sm ${bloqueaAsignar ? "btn-disabled" : ""}`}
                                disabled={bloqueaAsignar}
                                title={
                                  bloqueaAsignar
                                    ? "No se puede reasignar esta defensa"
                                    : "Asignar"
                                }
                                onClick={() => {
                                  if (bloqueaAsignar) return;
                                  setModalAsignar(d);
                                  setBusqDelegado("");
                                  setDelegadoSel(null);
                                }}
                              >
                                Asignar
                              </button>
                            );
                          })()}
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleEliminar(d.idDefensa)}
                          >
                            Eliminar
                          </button>
                          {d.idDelegado && (
                            <button
                              className="btn-outline btn-sm"
                              disabled={
                                recordatorioLoading.has(d.idDefensa) ||
                                esEstadoFinalizado(estadoAdminDefensa(d))
                              }
                              onClick={() =>
                                handleRecordatorio(d.idDefensa, d.idDelegado!)
                              }
                            >
                              Recordatorio
                            </button>
                          )}
                          <button
                            className="btn-icon"
                            title={
                              esDefensaCompletada(d) ? "Ver" : "Ver / Editar"
                            }
                            onClick={() => {
                              setModalVer(d);
                              setEditForm({
                                ...d,
                                fecha: isoALocalNaive(d.fecha),
                              });
                              setEditMsg("");
                              setEditFieldErrors({});
                            }}
                          >
                            <Ico d={icons.eye} size={16} />
                          </button>
                          <button
                            className="btn-outline btn-sm"
                            onClick={() =>
                              router.push(`/admin/defensas/${d.idDefensa}/evidencias`)
                            }
                          >
                            Evidencias
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalVer && editForm && (
        <Modal
          title={
            esDefensaCompletada(editForm) ? "Ver defensa" : "Detalle de defensa"
          }
          subtitle={
            esDefensaCompletada(editForm)
              ? "Esta defensa ya fue completada y no puede ser editada."
              : undefined
          }
          onClose={() => {
            setModalVer(null);
            setEditForm(null);
            setEditFieldErrors({});
          }}
        >
          <div className="modal__body">
            <label className="form__label">Título</label>
            <input
              className="form__input"
              value={editForm.titulo}
              disabled={esDefensaCompletada(editForm)}
              readOnly={esDefensaCompletada(editForm)}
              onChange={(e) => {
                if (esDefensaCompletada(editForm)) return;
                setEditForm({ ...editForm, titulo: e.target.value });
                if (editFieldErrors.titulo)
                  setEditFieldErrors({ ...editFieldErrors, titulo: "" });
              }}
            />
            {editFieldErrors.titulo && (
              <p className="form__error">{editFieldErrors.titulo}</p>
            )}
            <div className="mb-12" />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label className="form__label">Nombre estudiante</label>
                <input
                  className="form__input"
                  value={editForm.nombreEstudiante}
                  disabled={esDefensaCompletada(editForm)}
                  readOnly={esDefensaCompletada(editForm)}
                  onChange={(e) => {
                    if (esDefensaCompletada(editForm)) return;
                    setEditForm({
                      ...editForm,
                      nombreEstudiante: e.target.value,
                    });
                    if (editFieldErrors.nombreEstudiante)
                      setEditFieldErrors({
                        ...editFieldErrors,
                        nombreEstudiante: "",
                      });
                  }}
                />
                {editFieldErrors.nombreEstudiante && (
                  <p className="form__error">
                    {editFieldErrors.nombreEstudiante}
                  </p>
                )}
              </div>
              <div>
                <label className="form__label">Apellido estudiante</label>
                <input
                  className="form__input"
                  value={editForm.apellidoEstudiante}
                  disabled={esDefensaCompletada(editForm)}
                  readOnly={esDefensaCompletada(editForm)}
                  onChange={(e) => {
                    if (esDefensaCompletada(editForm)) return;
                    setEditForm({
                      ...editForm,
                      apellidoEstudiante: e.target.value,
                    });
                    if (editFieldErrors.apellidoEstudiante)
                      setEditFieldErrors({
                        ...editFieldErrors,
                        apellidoEstudiante: "",
                      });
                  }}
                />
                {editFieldErrors.apellidoEstudiante && (
                  <p className="form__error">
                    {editFieldErrors.apellidoEstudiante}
                  </p>
                )}
              </div>
            </div>

            <label className="form__label mt-12">Fecha</label>
            <input
              className="form__input"
              type="datetime-local"
              min={minFechaHoraActual}
              value={editForm.fecha || ""}
              disabled={esDefensaCompletada(editForm)}
              readOnly={esDefensaCompletada(editForm)}
              onChange={(e) => {
                if (esDefensaCompletada(editForm)) return;
                setEditForm({ ...editForm, fecha: e.target.value });
                if (editFieldErrors.fecha)
                  setEditFieldErrors({ ...editFieldErrors, fecha: "" });
              }}
            />
            {editFieldErrors.fecha && (
              <p className="form__error">{editFieldErrors.fecha}</p>
            )}
            <div className="mb-12" />

            <label className="form__label">Lugar</label>
            <input
              className="form__input"
              value={editForm.lugar}
              disabled={esDefensaCompletada(editForm)}
              readOnly={esDefensaCompletada(editForm)}
              onChange={(e) => {
                if (esDefensaCompletada(editForm)) return;
                setEditForm({ ...editForm, lugar: e.target.value });
                if (editFieldErrors.lugar)
                  setEditFieldErrors({ ...editFieldErrors, lugar: "" });
              }}
            />
            {editFieldErrors.lugar && (
              <p className="form__error">{editFieldErrors.lugar}</p>
            )}
            <div className="mb-12" />

            <label className="form__label">Estado</label>
            <div className="mb-12">
              <BadgeEstado estado={estadoAdminDefensa(editForm)} />
            </div>
            {(() => {
              const estadoVisible = estadoAdminDefensa(editForm).toLowerCase();
              const estaCompletada = esDefensaCompletada(editForm);
              const yaFinalizada =
                estadoVisible === "cancelada" ||
                estadoVisible === "completada" ||
                estadoVisible === "completado";
              if (estaCompletada) return null;
              return yaFinalizada ? null : (
                <button
                  type="button"
                  className="btn-danger mb-12"
                  disabled={editLoading}
                  onClick={handleCancelarDefensa}
                >
                  Cancelar defensa
                </button>
              );
            })()}

            {editForm.nombreDelegado && (
              <p className="text-muted" style={{ fontSize: "0.85rem" }}>
                Delegado: {editForm.nombreDelegado} {editForm.apellidoDelegado}
              </p>
            )}

            {editForm.idAsignacion && (
              <button
                type="button"
                className="btn-outline btn-sm mb-12"
                onClick={() =>
                  router.push(
                    `/admin/defensas/${editForm.idDefensa}/evidencias`,
                  )
                }
              >
                Ver evidencias
              </button>
            )}

            {estadoAdminDefensa(editForm).toLowerCase() === "rechazada" && (
              <div className="detail-section mt-14">
                <h4 className="detail-section__title">Motivo de rechazo</h4>
                <p
                  className="detail-field__value"
                  style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}
                >
                  {editForm.motivoRechazo?.trim() ||
                    "No se registró motivo de rechazo."}
                </p>
              </div>
            )}

            {editMsg && <p className="form__error mt-8">{editMsg}</p>}
            {esDefensaCompletada(editForm) && (
              <p className="form__info mt-8">
                Esta defensa ya fue completada y no puede ser editada.
              </p>
            )}
          </div>
          <div className="modal__footer">
            <button
              className="btn-outline"
              onClick={() => {
                setModalVer(null);
                setEditForm(null);
                setEditFieldErrors({});
              }}
            >
              {esDefensaCompletada(editForm) ? "Cerrar" : "Cancelar"}
            </button>
            {!esDefensaCompletada(editForm) && (
              <button
                className="btn-primary"
                disabled={editLoading}
                onClick={handleGuardarEdicion}
              >
                {editLoading ? "Guardando…" : "Guardar cambios"}
              </button>
            )}
          </div>
        </Modal>
      )}

      {modalAsignar && (
        <Modal
          title="Asignar delegada/o"
          subtitle="Asignar a una defensa"
          onClose={() => setModalAsignar(null)}
        >
          <div className="modal__body">
            <label className="form__label">Nombre</label>
            <div className="search-wrap mb-12">
              <Ico d={icons.search} size={15} />
              <input
                className="form__input search-input"
                placeholder="Buscar delegada/o..."
                value={busqDelegado}
                onChange={(e) => {
                  setBusqDelegado(e.target.value);
                  setDelegadoSel(null);
                }}
                aria-label="Buscar delegados por nombre"
              />
            </div>
            <div className="delegados-lista">
              {delegadosFiltrados.map((d) => (
                <button
                  key={d.idUsuario}
                  type="button"
                  className={`delegado-item ${delegadoSel?.idUsuario === d.idUsuario ? "delegado-item--sel" : ""}`}
                  onClick={() => setDelegadoSel(d)}
                >
                  <div className="delegado-avatar">
                    {d.nombre[0]}
                    {d.apellido[0]}
                  </div>
                  <div>
                    <p className="delegado-nombre">
                      {d.nombre} {d.apellido}
                    </p>
                    <p className="delegado-correo">{d.correo}</p>
                  </div>
                </button>
              ))}
              {delegadosFiltrados.length === 0 && (
                <p className="text-muted text-center p-y-16">Sin resultados</p>
              )}
            </div>
            {msgAsignar && <p className="form__error mt-8">{msgAsignar}</p>}
          </div>
          <div className="modal__footer">
            <button
              className="btn-outline"
              onClick={() => setModalAsignar(null)}
            >
              Cancelar
            </button>
            <button
              className="btn-primary"
              disabled={!delegadoSel}
              onClick={handleAsignar}
            >
              Confirmar asignación
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function VistaAdminCrearDefensa({
  onBack,
  onCreada,
}: {
  onBack: () => void;
  onCreada: () => void | Promise<void>;
}) {
  const [form, setForm] = useState({
    nombreEstudiante: "",
    titulo: "",
    fecha: "",
    hora: "",
    lugar: "",
    direccion: "",
    observaciones: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const fechaMinima = (() => {
    const now = new Date();
    const pad = (value: number) => value.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  })();
  const set =
    (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    setLoading(true);
    try {
      const nombreCompleto = form.nombreEstudiante.trim();
      const { nombre, apellido } = parseNombreEstudiante(nombreCompleto);
      const titulo = form.titulo.trim();
      const lugar = form.lugar.trim();

      const faltantes: string[] = [];
      if (!nombreCompleto) faltantes.push("nombre del estudiante");
      if (!titulo) faltantes.push("título");
      if (!lugar) faltantes.push("lugar");
      if (!form.fecha || !form.hora) faltantes.push("fecha y hora");

      if (faltantes.length > 0) {
        setMsg(`Faltan campos obligatorios: ${faltantes.join(", ")}`);
        return;
      }

      const iso = buildFechaHoraISO(form.fecha, form.hora);
      if (!iso) {
        setMsg("Fecha u hora inválida. Revisa los campos de fecha y hora.");
        return;
      }

      const fechaError = validarFechaHoraDefensa(iso);
      if (fechaError) {
        setMsg(fechaError);
        return;
      }

      const res = await fetch(`${API}/defensas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombreEstudiante: nombreCompleto,
          estudianteNombre: nombre,
          estudianteApellido: apellido,
          titulo,
          fecha: iso,
          hora: form.hora,
          lugar,
          direccion: form.direccion.trim() || null,
          observaciones: form.observaciones.trim() || null,
        }),
      });
      const data = await res.json();
      if (!data.ok) setMsg(data.mensaje || data.error || "No se pudo crear");
      else {
        setMsg("Defensa creada ✓");
        await onCreada();
      }
    } catch {
      setMsg("Sin conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Nueva Defensa</h2>
          <p className="admin-page-sub">
            Completa el formulario para crear una nueva defensa
          </p>
        </div>
      </div>
      <form className="admin-panel" onSubmit={handleCrear}>
        <button type="button" className="btn-back mb-16" onClick={onBack}>
          <Ico d={icons.back} size={16} /> Volver
        </button>
        <div className="detail-section">
          <h4 className="detail-section__title">Información de la Defensa</h4>
          <p className="hint-text mb-16">
            Los campos marcados con * son obligatorios
          </p>

          <div className="form__group mb-14">
            <label className="form__label">Nombre del estudiante *</label>
            <input
              className="form__input"
              placeholder="Ej. María González Pérez"
              value={form.nombreEstudiante}
              onChange={set("nombreEstudiante")}
              required
            />
          </div>
          <div className="form__group mb-14">
            <label className="form__label">Título o perfil de tesis *</label>
            <textarea
              className="form__textarea min-h-70"
              placeholder="Ej. Estrategias de Marketing Digital en Redes Sociales"
              value={form.titulo}
              onChange={set("titulo")}
              required
            />
          </div>

          <div className="grid-2">
            <div className="form__group">
              <label className="form__label" htmlFor="defensa-fecha">
                Fecha *
              </label>
              <input
                id="defensa-fecha"
                type="date"
                className="form__input"
                title="Fecha"
                aria-label="Fecha"
                min={fechaMinima}
                value={form.fecha}
                onChange={set("fecha")}
                required
              />
            </div>

            <div className="form__group">
              <label className="form__label" htmlFor="defensa-hora">
                Hora *
              </label>
              <input
                id="defensa-hora"
                type="time"
                className="form__input"
                title="Hora"
                aria-label="Hora"
                value={form.hora}
                onChange={set("hora")}
                required
              />
            </div>
          </div>

          <div className="form__group mb-14">
            <label className="form__label">Lugar *</label>
            <input
              className="form__input"
              placeholder="Ej. Auditorio Principal"
              value={form.lugar}
              onChange={set("lugar")}
              required
            />
          </div>
          <div className="form__group mb-14">
            <label className="form__label">Dirección</label>
            <input
              className="form__input"
              placeholder="Ej. Av. Heroinas #1234, Cochabamba"
              value={form.direccion}
              onChange={set("direccion")}
            />
          </div>
          <div className="form__group mb-14">
            <label className="form__label">Observaciones</label>
            <textarea
              className="form__textarea"
              placeholder="Notas adicionales, requerimientos especiales, etc."
              value={form.observaciones}
              onChange={set("observaciones")}
            />
          </div>
          {msg && (
            <p
              className={
                msg.includes("✓") ? "form__msg--ok" : "form__error mb-12"
              }
            >
              {msg}
            </p>
          )}
          <div className="flex gap-10">
            <button className="btn-primary" type="submit" disabled={loading}>
              <Ico d={icons.doc} size={16} />{" "}
              {loading ? "Creando..." : "Crear defensa"}
            </button>
            <button className="btn-outline" type="button" onClick={onBack}>
              <Ico d={icons.close} size={16} /> Cancelar
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

function VistaAdminDelegados() {
  const [loading, setLoading] = useState(true);
  const [delegados, setDelegados] = useState<Delegado[]>([]);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<{
    mode: "new" | "edit";
    delegado?: Delegado;
  } | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    password: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const generarInvitacion = async () => {
    setInviteLoading(true);
    setInviteError("");
    setInviteLink("");
    try {
      const res = await fetch(`${API}/admin/delegados/invitacion`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.mensaje || "No se pudo generar la invitación");
      }
      setInviteLink(data.link);
    } catch (error: any) {
      setInviteError(error?.message || "Sin conexión");
    } finally {
      setInviteLoading(false);
    }
  };

  const cargar = () => {
    setLoading(true);
    setError("");
    fetch(`${API}/admin/delegados/detalle?_=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setDelegados(d.delegados || []);
        else setError(d.mensaje || "Error");
      })
      .catch(() => setError("Sin conexión"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const save = async () => {
    const schema =
      modal?.mode === "new" ? delegadoNuevoSchema : delegadoEditarSchema;
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        if (key && !errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});

    try {
      const payload =
        modal?.mode === "edit" && !form.password.trim()
          ? { ...form, password: undefined }
          : form;
      if (modal?.mode === "new") {
        const res = await fetch(`${API}/admin/delegados`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const d = await res.json();
        if (!d.ok) throw new Error(d.mensaje || "Error");
      } else if (modal?.mode === "edit" && modal.delegado) {
        const res = await fetch(
          `${API}/admin/delegados/${modal.delegado.idUsuario}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        const d = await res.json();
        if (!d.ok) throw new Error(d.mensaje || "Error");
      }
      setModal(null);
      cargar();
    } catch (e: any) {
      setError(e.message || "Error");
    }
  };

  const setActivo = async (id: number, activo: boolean) => {
    await fetch(`${API}/admin/usuario/${id}/activo`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
    });
    cargar();
  };

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Gestión de Delegados</h2>
          <p className="admin-page-sub">Administra los delegados registrados</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setInviteLink("");
            setInviteError("");
            setInviteModalOpen(true);
          }}
          type="button"
        >
          <Ico d={icons.userPlus} size={16} /> Invitar delegado
        </button>
      </div>

      <div className="admin-panel">
        <h3 className="page-title mb-16">Todos los delegados</h3>
        {loading ? (
          <Spinner />
        ) : (
          <>
            {error && <p className="form__error mb-12">{error}</p>}
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Defensas asignadas</th>
                  </tr>
                </thead>
                <tbody>
                  {delegados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="td-empty">
                        Sin delegados
                      </td>
                    </tr>
                  ) : (
                    delegados.map((d) => (
                      <tr
                        key={d.idUsuario}
                        className="cursor-pointer"
                        onClick={() => {
                          setForm({
                            nombre: d.nombre,
                            apellido: d.apellido,
                            correo: d.correo,
                            telefono: d.telefono || "",
                            password: "",
                          });
                          setFieldErrors({});
                          setModal({ mode: "edit", delegado: d });
                        }}
                      >
                        <td className="td-bold">
                          {d.nombre} {d.apellido}
                        </td>
                        <td>{d.correo}</td>
                        <td>{d.telefono || "-"}</td>
                        <td>
                          <span
                            className={`badge ${d.activo ? "badge--aceptada" : "badge--rechazada"}`}
                          >
                            {d.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          <span className="badge-count">
                            {d.defensasAsignadas ?? 0}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {inviteModalOpen && (
        <Modal
          title="Invitar delegado"
          subtitle="Genera un enlace privado para que el delegado se registre."
          onClose={() => setInviteModalOpen(false)}
        >
          <div className="modal__body">
            <p className="mb-16 text-light">
              Comparte este enlace para que el delegado pueda completar el
              registro usando la invitación.
            </p>

            {inviteError && <p className="form__error mb-12">{inviteError}</p>}

            {inviteLink ? (
              <>
                <div className="form__group mb-12">
                  <label className="form__label" htmlFor="invite-link">
                    Enlace de invitación
                  </label>
                  <input
                    id="invite-link"
                    className="form__input"
                    type="text"
                    readOnly
                    value={inviteLink}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Enlace de invitación generado"
                    title="Enlace de invitación generado"
                    placeholder="Enlace de invitación generado"
                  />
                </div>
                <button
                  className="btn-outline"
                  type="button"
                  onClick={() => navigator.clipboard.writeText(inviteLink)}
                >
                  Copiar enlace
                </button>
              </>
            ) : (
              <button
                className="btn-primary"
                type="button"
                disabled={inviteLoading}
                onClick={generarInvitacion}
              >
                {inviteLoading
                  ? "Generando..."
                  : "Generar enlace de invitación"}
              </button>
            )}
          </div>
          <div className="modal__footer">
            <button
              className="btn-outline"
              onClick={() => setInviteModalOpen(false)}
              type="button"
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {modal && (
        <Modal
          title={modal.mode === "new" ? "Nuevo delegado" : "Editar delegado"}
          onClose={() => {
            setModal(null);
            setFieldErrors({});
          }}
        >
          <div className="modal__body">
            <div className="form__group mb-12">
              <label className="form__label" htmlFor="delegado-nombre">
                Nombre *
              </label>
              <input
                id="delegado-nombre"
                className="form__input"
                type="text"
                value={form.nombre}
                onChange={(e) => {
                  setForm({ ...form, nombre: e.target.value });
                  if (fieldErrors.nombre)
                    setFieldErrors({ ...fieldErrors, nombre: "" });
                }}
              />
              {fieldErrors.nombre && (
                <p className="form__error">{fieldErrors.nombre}</p>
              )}
            </div>

            <div className="form__group mb-12">
              <label className="form__label" htmlFor="delegado-apellido">
                Apellido *
              </label>
              <input
                id="delegado-apellido"
                className="form__input"
                type="text"
                value={form.apellido}
                onChange={(e) => {
                  setForm({ ...form, apellido: e.target.value });
                  if (fieldErrors.apellido)
                    setFieldErrors({ ...fieldErrors, apellido: "" });
                }}
              />
              {fieldErrors.apellido && (
                <p className="form__error">{fieldErrors.apellido}</p>
              )}
            </div>

            <div className="form__group mb-12">
              <label className="form__label" htmlFor="delegado-correo">
                Correo *
              </label>
              <input
                id="delegado-correo"
                className="form__input"
                type="email"
                value={form.correo}
                onChange={(e) => {
                  setForm({ ...form, correo: e.target.value });
                  if (fieldErrors.correo)
                    setFieldErrors({ ...fieldErrors, correo: "" });
                }}
              />
              {fieldErrors.correo && (
                <p className="form__error">{fieldErrors.correo}</p>
              )}
            </div>

            <div className="form__group mb-12">
              <label className="form__label" htmlFor="delegado-telefono">
                Telefono *
              </label>
              <input
                id="delegado-telefono"
                className="form__input"
                type="text"
                value={form.telefono}
                onChange={(e) => {
                  setForm({ ...form, telefono: e.target.value });
                  if (fieldErrors.telefono)
                    setFieldErrors({ ...fieldErrors, telefono: "" });
                }}
              />
              {fieldErrors.telefono && (
                <p className="form__error">{fieldErrors.telefono}</p>
              )}
            </div>

            <div className="form__group mb-12">
              <label className="form__label" htmlFor="delegado-password">
                {modal.mode === "new"
                  ? "Contraseña *"
                  : "Nueva contraseña (opcional)"}
              </label>
              <input
                id="delegado-password"
                className="form__input"
                type="password"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (fieldErrors.password)
                    setFieldErrors({ ...fieldErrors, password: "" });
                }}
              />
              {fieldErrors.password && (
                <p className="form__error">{fieldErrors.password}</p>
              )}
            </div>

            {modal.mode === "edit" && modal.delegado && (
              <div className="flex gap-8 mt-4">
                {modal.delegado.activo ? (
                  <button
                    className="btn-outline"
                    type="button"
                    onClick={() => {
                      setActivo(modal.delegado!.idUsuario, false);
                      setModal(null);
                    }}
                  >
                    Desactivar
                  </button>
                ) : (
                  <button
                    className="btn-outline"
                    type="button"
                    onClick={() => {
                      setActivo(modal.delegado!.idUsuario, true);
                      setModal(null);
                    }}
                  >
                    Activar
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="modal__footer">
            <button
              className="btn-outline"
              onClick={() => {
                setModal(null);
                setFieldErrors({});
              }}
              type="button"
            >
              Cancelar
            </button>
            <button
              className="btn-primary"
              onClick={save}
              type="button"
              disabled={
                !form.nombre.trim() ||
                !form.apellido.trim() ||
                !form.correo.trim() ||
                (modal.mode === "new" && !form.password)
              }
            >
              Guardar
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function VistaAdminPagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [marcandoId, setMarcandoId] = useState<number | null>(null);

  const cargar = () => {
    setLoading(true);
    setError("");
    fetch(`${API}/admin/pagos`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setPagos(d.pagos || []);
        else setError(d.mensaje || d.error || "Error al cargar pagos");
      })
      .catch(() => setError("Sin conexión"))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    cargar();
  }, []);

  const confirmarPago = async (p: Pago) => {
    const key = p.idPago > 0 ? p.idPago : p.idDefensa;
    setMarcandoId(key);
    setMensaje("");
    setError("");
    try {
      const res = await fetch(
        `${API}/admin/pagos/${p.idPago > 0 ? p.idPago : 0}/pagar`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idDefensa: p.idDefensa }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.mensaje || "No se pudo confirmar el pago");
        return;
      }
      setMensaje(
        "Pago confirmado. El delegado verá el estado como Completado.",
      );
      cargar();
    } catch {
      setError("Sin conexión al confirmar el pago");
    } finally {
      setMarcandoId(null);
    }
  };

  const pendientes = pagos.filter((p) =>
    esPagoPendiente(p.estado, p.fechaPago),
  );

  return (
    <>
      <div className="admin-page-head">
        <div>
          <h2 className="admin-page-title">Pagos Pendientes</h2>
          <p className="admin-page-sub">
            Defensas completadas por delegados. Confirma el pago con el botón.
          </p>
        </div>
      </div>

      {mensaje && <p className="form__msg--ok mb-16">{mensaje}</p>}
      {error && !loading && <p className="form__error mb-16">{error}</p>}

      <div className="admin-panel">
        <h3 className="page-title mb-16">
          Pagos por confirmar ({pendientes.length})
        </h3>
        {loading ? (
          <Spinner />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Título de tesis</th>
                  <th>Delegado</th>
                  <th>Fecha defensa</th>
                  <th>Estado pago</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="td-empty">
                      No hay pagos pendientes. Cuando un delegado complete una
                      defensa, aparecerá aquí.
                    </td>
                  </tr>
                ) : (
                  pendientes.map((p) => {
                    const rowKey =
                      p.idPago > 0 ? `pago-${p.idPago}` : `def-${p.idDefensa}`;
                    const busyId = p.idPago > 0 ? p.idPago : p.idDefensa;
                    return (
                      <tr key={rowKey}>
                        <td className="td-bold">
                          {p.nombreEstudiante} {p.apellidoEstudiante}
                        </td>
                        <td className="td-truncate">{p.titulo || "—"}</td>
                        <td>
                          {p.nombreDelegado
                            ? `${p.nombreDelegado} ${p.apellidoDelegado}`
                            : "—"}
                        </td>
                        <td>{fFechaCorta(p.fecha)}</td>
                        <td>
                          <span className="badge badge--pend-pago">
                            Pendiente
                          </span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn-pago"
                            disabled={marcandoId === busyId}
                            onClick={() => confirmarPago(p)}
                          >
                            <Ico d={icons.checkCirc} size={15} />
                            {marcandoId === busyId
                              ? " Confirmando..."
                              : " Confirmar pago"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function AdminSidebar({
  usuario,
  active,
  onChange,
  onLogout,
}: {
  usuario: Usuario;
  active: string;
  onChange: (k: string) => void;
  onLogout: () => void;
}) {
  const items = [
    { key: "admin_dashboard", label: "Dashboard", ico: icons.home },
    { key: "admin_defensas", label: "Gestión de Defensas", ico: icons.doc },
    { key: "admin_delegados", label: "Gestión de Delegados", ico: icons.users },
    { key: "admin_pagos", label: "Pagos Pendientes", ico: icons.dollar },
  ];
  return (
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <div className="admin-brand__title">Colegio de Marketing</div>
        <div className="admin-brand__sub">Panel Administrador</div>
      </div>
      <div className="admin-menu">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            className={`admin-menu__item ${active === it.key ? "admin-menu__item--active" : ""}`}
            onClick={() => onChange(it.key)}
          >
            <span className="admin-menu__ico">
              <Ico d={it.ico} size={16} />
            </span>
            {it.label}
          </button>
        ))}
      </div>
      <div className="admin-user">
        <div className="admin-user__avatar">AD</div>
        <div>
          <div className="admin-user__name">
            {usuario.nombre} {usuario.apellido}
          </div>
          <div className="admin-user__mail">{usuario.correo}</div>
        </div>
      </div>
      <button className="admin-logout" onClick={onLogout} type="button">
        <Ico d={icons.logout} size={18} /> Cerrar sesión
      </button>
    </aside>
  );
}

// COMPONENTE PRINCIPAL
export default function Dashboard() {
  const { usuario, logout, loading: authLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [nav, setNav] = useState("inicio");
  const [defensas, setDefensas] = useState<Defensa[]>([]);
  const [delegados, setDelegados] = useState<Delegado[]>([]);
  const [loading, setLoading] = useState(true);
  const [detalle, setDetalle] = useState<Defensa | null>(null);
  const [evidencia, setEvidencia] = useState<Defensa | null>(null);
  const defensasFetchId = useRef(0);
  const defensasLoadedOnce = useRef(false);

  const quitarDefensaLocal = useCallback((idDefensa: number) => {
    const id = Number(idDefensa);
    setDefensas((prev) => prev.filter((d) => Number(d.idDefensa) !== id));
  }, []);

  const cargarDefensas = useCallback((): Promise<void> => {
    if (!usuario) return Promise.resolve();
    const fetchId = ++defensasFetchId.current;
    if (!defensasLoadedOnce.current) {
      setLoading(true);
    }
    const base =
      usuario.rol === 0
        ? `${API}/admin/defensas`
        : `${API}/defensas/${usuario.id}`;
    const url = `${base}?_=${Date.now()}`;
    return fetch(url, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (fetchId !== defensasFetchId.current) return;
        if (d.ok) {
          defensasLoadedOnce.current = true;
          setDefensas(d.defensas ?? []);
        }
      })
      .catch(console.error)
      .finally(() => {
        if (fetchId === defensasFetchId.current) {
          setLoading(false);
        }
      });
  }, [usuario]);

  const cargarDelegados = () => {
    if (!usuario || usuario.rol !== 0) return;
    fetch(`${API}/admin/delegados/detalle?_=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) setDelegados(d.delegados || []);
      })
      .catch(console.error);
  };

  useEffect(() => {
    if (!usuario) return;
    cargarDefensas();
    cargarDelegados();
  }, [usuario]);

  useEffect(() => {
    if (!usuario) return;
    const refrescar = () => {
      if (document.visibilityState !== "visible") return;
      cargarDefensas();
      if (usuario.rol === 0) cargarDelegados();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refrescar);
    const interval = setInterval(refrescar, 20_000);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refrescar);
      clearInterval(interval);
    };
  }, [usuario, cargarDefensas]);

  useEffect(() => {
    if (!usuario || authLoading) return;
    if (usuario.rol === 0) {
      setNav(navFromAdminPath(pathname));
      return;
    }
    setNav(navFromDelegadoPath(pathname));
    const mNueva = pathname.match(/\/delegado\/nuevas\/(\d+)/);
    if (mNueva) {
      const id = Number(mNueva[1]);
      const d = defensas.find((x) => x.idDefensa === id);
      setDetalle(d ?? null);
    } else {
      setDetalle(null);
    }
    const mEvid = pathname.match(/\/delegado\/pendientes\/(\d+)\/evidencia/);
    if (mEvid) {
      const idA = Number(mEvid[1]);
      const d = defensas.find((x) => x.idAsignacion === idA);
      setEvidencia(d ?? null);
    } else {
      setEvidencia(null);
    }
  }, [pathname, usuario, authLoading, defensas]);

  const goAdmin = (key: string) => {
    router.push(adminPathFromNav(key));
  };

  const goDelegado = (key: string) => {
    router.push(delegadoPathFromNav(key));
  };

  const handleNav = (key: string) => {
    if (usuario?.rol === 0) goAdmin(key);
    else goDelegado(key);
  };

  const handleAceptar = async (id: number) => {
    await fetch(`${API}/asignacion/${id}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "aceptada" }),
    });
    router.push("/delegado/pendientes");
    cargarDefensas();
  };

  const handleRechazar = async (id: number, justificacion: string) => {
    await fetch(`${API}/asignacion/${id}/estado`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "rechazada", justificacion }),
    });
    router.push("/delegado/nuevas");
    cargarDefensas();
  };

  const handleEvidencia = async ({
    defensa,
    imagen,
    pdf,
    comentarios,
  }: {
    defensa: Defensa;
    imagen?: File | null;
    pdf?: File | null;
    comentarios?: string;
  }) => {
    const form = new FormData();
    form.set("comentarios", comentarios || "");
    if (imagen) form.set("imagen", imagen);
    if (pdf) form.set("pdf", pdf);

    const res = await fetch(`${API}/asignacion/${defensa.idAsignacion}/completar`, {
      method: "PUT",
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      alert(data.mensaje || "Error al completar la defensa");
      return;
    }
    router.push("/delegado/completadas");
    cargarDefensas();
  };

  if (authLoading || !usuario) {
    return (
      <div className="page-bg loading-center">
        <p>Cargando...</p>
      </div>
    );
  }

  // ÔöÇÔöÇ Render Admin ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  if (usuario.rol === 0) {
    const renderAdmin = () => {
      switch (nav) {
        case "admin_dashboard":
          return <VistaAdminDashboard defensas={defensas} onNav={handleNav} />;
        case "admin_delegados":
          return <VistaAdminDelegados />;
        case "admin_pagos":
          return <VistaAdminPagos />;
        case "admin_crear":
          return (
            <VistaAdminCrearDefensa
              onBack={() => router.push("/admin/defensas")}
              onCreada={async () => {
                await cargarDefensas();
                router.push("/admin/defensas");
              }}
            />
          );
        case "admin_defensas":
        default:
          return (
            <VistaAdminDefensas
              defensas={defensas}
              loading={loading}
              delegados={delegados}
              onIrCrear={() => router.push("/admin/defensas/nueva")}
              onQuitarDefensa={quitarDefensaLocal}
              onRecargar={async () => {
                await cargarDefensas();
                cargarDelegados();
              }}
            />
          );
      }
    };
    return (
      <div className="admin-shell">
        <AdminSidebar
          usuario={usuario}
          active={nav}
          onChange={handleNav}
          onLogout={logout}
        />
        <div className="admin-content">{renderAdmin()}</div>
      </div>
    );
  }

  // ÔöÇÔöÇ Render Delegado ÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇÔöÇ
  const renderDelegado = () => {
    if (detalle) {
      return (
        <VistaDetalle
          usuario={usuario}
          defensa={detalle}
          onBack={() => router.push("/delegado/nuevas")}
          onAceptar={handleAceptar}
          onRechazar={handleRechazar}
        />
      );
    }
    if (evidencia) {
      return (
        <VistaEvidencia
          usuario={usuario}
          defensa={evidencia}
          onBack={() => router.push("/delegado/pendientes")}
          onEnviar={handleEvidencia}
        />
      );
    }
    switch (nav) {
      case "inicio":
        return (
          <VistaInicio
            usuario={usuario}
            defensas={defensas}
            loading={loading}
            onNav={handleNav}
          />
        );
      case "nuevas":
        return (
          <VistaNuevas
            usuario={usuario}
            defensas={defensas}
            loading={loading}
            onDetalle={(d) => router.push(`/delegado/nuevas/${d.idDefensa}`)}
          />
        );
      case "pendientes":
        return (
          <VistaPendientes
            usuario={usuario}
            defensas={defensas}
            loading={loading}
            onEvidencia={(d) =>
              router.push(`/delegado/pendientes/${d.idAsignacion}/evidencia`)
            }
          />
        );
      case "completadas":
        return (
          <VistaCompletadas
            usuario={usuario}
            defensas={defensas}
            loading={loading}
          />
        );
      case "perfil":
        return <VistaPerfil usuario={usuario} onLogout={logout} />;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      {renderDelegado()}
      <BottomNav active={nav} onChange={handleNav} />
    </div>
  );
}
