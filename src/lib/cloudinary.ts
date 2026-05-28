import { v2 as cloudinary, type UploadApiOptions } from "cloudinary";

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta variable de entorno ${name}. Configura CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET.`,
    );
  }
  return value;
}

let configurado = false;
function configurar() {
  if (configurado) return;
  cloudinary.config({
    cloud_name: requiredEnv("CLOUDINARY_CLOUD_NAME"),
    api_key: requiredEnv("CLOUDINARY_API_KEY"),
    api_secret: requiredEnv("CLOUDINARY_API_SECRET"),
    secure: true,
  });
  configurado = true;
}

export async function subirArchivo(
  buffer: Buffer,
  opciones: UploadApiOptions = {},
): Promise<string> {
  configurar();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "auto", ...opciones },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary no devolvió resultado"));
          return;
        }
        resolve(result.secure_url);
      },
    );
    stream.end(buffer);
  });
}
