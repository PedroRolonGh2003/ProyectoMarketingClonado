import nodemailer from "nodemailer";

export const ERROR_ENVIO_RECUPERACION =
  "No se pudo enviar el correo de recuperación. Verifica la configuración SMTP.";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
};

function getSmtpConfig(): SmtpConfig {
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || "").trim();
  const pass = (process.env.SMTP_PASS || process.env.EMAIL_PASS || "")
    .trim()
    .replace(/\s+/g, "");

  const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== "false";
  const from =
    process.env.SMTP_FROM?.trim() || `"Colegio de Marketing" <${user}>`;

  return { host, port, secure, user, pass, from };
}

function getTransporter() {
  const { host, port, secure, user, pass } = getSmtpConfig();

  if (!user || !pass) {
    throw new Error(ERROR_ENVIO_RECUPERACION);
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
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
  const { from } = getSmtpConfig();
  const transporter = getTransporter();

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
    console.error("[email] Error al enviar correo de recuperación:", err);
    throw new Error(ERROR_ENVIO_RECUPERACION);
  }
}
