# Col Marketing (Next.js)

## Scripts

- `npm run dev` — desarrollo (`http://localhost:3000`)
- `npm run build` — compilación de producción
- `npm start` — servidor de producción (tras `build`)

## Variables de entorno

Copia `.env.example` a `.env.local` en la raíz con las credenciales MySQL (mismas que usaba el backend Express anterior).

## Estructura

| Ruta / carpeta | Contenido |
|----------------|-----------|
| `src/app/admin/` | Pantallas del administrador (App Router) |
| `src/app/delegado/` | Pantallas del delegado |
| `src/app/api/` | Handlers HTTP (`route.ts`) — API unificada en Next |
| `src/components/` | Componentes reutilizables (login, dashboard, UI) |
| `src/lib/` | Utilidades, rutas de navegación, pool MySQL |
| `src/server/` | Lógica de negocio y acceso a datos usada desde las APIs |
| `src/types/` | Tipos TypeScript compartidos |
| `public/` | Estáticos públicos |

La aplicación usa **MySQL** mediante `mysql2` en rutas API y `src/lib/db.ts`. No hay segundo servidor Express: las rutas de `backend/server.js` se migraron a `src/app/api/**/route.ts`.
