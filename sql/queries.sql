-- Notas con checklist items y tags en un solo resultado.
-- LEFT JOIN se usa para traer todas las notas incluso si no tienen items o tags.
SELECT
  n.*,
  COALESCE(json_agg(DISTINCT ci.*) FILTER (WHERE ci.id IS NOT NULL), '[]') AS items,
  COALESCE(json_agg(DISTINCT nt.tag) FILTER (WHERE nt.id IS NOT NULL), '[]') AS tags
FROM notes n
LEFT JOIN checklist_items ci ON n.id = ci.note_id
LEFT JOIN note_tags nt ON n.id = nt.note_id
WHERE n.user_id = $1
GROUP BY n.id
ORDER BY n.created_at DESC;

-- Variante para una nota puntual.
SELECT
  n.*,
  COALESCE(json_agg(DISTINCT ci.*) FILTER (WHERE ci.id IS NOT NULL), '[]') AS items,
  COALESCE(json_agg(DISTINCT nt.tag) FILTER (WHERE nt.id IS NOT NULL), '[]') AS tags
FROM notes n
LEFT JOIN checklist_items ci ON n.id = ci.note_id
LEFT JOIN note_tags nt ON n.id = nt.note_id
WHERE n.id = $1 AND n.user_id = $2
GROUP BY n.id;
