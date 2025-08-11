# AI Module

## Übersicht
- AI Chat und RAG-gestützte Assistenten (OpenWebUI)
- Endpunkte: `/api/ai/chat`, `/api/ai/hr-assist`, `/api/ai/rag/reindex`

## Funktionen
- Chat (OpenAI-kompatibler Proxy)
- HR Assist mit RAG-Kontext aus `docs/`
- RAG Re-Index auslösen (Admin)

## Sicherheit & Berechtigungen
- `requirePermission('read','all')` für Chat/HR Assist
- `requirePermission('admin','all')` für Re-Index

## Abhängigkeiten
- OpenWebUI (`OPENWEBUI_URL`)
- Embedding Modell (`RAG_EMBEDDING_MODEL`)

## Frontend
- `AIModule.tsx` mit `AIChatPage.tsx`
- Route: `/ai/*`, Sidebar-Eintrag „AI“, Dashboard-Kachel
