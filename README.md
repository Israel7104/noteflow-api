# NoteFlow API

Backend REST para NoteFlow construido con Next.js (App Router), PostgreSQL (Neon), validacion con Zod y autenticacion JWT.

## Stack

- Next.js 16 + TypeScript
- PostgreSQL (Neon) + @neondatabase/serverless
- Zod para validacion
- bcryptjs + jsonwebtoken para auth

## Setup paso a paso

1. Instalar dependencias:

```bash
npm install
```

2. Configurar variables de entorno en .env.local:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=tu_secreto_largo
```

3. Crear base de datos en Neon y ejecutar sql/schema.sql en la consola SQL.

4. Correr en local:

```bash
npm run dev
```

API local: http://localhost:3000/api

## Variables de entorno

- DATABASE_URL: string de conexion a PostgreSQL/Neon.
- JWT_SECRET: secreto para firmar/verificar tokens.

## Endpoints

### Auth

1. POST /api/auth/register
Body:

```json
{
	"email": "user@mail.com",
	"password": "password123"
}
```

Respuesta 201:

```json
{
	"user": {
		"id": "uuid",
		"email": "user@mail.com"
	},
	"token": "jwt"
}
```

2. POST /api/auth/login
Body:

```json
{
	"email": "user@mail.com",
	"password": "password123"
}
```

Respuesta 200:

```json
{
	"user": {
		"id": "uuid",
		"email": "user@mail.com"
	},
	"token": "jwt"
}
```

### Notes (requieren Authorization: Bearer <token>)

1. GET /api/notes
Respuesta 200: lista de notas del usuario.

2. POST /api/notes
Body:

```json
{
	"title": "Comprar",
	"type": "checklist",
	"content": "Supermercado",
	"color": "#FFAA00"
}
```

Respuesta 201: nota creada.

3. GET /api/notes/:id
Respuesta 200: nota con items y tags.

4. PATCH /api/notes/:id
Body parcial (ejemplo):

```json
{
	"title": "Nuevo titulo",
	"color": "#112233"
}
```

Respuesta 200: nota actualizada.

5. DELETE /api/notes/:id
Respuesta 204 sin body.

### Checklist items (requieren Authorization: Bearer <token>)

1. GET /api/notes/:id/checklist-items
Respuesta 200: items de la nota.

2. POST /api/notes/:id/checklist-items
Body:

```json
{
	"text": "Comprar leche"
}
```

Respuesta 201: item creado.

3. PATCH /api/checklist-items/:itemId
Body parcial (ejemplo):

```json
{
	"is_completed": true
}
```

Respuesta 200: item actualizado.

4. DELETE /api/checklist-items/:itemId
Respuesta 204 sin body.

## Estructura relevante

- app/api/auth/register/route.ts
- app/api/auth/login/route.ts
- app/api/notes/route.ts
- app/api/notes/[id]/route.ts
- app/api/notes/[id]/checklist-items/route.ts
- app/api/checklist-items/[itemId]/route.ts
- lib/db.ts
- lib/auth.ts
- sql/schema.sql
- sql/queries.sql
- docs/backend-teoria.md
- docs/seguridad-api.md

## Deploy en Vercel

1. Push del repo a GitHub.
2. Importar proyecto en Vercel.
3. Configurar variables DATABASE_URL y JWT_SECRET en Vercel.
4. Deploy y prueba de endpoints en la URL de produccion.

## Integracion con app movil

En tu app Expo/React Native:

- Define EXPO_PUBLIC_API_URL con la URL de esta API.
- Crea lib/api.ts con fetch tipado por endpoint.
- Guarda JWT con expo-secure-store (no AsyncStorage).
- Incluye Authorization: Bearer <token> en requests protegidas.
