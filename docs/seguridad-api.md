# Seguridad de API

## SQL injection

La inyeccion SQL ocurre cuando concatenas texto de usuario dentro del SQL. Ejemplo vulnerable:

```ts
const title = req.body.title; // posible payload: "'; DROP TABLE notes;--"
const sql = "SELECT * FROM notes WHERE title = '" + title + "'";
```

Si el atacante envia un payload malicioso, puede alterar la consulta.

## Consultas parametrizadas

La mitigacion es usar placeholders ($1, $2, etc.) y pasar valores por separado:

```ts
const sql = 'SELECT * FROM notes WHERE title = $1';
await query(sql, [req.body.title]);
```

Asi, PostgreSQL interpreta el parametro como dato literal y no como codigo SQL.

## Variables de entorno y secretos

Las variables de entorno almacenan configuraciones sensibles fuera del codigo fuente:

- DATABASE_URL: cadena de conexion a PostgreSQL/Neon.
- JWT_SECRET: secreto para firmar y verificar tokens.

Buenas practicas:

- Nunca hardcodear secretos en archivos versionados.
- Mantener .env.local fuera de Git.
- Publicar solo .env.example con claves vacias.
- Configurar secretos de produccion en Vercel (Environment Variables).

## Manejo de errores

No devolver errores crudos de base de datos al cliente. Responder mensajes genericos como "Error interno" y loguear detalles solo en servidor.
