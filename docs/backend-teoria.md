# Backend NoteFlow: teoria

## Patron cliente-servidor

En una arquitectura cliente-servidor, la app movil (cliente) envia solicitudes HTTP a una API (servidor), y la API accede a la base de datos. El cliente nunca debe conectarse directo a PostgreSQL porque expondrias credenciales y reglas internas.

Responsabilidades por capa:

- Cliente: interfaz y experiencia de usuario.
- API: validacion, autorizacion, reglas de negocio y formato de respuesta.
- Base de datos: persistencia y consistencia de datos.

## Que es una API REST

Una API REST expone recursos (por ejemplo, notas) mediante rutas y metodos HTTP estandar:

- GET: lectura.
- POST: creacion.
- PATCH: modificacion parcial.
- DELETE: eliminacion.

Cada respuesta incluye un codigo de estado para indicar el resultado:

- 200 OK: operacion correcta.
- 201 Created: recurso creado correctamente.
- 204 No Content: operacion correcta sin cuerpo de respuesta.
- 400 Bad Request: datos invalidos.
- 401 Unauthorized: token ausente o invalido.
- 404 Not Found: recurso inexistente.
- 500 Internal Server Error: fallo interno del servidor.

## Bases de datos relacionales

Una base relacional organiza informacion en tablas con filas y columnas. Cada tabla representa una entidad (users, notes, checklist_items, note_tags) y se conecta con otras por claves.

### ACID

Las transacciones fiables dependen de:

- Atomicidad: todo o nada.
- Consistencia: se respetan reglas e integridad.
- Aislamiento: operaciones concurrentes no se pisan.
- Durabilidad: cambios confirmados sobreviven fallos.

### Primary key

Una primary key identifica de forma unica cada fila. En apps moviles es comun usar UUID porque permite generar IDs offline antes de sincronizar.

### Foreign key

Una foreign key referencia la primary key de otra tabla y mantiene integridad referencial. Con ON DELETE CASCADE, al eliminar una nota se eliminan automaticamente sus checklist items y tags asociados.

### DDL vs DML

- DDL (Data Definition Language): define estructura. Ejemplos: CREATE, ALTER, DROP.
- DML (Data Manipulation Language): manipula datos. Ejemplos: SELECT, INSERT, UPDATE, DELETE.

## Diagrama entidad-relacion (ER)

Tablas:

- users
  - id (UUID, PK)
  - email (CITEXT, UNIQUE)
  - password_hash (TEXT)
  - created_at (TIMESTAMPTZ)
- notes
  - id (UUID, PK)
  - user_id (UUID, FK -> users.id)
  - title (VARCHAR)
  - content (TEXT)
  - type (VARCHAR con CHECK: note|checklist|idea)
  - color (VARCHAR(7))
  - created_at, updated_at (TIMESTAMPTZ)
- checklist_items
  - id (UUID, PK)
  - note_id (UUID, FK -> notes.id ON DELETE CASCADE)
  - text (VARCHAR)
  - is_completed (BOOLEAN)
- note_tags
  - id (UUID, PK)
  - note_id (UUID, FK -> notes.id ON DELETE CASCADE)
  - tag (VARCHAR)

Relaciones:

- users 1:N notes
- notes 1:N checklist_items
- notes 1:N note_tags

## JOINs: INNER vs LEFT

- INNER JOIN devuelve solo filas con coincidencia en ambas tablas.
  - Uso tipico: listar checklist items de notas existentes del usuario.
- LEFT JOIN devuelve todas las filas de la tabla izquierda y, si no hay coincidencia, devuelve NULL en la derecha.
  - Uso tipico: listar todas las notas aunque no tengan checklist items ni tags.

Ejemplo practico:

- INNER JOIN seria ideal para reportes que solo consideren notas con items.
- LEFT JOIN se usa en el feed principal para no ocultar notas vacias.

## Pruebas de endpoints (plantilla)

Se recomienda ejecutar pruebas con Bruno o Insomnia y guardar en este documento capturas o payloads reales:

- GET /api/notes -> 200
- POST /api/notes -> 201
- GET /api/notes/:id -> 200 / 404
- PATCH /api/notes/:id -> 200 / 400 / 404
- DELETE /api/notes/:id -> 204 / 404
- GET /api/notes/:id/checklist-items -> 200 / 404
- POST /api/notes/:id/checklist-items -> 201 / 400 / 404
- PATCH /api/checklist-items/:itemId -> 200 / 400 / 404
- DELETE /api/checklist-items/:itemId -> 204 / 404
- POST /api/auth/register -> 201 / 400
- POST /api/auth/login -> 200 / 400 / 401
