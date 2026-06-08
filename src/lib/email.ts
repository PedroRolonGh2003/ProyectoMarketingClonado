import nodemailer from "nodemailer";

export class EmailConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailConfigError";
  }
}

export class EmailDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}

function getEmailCredentials(): { user: string; pass: string } {
  const user = process.env.EMAIL_USER?.trim();
  // Las contraseñas de aplicación de Gmail se copian con espacios; hay que unirlas.
  const pass = process.env.EMAIL_PASS?.trim().replace(/\s+/g, "");

  if (!user || !pass) {
    throw new EmailConfigError(
      "El servicio de correo no está configurado. Contacta al administrador.",
    );
  }

  return { user, pass };
}

function mapSmtpError(err: unknown): EmailDeliveryError {
  const msg = err instanceof Error ? err.message : String(err);

  if (
    msg.includes("535") ||
    msg.includes("BadCredentials") ||
    msg.includes("Username and Password not accepted") ||
    msg.includes("EAUTH") ||
    msg.includes("Invalid login")
  ) {
    return new EmailDeliveryError(
      "No se pudo enviar el correo. Revisa EMAIL_USER y EMAIL_PASS (contraseña de aplicación de Gmail, sin espacios).",
    );
  }

  if (
    msg.includes("ECONNECTION") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ESOCKET")
  ) {
    return new EmailDeliveryError(
      "No se pudo conectar con el servidor de correo. Intenta de nuevo más tarde.",
    );
  }

  return new EmailDeliveryError(
    "No se pudo enviar el correo de recuperación. Intenta de nuevo más tarde.",
  );
}

export function getTransporter() {
  const { user, pass } = getEmailCredentials();
  const host = process.env.EMAIL_SMTP_HOST?.trim() || "smtp.gmail.com";
  const port = Number(process.env.EMAIL_SMTP_PORT || 465);
  const secure = process.env.EMAIL_SMTP_SECURE !== "false";

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

export async function enviarCodigoRecuperacion(
  destinatario: string,
  nombre: string,
  codigo: string,
) {
  const { user } = getEmailCredentials();
  const transporter = getTransporter();

  try {
    await transporter.sendMail({
      from: `"ColMarketing" <${user}>`,
      to: destinatario,
      subject: "Recuperación de contraseña",
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
    if (err instanceof EmailConfigError || err instanceof EmailDeliveryError) {
      throw err;
    }
    console.error("[email] Error al enviar código de recuperación:", err);
    throw mapSmtpError(err);
  }
}
