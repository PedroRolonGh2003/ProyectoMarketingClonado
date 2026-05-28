-- MIGRACIÓN: Agregar columnas para guardar evidencias como BLOB en lugar de filesystem
-- Ejecutar en MySQL ANTES de que los delegados suban evidencias con la nueva versión

ALTER TABLE Evidencia
ADD COLUMN imagenNombre VARCHAR(255) NULL COMMENT 'Nombre original del archivo de imagen',
ADD COLUMN imagenMime VARCHAR(100) NULL COMMENT 'MIME type de la imagen (image/jpeg, image/png, etc)',
ADD COLUMN imagenArchivo LONGBLOB NULL COMMENT 'Contenido binario de la imagen (máx 5 MB)',
ADD COLUMN pdfNombre VARCHAR(255) NULL COMMENT 'Nombre original del archivo PDF',
ADD COLUMN pdfMime VARCHAR(100) NULL COMMENT 'MIME type del PDF (application/pdf)',
ADD COLUMN pdfArchivo LONGBLOB NULL COMMENT 'Contenido binario del PDF (máx 10 MB)';

-- Nota: Las columnas urlImagen y urlPdf pueden ser deprecadas después de la migración,
-- pero se mantienen por compatibilidad con datos históricos.
