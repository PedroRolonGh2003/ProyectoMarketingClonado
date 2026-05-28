# SOLUCIÓN: Evidencias en MySQL para Vercel Serverless

## 📋 RESUMEN EJECUTIVO

### Causa del error

**Error**: `ENOENT: no such file or directory, mkdir '/var/task/public'`

**Razón**: Vercel es un entorno serverless (AWS Lambda). No permite:

- Crear directorios en `/public` o `/var/task`
- Usar `fs.mkdir()` y `fs.writeFile()` para guardar archivos
- Persistencia de archivos en el filesystem

**Archivo problemático**: `src/server/asignacion.ts` - función `guardarArchivo()`

---

## 🔧 CAMBIOS REALIZADOS

### 1. **Modificación de Backend: Guardar en MySQL**

**Archivo**: `src/server/asignacion.ts`

**Cambios**:

- ❌ Eliminado: imports `fs` y `path`
- ❌ Eliminado: función `guardarArchivo()` que usaba `fs.writeFile()`
- ✅ Agregado: función `guardarEvidenciaEnBD()` que valida y convierte archivos a Buffer
- ✅ Actualizado: `completarAsignacion()` para guardar en BD en lugar de filesystem
- ✅ Actualizado: `getEvidenciasDefensa()` para devolver `idEvidencia` y campos BLOB

**Validaciones incluidas**:

- Imagen: máx 5 MB, MIME `image/*`
- PDF: máx 10 MB, MIME `application/pdf`

---

### 2. **Nuevos Endpoints: Servir Evidencias desde BD**

#### GET `/api/evidencias/[id]/imagen`

**Archivo**: `src/app/api/evidencias/[id]/imagen/route.ts`

- Lee blob de imagen desde BD
- Devuelve imagen con Content-Type correcto
- Cache público de 1 año (immutable)

#### GET `/api/evidencias/[id]/pdf`

**Archivo**: `src/app/api/evidencias/[id]/pdf/route.ts`

- Lee blob de PDF desde BD
- Devuelve PDF abrible en navegador o descarga
- Mantiene nombre original del archivo
- Cache público de 1 año (immutable)

---

### 3. **Actualización de Frontend**

**Archivo**: `src/app/admin/defensas/[idDefensa]/evidencias/page.tsx`

**Cambios**:

- ✅ Actualizado tipo `Evidencia` para incluir nuevos campos BLOB
- ✅ Lógica de fallback:
  - Si es evidencia nueva (tiene `idEvidencia`): usa `/api/evidencias/[id]/imagen` y `/api/evidencias/[id]/pdf`
  - Si es evidencia antigua: usa `urlImagen` y `urlPdf` para compatibilidad

---

### 4. **Migración SQL Requerida**

**Archivo**: `sql/evidencias-blob-migration.sql`

```sql
ALTER TABLE Evidencia
ADD COLUMN imagenNombre VARCHAR(255) NULL,
ADD COLUMN imagenMime VARCHAR(100) NULL,
ADD COLUMN imagenArchivo LONGBLOB NULL,
ADD COLUMN pdfNombre VARCHAR(255) NULL,
ADD COLUMN pdfMime VARCHAR(100) NULL,
ADD COLUMN pdfArchivo LONGBLOB NULL;
```

**Nota**: Las columnas `urlImagen` y `urlPdf` se mantienen para compatibilidad con datos históricos.

---

## 📊 ARCHIVOS MODIFICADOS

| Archivo                                                  | Cambio                                               |
| -------------------------------------------------------- | ---------------------------------------------------- |
| `src/server/asignacion.ts`                               | Reemplazo completo de lógica de guardado: fs → MySQL |
| `src/app/api/evidencias/[id]/imagen/route.ts`            | ✨ NUEVO endpoint GET                                |
| `src/app/api/evidencias/[id]/pdf/route.ts`               | ✨ NUEVO endpoint GET                                |
| `src/app/admin/defensas/[idDefensa]/evidencias/page.tsx` | Actualizado para usar nuevos endpoints               |
| `sql/evidencias-blob-migration.sql`                      | ✨ NUEVA migración SQL                               |

---

## 🔄 FLUJO DE DATOS

### Antes (❌ Falla en Vercel)

