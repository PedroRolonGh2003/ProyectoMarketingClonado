import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export const ERROR_ENVIO_RECUPERACION =
  "No se pudo enviar el correo de recuperación. Verifica la configuración SMTP.";

export type SmtpConfigCheck = {
  hostExists: boolean;
  port: number;
  secure: boolean;
  userExists: boolean;
  passExists: boolean;
  passLength: number;
  fromExists: boolean;
  userSource: "SMTP_USER" | "EMAIL_USER" | "none";
  passSource: "SMTP_PASS" | "EMAIL_PASS" | "none";
  userMasked: string;
};

export class SmtpEmailError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmtpEmailError";
  }
}

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function maskUser(user: string): string {
  if (!user) return "(vacío)";
  const at = user.indexOf("@");
  if (at <= 0) return `${user.slice(0, 2)}***`;
  return `${user.slice(0, 2)}***${user.slice(at)}`;
}

function resolveUser(): { value: string; source: SmtpConfigCheck["userSource"] } {
  const smtp = process.env.SMTP_USER?.trim();
  if (smtp) return { value: smtp, source: "SMTP_USER" };
  const legacy = process.env.EMAIL_USER?.trim();
  if (legacy) return { value: legacy, source: "EMAIL_USER" };
  return { value: "", source: "none" };
}

function resolvePass(): { value: string; source: SmtpConfigCheck["passSource"] } {
  const smtp = process.env.SMTP_PASS?.trim();
  if (smtp) {
    return { value: smtp.replace(/\s+/g, ""), source: "SMTP_PASS" };
  }
  const legacy = process.env.EMAIL_PASS?.trim();
  if (legacy) {
    return { value: legacy.replace(/\s+/g, ""), source: "EMAIL_PASS" };
  }
  return { value: "", source: "none" };
}

export function getSmtpConfigCheck(): SmtpConfigCheck {
  const { value: user, source: userSource } = resolveUser();
  const { value: pass, source: passSource } = resolvePass();
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const from = process.env.SMTP_FROM?.trim() || "";

  return {
    hostExists: host.length > 0,
    port,
    secure,
    userExists: user.length > 0,
    passExists: pass.length > 0,
    passLength: pass.length,
    fromExists: from.length > 0,
    userSource,
    passSource,
    userMasked: maskUser(user),
  };
}

function logSmtpConfigCheck(): SmtpConfigCheck {
  const check = getSmtpConfigCheck();
  console.log("SMTP CONFIG CHECK:", {
    hostExists: check.hostExists,
    port: check.port,
    secure: check.secure,
    userExists: check.userExists,
    passExists: check.passExists,
    passLength: check.passLength,
    fromExists: check.fromExists,
    userSource: check.userSource,
    passSource: check.passSource,
    userMasked: check.userMasked,
  });
  return check;
}

function getSmtpConfig(): SmtpConfig {
  const { value: user } = resolveUser();
  const { value: pass } = resolvePass();
  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const from =
    process.env.SMTP_FROM?.trim() || `"Colegio de Marketing" <${user}>`;

  return { host, port, secure, user, pass, from };
}

