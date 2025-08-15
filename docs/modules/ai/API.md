# AI Module API

## POST /api/ai/chat
- Auth: Bearer Token (read, all)
- Body:
```json
{
  "provider": "openai", // openai | gemini | ollama
  "model": "gpt-4o-mini",
  "temperature": 0.2,
  "rag": false,
  "ragTopK": 5,
  "messages": [{"role":"user","content":"Hallo"}]
}
```
- Response: OpenAI-kompatibel (`choices[0].message.content`)
- Meta (bei `rag=true`):
```json
{
  "success": true,
  "data": { "choices": [ { "message": { "content": "..." } } ] },
  "meta": {
    "rag": {
      "sources": [
        { "path": "modules/hr/README.md", "chunk": "modules/hr/README.md#1", "preview": "Erster Abschnitt..." }
      ]
    }
  }
}
```

## POST /api/ai/hr-assist
- Auth: Bearer Token (read, all)
- Body:
```json
{ "prompt": "Erstelle ein Onboarding-Template für Entwickler", "provider": "openai", "model": "gpt-4o-mini" }
```
- Antwort enthält Modell-Antwort auf Basis RAG-Kontext aus `docs/`

## POST /api/ai/rag/reindex
- Auth: Bearer Token (admin, all)
- Effekt: Re-Index aller `docs/*.md` Dateien, Speichern nach `RAG_INDEX_PATH`.
- Response:
```json
{ "success": true, "data": { "chunks": 123, "model": "openai:text-embedding-3-small" } }
```

## GET /api/ai/rag/docs
- Auth: Bearer Token (read, all)
- Antwort: Liste aller Markdown-Dateien unter `docs/`

## GET /api/ai/rag/doc
- Auth: Bearer Token (read, all)
- Query: `path` (relativer Pfad unter `docs/`)
- Antwort: `{ path, content }` als JSON

## GET /api/ai/rag/doc-raw
- Auth: Bearer Token (read, all)
- Query: `path` (relativer Pfad unter `docs/`)
- Antwort: Raw Markdown (`text/markdown`)
