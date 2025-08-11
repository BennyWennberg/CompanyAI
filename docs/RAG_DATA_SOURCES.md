# RAG Data Sources

## Ziele
- Antworten auf Basis interner Dokumentation (`docs/`)
- Transparenz und Nachvollziehbarkeit (Quellenangabe)

## Quellenumfang (Inklusion)
- `docs/README.md`, `docs/DOCUMENTATION_OVERVIEW.md`
- `docs/INTERDEPENDENCY.md` (kritische Abhängigkeiten)
- `docs/modules/**` (Modul-Docs)
- `docs/architecture/**` (Architektur)

## Ausschlüsse (Exklusion)
- Geheimnisse, .env-Inhalte
- Build-Artefakte, node_modules
- Nicht-finale Brainstormings/Notizen außerhalb `docs/`

## Aktualisierung
- Vollständiger Re-Index bei Release (Tag)
- Inkrementelles Update bei Docs-Änderung (Hook optional)

## Indexing-Parameter (Empfehlung)
- Chunk-Größe: 500–1.000 Tokens
- Overlap: 50–100 Tokens
- Metadaten: Pfad, Abschnitt, Zeitstempel
