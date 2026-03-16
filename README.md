# PR2-26-COL-MARKETING

## Tecnologías
- Next.js
- TypeScript
- Prisma 7
- MySQL (Aiven)

## Estructura principal
- `src/app/admin`: pantallas del administrador
- `src/app/delegado`: pantallas del delegado
- `src/app/api`: rutas API
- `src/components`: componentes reutilizables
- `src/lib`: utilidades y configuración
- `src/server`: lógica de negocio del servidor
- `src/types`: tipos TypeScript
- `prisma`: esquema y migraciones

## Reglas de trabajo
- No modificar `schema.prisma` sin avisar.
- No tocar migraciones si no te corresponde backend/base de datos.
- Cada integrante trabaja en su propia rama.
- Los componentes reutilizables van en `src/components`.
- Los tipos van en `src/types`.
- La lógica de conexión a BD va en `src/lib/prisma.ts`.

## Cómo correr el proyecto
```bash
npm install
npm run dev
