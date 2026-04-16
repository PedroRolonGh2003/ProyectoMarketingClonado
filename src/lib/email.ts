import nodemailer from "nodemailer";

export function getTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

export async function enviarCodigoRecuperacion(
  destinatario: string,
  nombre: string,
  codigo: string,
) {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: `"ColMarketing" <${process.env.EMAIL_USER}>`,
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
}
