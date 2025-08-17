# AI Module

## Übersicht
Das AI Module bietet Multi-Provider Chat-Funktionalität und ein RAG (Retrieval-Augmented Generation) System mit externer Dokumentenspeicherung.

### Hauptfunktionen
- **Multi-Provider Chat**: OpenAI, Gemini, Ollama mit Provider-Selektor
- **RAG System**: Dokumentenbasierte KI-Assistenten mit externem Speicher
- **HR Assist**: RAG-gestützte HR-Queries
- **Dokumentenmanagement**: Upload und Verwaltung externer Markdown-Dateien

## Endpunkte
- `POST /api/ai/chat` - Multi-Provider Chat mit optionalem RAG
- `POST /api/ai/hr-assist` - HR-spezifischer RAG-Assistent
- `GET /api/ai/rag/docs` - Liste aller RAG-Dokumente
- `GET /api/ai/rag/doc` - Einzelnes Dokument abrufen
- `POST /api/ai/rag/manual-doc` - Manuelles Dokument hinzufügen
- `POST /api/ai/rag/reindex` - RAG Index neu erstellen

## Externe Speicherung (NEU v2.2.0)

### Konfiguration
Das RAG System nutzt externe Ordner für die Dokumentenspeicherung:
```bash
# Backend .env
RAG_EXTERNAL_DOCS_PATH=C:/CompanyAI-External/docs
RAG_INDEX_PATH=C:/CompanyAI-External/rag_index.json
RAG_EMBEDDING_PROVIDER=openai
RAG_EMBEDDING_MODEL=text-embedding-3-small
```

### Ordnerstruktur (Extern)
```
C:/CompanyAI-External/
├── docs/                    # Haupt-Dokumentenordner
│   ├── uploads/            # Manuell hochgeladene Dateien
│   └── *.md                # Weitere Markdown-Dateien
└── rag_index.json          # Embedding-Index
```

### Vorteile der externen Speicherung
- ✅ **Trennung**: Projekt-Code getrennt von Daten
- ✅ **Portabilität**: Einfacher Backup und Synchronisation
- ✅ **Skalierung**: Keine Projekt-Repository-Vergrößerung
- ✅ **Flexibilität**: Externe Ordner können geteilt werden

## Provider-Unterstützung

### OpenAI
```bash
OPENAI_API_KEY=sk-...
```
Unterstützte Modelle: `gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo`

### Google Gemini
```bash
GEMINI_API_KEY=AIza...
```
Unterstützte Modelle: `gemini-1.5-flash`, `gemini-1.5-pro`

### Ollama (Local)
```bash
OLLAMA_URL=http://localhost:11434
```
Unterstützte Modelle: `llama3`, `mistral`, `codellama`

## Sicherheit & Berechtigungen
- `requirePermission('read','all')` für Chat/HR Assist/Docs
- `requirePermission('admin','all')` für Re-Index und Manual Doc Upload
- Externe Ordner-Berechtigungen erforderlich für Backend

## Frontend-Komponenten
- `AIModule.tsx` - Haupt-Routing für AI-Features
- `AIChatPage.tsx` - Multi-Provider Chat Interface mit RAG-Option
- `DocsPage.tsx` - Dokumentenmanagement und Upload (extern)

### Navigation
- Route: `/ai/*`
- Sidebar-Eintrag: „🤖 AI Chat"
- Dashboard-Kachel: „AI & Chat" mit Provider-Info

## Performance & Limitierungen
- **Embedding-Erstellung**: Abhängig von Provider-Geschwindigkeit
- **Externe I/O**: Ordner-Zugriff kann Latenz hinzufügen
- **Index-Größe**: Große Dokumentenmengen beeinflussen Speicherbedarf
- **Provider-Limits**: Rate Limits der jeweiligen AI-Anbieter beachten
