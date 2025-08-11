# Logging Strategy

## Ziele
- Nachvollziehbarkeit von Requests/Fehlern
- Minimal-invasive Logs ohne sensitive Inhalte
- Grundlage für Monitoring/Alerting

## Backend
- Request-ID (reqId) je Anfrage
- Security Middleware: helmet, rate limit, CORS-Whitelist
- HTTP-Logs: morgan (kombiniert mit reqId)
- Error-Handler: Keine Stacks in Prod-Responses

## Frontend
- ErrorBoundary für UI-Fehler
- Zentraler API-Client mit fehlerbezogenem Logging (nur Metadaten)

## Log-Level
- info: Standardfluss, wichtige Ereignisse
- warn: Unerwartete, aber tolerierbare Zustände
- error: Fehlerfälle

## Retention
- Dev: 14–30 Tage, Prod: Policy-basiert
- Keine sensiblen Payloads persistieren

## Nächste Schritte
- Strukturierte Logs (pino/winston)
- Request-Logging erweitern (Header-Whitelist)
- Optional: Sentry-Integration
