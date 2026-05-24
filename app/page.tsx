export default function Home() {
  return (
    <main style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>NoteFlow API</h1>
      <p>Backend listo. Usa los endpoints bajo /api.</p>
      <ul>
        <li>Autenticacion: /api/auth/register, /api/auth/login</li>
        <li>Notas: /api/notes y /api/notes/:id</li>
        <li>Checklist: /api/notes/:id/checklist-items y /api/checklist-items/:itemId</li>
      </ul>
      <p>Consulta docs/backend-teoria.md y docs/seguridad-api.md para la teoria y seguridad.</p>
    </main>
  );
}