function createTransporter(): Transporter {
  const { host, port, secure, user, pass } = getSmtpConfig();

  if (!user || !pass) {
    throw new SmtpEmailError(
      "Faltan variables SMTP_USER/SMTP_PASS (o EMAIL_USER/EMAIL_PASS en .env.local).",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function mapSmtpError(err: unknown, context: "VERIFY" | "SEND"): string {
  const msg = err instanceof Error ? err.message : String(err);
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code ?? "")
      : "";

  console.error(`SMTP ${context} ERROR:`, err);

  if (
    msg.includes("535") ||
    msg.includes("BadCredentials") ||
    code === "EAUTH"
  ) {
    return "Credenciales SMTP inválidas. Verifica que estés usando una contraseña de aplicación de Gmail.";
  }

  if (msg.includes("EAUTH")) {
    return "Autenticación SMTP fallida. Revisa SMTP_USER y SMTP_PASS.";
  }

  if (
    msg.includes("ECONNECTION") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ESOCKET") ||
    code === "ECONNECTION" ||
    code === "ETIMEDOUT"
  ) {
    return "No se pudo conectar al servidor SMTP. Revisa host, puerto y conexión.";
  }

  if (msg.includes("Invalid login")) {
    return "Login SMTP inválido. Gmail requiere contraseña de aplicación, no la contraseña normal.";
  }

  if (context === "VERIFY") {
    return "No se pudo conectar con el servidor de correo. Revisa las credenciales SMTP.";
  }

  return ERROR_ENVIO_RECUPERACION;
}

export async function diagnoseSmtp(): Promise<{
  ok: boolean;
  config: SmtpConfigCheck;
  mensaje: string;
}> {
  const config = logSmtpConfigCheck();

  if (!config.userExists || !config.passExists) {
    return {
      ok: false,
      config,
      mensaje:
        "Faltan credenciales SMTP. Configura SMTP_USER y SMTP_PASS en .env.local y reinicia el servidor.",
    };
  }

  if (config.passLength !== 16 && config.userMasked.includes("@gmail")) {
    console.warn(
      "[email] SMTP PASS length is",
      config.passLength,
      "- Gmail app passwords are usually 16 characters.",
    );
  }

  try {
    const transporter = createTransporter();
    await transporter.verify();
    return {
      ok: true,
      config,
      mensaje: "Conexión SMTP verificada correctamente.",
    };
  } catch (err) {
    return {
      ok: false,
      config,
      mensaje: mapSmtpError(err, "VERIFY"),
    };
  }
}

export async function enviarCorreoRecuperacion({
  to,
  codigo,
  nombre,
}: {
  to: string;
  codigo: string;
  nombre: string;
}) {
  logSmtpConfigCheck();
  const { from } = getSmtpConfig();
  const transporter = createTransporter();

  try {
    await transporter.verify();
  } catch (err) {
    throw new SmtpEmailError(mapSmtpError(err, "VERIFY"));
  }

  const text = [
    `Hola ${nombre},`,
    "",
    "Recibimos una solicitud para recuperar tu contraseña.",
    `Tu código de verificación es: ${codigo}`,
    "",
    "Este código expira en 15 minutos.",
    "Si no solicitaste esto, ignora este correo.",
  ].join("\n");

  try {
    await transporter.sendMail({
      from,
      to,
      subject: "Código de recuperación de contraseña",
      text,
      html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f0f2f5; border-radius: 16px;">
        <div style="background: #1d3d6b; border-radius: 12px; padding: 28px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 1.3rem;">Colegio de Marketing</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0; font-size: 0.85rem;">Sistema de Gestión de Defensas de Tesis</p>
        </div>
        <div style="background: #ffffff; border-radius: 12px; padding: 28px;">
          <p style="color: #1a202c; font-size: 0.95rem; margin: 0 0 16px;">Hola <strong>${nombre}</strong>,</p>
          <p style="color: #4a5568; font-size: 0.9rem; margin: 0 0 24px; line-height: 1.6;">
            Recibimos una solicitud para recuperar tu contraseña. Usa el siguiente código de verificación:
          </p>
          <div style="background: #f0f2f5; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 2.2rem; font-weight: 700; letter-spacing: 0.35em; color: #1d3d6b;">${codigo}</span>
          </div>
          <p style="color: #9aa5b4; font-size: 0.82rem; margin: 0; text-align: center;">
            Este código expira en <strong>15 minutos</strong>.<br/>
            Si no solicitaste esto, ignora este correo.
          </p>
        </div>
      </div>
    `,
    });
  } catch (err) {
    throw new SmtpEmailError(mapSmtpError(err, "SEND"));
  }
}
