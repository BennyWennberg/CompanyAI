# AI Module API

## POST /api/ai/chat
- Auth: Bearer Token (read, all)
- Body:
```json
{
  "model": "gpt-4o-mini",
  "temperature": 0.2,
  "messages": [{"role":"user","content":"Hallo"}]
}
```
- Response: OpenAI-kompatibel (`choices[0].message.content`)

## POST /api/ai/hr-assist
- Auth: Bearer Token (read, all)
- Body:
```json
{ "prompt": "Erstelle ein Onboarding-Template für Entwickler" }
```
- Antwort enthält Modell-Antwort auf Basis RAG-Kontext aus `docs/`

## POST /api/ai/rag/reindex
- Auth: Bearer Token (admin, all)
- Effekt: Re-Index aller `docs/*.md` Dateien, Speichern nach `RAG_INDEX_PATH`.
- Response:
```json
{ "success": true, "data": { "chunks": 123, "model": "text-embedding-3-small" } }
```
