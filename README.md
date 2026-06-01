<img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js">
<img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
<img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
<img src="https://img.shields.io/badge/Neon-00E599?style=for-the-badge" alt="Neon">
<img src="https://img.shields.io/badge/Zod-3E67B1?style=for-the-badge" alt="Zod">
<img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT">
<img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel">

# NoteFlow API

API REST para NoteFlow (web y movil), construida con Next.js App Router, PostgreSQL (Neon), validacion con Zod y verificacion de ID tokens de Firebase.

## Caracteristicas

- Verificacion de ID tokens de Firebase con firebase-admin.
- Provision automatica de usuario en DB por firebase_uid cuando aun no existe.
- Endpoints protegidos por header Authorization Bearer.
- CRUD de notas y checklists.
- Gestion de items de checklist por nota.
- CORS configurado para frontend web.
- Formato de errores consistente en JSON con message.

## Stack

| Tecnologia | Uso |
| --- | --- |
| Next.js 16 (Route Handlers) | API HTTP |
| TypeScript | Tipado estricto |
| PostgreSQL + Neon | Persistencia de datos |
| Zod | Validacion de payloads |
| firebase-admin | Verificacion de ID token Firebase |
| bcryptjs + jsonwebtoken | Endpoints auth legacy (opcional) |

## Variables de entorno

Crear archivo .env.local con:

```env
DATABASE_URL=postgresql://...
JWT_SECRET=tu_secreto_largo
FIREBASE_PROJECT_ID=tu-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@tu-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# AWS S3 (subida de imagenes por URL firmada)
AWS_REGION=us-east-1
AWS_S3_BUCKET=mi-bucket-noteflow
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
# Opcional: CDN o dominio publico del bucket
AWS_S3_PUBLIC_BASE_URL=https://mi-cdn.com

# Opcionales para CORS
CORS_ALLOWED_ORIGINS=http://localhost:8081,https://tu-frontend.app
CORS_ALLOW_CREDENTIALS=false
```

Notas:

- DATABASE_URL, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY son obligatorias.
- Para subir imagenes a S3, tambien son obligatorias AWS_REGION, AWS_S3_BUCKET, AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY.
- JWT_SECRET solo es necesaria si mantienes /api/auth/login y /api/auth/register.
- Si no defines CORS_ALLOWED_ORIGINS, se permite * solo cuando CORS_ALLOW_CREDENTIALS=false.

## Arranque local

```bash
npm install
npm run dev
```

API local:

- http://localhost:3000/api

## Endpoints

### Auth (legacy opcional)

- POST /api/auth/register
- POST /api/auth/login

Request body:

```json
{
	"email": "user@mail.com",
	"password": "password123"
}
```

Response 200 o 201:

```json
{
	"user": {
		"id": "uuid",
		"email": "user@mail.com"
	},
	"token": "jwt"
}
```

### Notes (Bearer token Firebase)

- GET /api/notes
- POST /api/notes
- GET /api/notes/:id
- PATCH /api/notes/:id
- DELETE /api/notes/:id

### Checklist items (Bearer token Firebase)

- GET /api/notes/:id/checklist-items
- POST /api/notes/:id/checklist-items
- PATCH /api/checklist-items/:itemId
- DELETE /api/checklist-items/:itemId

### Uploads (Bearer token Firebase)

- POST /api/uploads/presign

Request body:

```json
{
	"purpose": "avatar",
	"contentType": "image/jpeg",
	"extension": "jpg"
}
```

Response 200:

```json
{
	"signedUrl": "https://...",
	"publicUrl": "https://...",
	"key": "avatars/<userId>/<uuid>.jpg",
	"expiresIn": 300
}
```

Header esperado:

```http
Authorization: Bearer <firebase_id_token>
```

## Formato de error

Todas las respuestas de error se devuelven en JSON con:

```json
{
	"message": "Error legible",
	"code": "ERROR_CODE",
	"details": {}
}
```

Campos code y details son opcionales.

## CORS

Para frontend web se devuelve en OPTIONS y respuestas normales:

- Access-Control-Allow-Origin
- Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS
- Access-Control-Allow-Headers: Content-Type, Authorization
- Vary: Origin

## Pruebas rapidas

Preflight:

```bash
curl -i -X OPTIONS 'http://localhost:3000/api/auth/login' \
	-H 'Origin: http://localhost:8081' \
	-H 'Access-Control-Request-Method: POST' \
	-H 'Access-Control-Request-Headers: Content-Type,Authorization'
```

Login invalido (esperado 401 con JSON):

```bash
curl -i -X POST 'http://localhost:3000/api/auth/login' \
	-H 'Origin: http://localhost:8081' \
	-H 'Content-Type: application/json' \
	--data '{"email":"nobody@example.com","password":"badpass"}'
```

## Estructura relevante

```text
app/
	api/
		auth/
			login/route.ts
			register/route.ts
		notes/
			route.ts
			[id]/route.ts
			[id]/checklist-items/route.ts
		checklist-items/
			[itemId]/route.ts
lib/
	auth.ts
	db.ts
	request-auth.ts
	api-response.ts
proxy.ts
sql/
	schema.sql
	queries.sql
```

## Deploy en Vercel

1. Conectar repo en Vercel.
2. Configurar variables DATABASE_URL, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.
3. Si mantienes auth legacy, configurar tambien JWT_SECRET.
4. Configurar CORS_ALLOWED_ORIGINS con los dominios frontend.
5. Desplegar.
6. Verificar OPTIONS y endpoints protegidos enviando ID token Firebase.

## Troubleshooting

- Error de red en frontend web: revisar CORS y que el dominio backend no tenga proteccion SSO de Vercel para llamadas publicas.
- 401 Token invalido: validar FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY y que el frontend envie un ID token Firebase vigente.
- 500 en endpoints protegidos: validar DATABASE_URL y tabla users con columna firebase_uid.