```
Delegado sube imagen/PDF
    ↓
FormData → route.ts
    ↓
completarAsignacion()
    ↓
guardarArchivo()
    ↓
fs.mkdir() + fs.writeFile() → /public/uploads/
    ↓
❌ ENOENT ERROR EN VERCEL
```

### Después (✅ Funciona en Vercel)

```
Delegado sube imagen/PDF
    ↓
FormData → route.ts
    ↓
completarAsignacion()
    ↓
guardarEvidenciaEnBD()
    ↓
Buffer.from(file.arrayBuffer())
    ↓
INSERT INTO Evidencia (..., imagenArchivo, pdfArchivo, ...)
    ↓
✅ Almacenado en MySQL
    ↓
Admin accede a GET /api/evidencias/[id]/imagen
    ↓
SELECT imagenArchivo, imagenMime FROM Evidencia
    ↓
Response(Uint8Array(blob))
    ↓
✅ Imagen visible en navegador
```

---

## ✅ VALIDACIÓN FINAL

### npm run build

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (33/33)
✓ Collecting build traces
✓ Finalizing page optimization
```

**Nuevas rutas creadas**:

- ƒ /api/evidencias/[id]/imagen
- ƒ /api/evidencias/[id]/pdf

---

## 🧪 CÓMO PROBAR MANUALMENTE

### Local (con Next.js)

1. **Ejecutar la migración SQL**:

   ```sql
   -- Ver archivo sql/evidencias-blob-migration.sql
   -- Ejecutar en tu BD MySQL
   ```

2. **Iniciar servidor**:

   ```bash
   npm run dev
   ```

3. **Subir evidencia**:
   - Ir a `/delegado/pendientes`
   - Completar una defensa pendiente
   - Subir PNG/JPG (5 MB max) e PDF (10 MB max)
   - El archivo ahora se guarda en MySQL, no en filesystem

4. **Ver evidencia**:
   - Ir a `/admin/defensas`
   - Click en "Ver evidencias"
   - Verificar que imagen y PDF son visibles y descargables

5. **Verificar BD**:
   ```sql
   SELECT
     idEvidencia,
     imagenNombre,
     LENGTH(imagenArchivo) as imagenBytes,
     pdfNombre,
     LENGTH(pdfArchivo) as pdfBytes
   FROM Evidencia
   LIMIT 1;
   ```

### En Vercel (después de desplegar)

1. **No hay archivos en `/public`**: ✓ Los blobs están en MySQL
2. **Sin error ENOENT**: ✓ No usa filesystem
3. **Evidencia visible**: ✓ Sirve desde endpoints GET
4. **No visible en `/uploads`**: ✓ Confirmación de cambio completo

---

## ⚠️ IMPORTANTE

### Antes de desplegar a Vercel:

1. **Ejecutar migración SQL** en tu BD MySQL:

   ```sql
   -- Ver sql/evidencias-blob-migration.sql
   ```

2. **Deploying**:

   ```bash
   git push
   # Vercel auto-deploya
   ```

3. **Testing en producción**:
   - Subir una evidencia desde PWA móvil
   - Verificar que NO aparece `ENOENT` error
   - Verificar que defensa pasa a "Completada"
   - Abrir evidencia desde admin panel

---

## 📝 DATOS HISTÓRICOS

Las evidencias subidas antes de este cambio (que solo tienen `urlImagen`/`urlPdf`) seguirán funcionando:

- El frontend detecta si existe `idEvidencia` + `imagenMime`
- Si no, usa las URLs antiguas como fallback
- Ambos sistemas coexisten sin conflictos

---

## 🔐 SEGURIDAD

- ✅ Validación MIME en backend
- ✅ Límites de tamaño (5 MB imagen, 10 MB PDF)
- ✅ No hay rutas públicas de escritura
- ✅ Archivos servidos solo con GET, no listables
- ✅ Nombres originales no exponen estructura

---

## 📌 NOTAS FINALES

- **Stack mantiene**: Next.js 14, TypeScript, mysql2, sin Prisma
- **Compatibilidad**: Login, push, PWA, admin, delegado: TODO intacto
- **Vercel**: Serverless ✓, sin persistencia de filesystem ✓
- **Base de datos**: MySQL ✓, LONGBLOB ✓, backups incluyen evidencias ✓
