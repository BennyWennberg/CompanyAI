# AI Security Policy

## Ziele
- Schutz sensibler Daten (PII, Betriebsgeheimnisse)
- Minimierung von Risiko und Angriffsfläche
- Nachvollziehbare Nutzung von KI-Funktionen

## Datenklassifizierung
- PII: Personenbezogene Daten (E-Mail, Name, IDs)
- Vertraulich: Interna, Reports, Onboarding-Pläne
- Öffentlich: Marketing-Texte, nicht-sensible Doku

## Logging-Policy
- Keine sensiblen Payloads im Log
- Log-Level: info, warn, error
- Korrelations-ID pro Request (reqId)
- Retention: 14–30 Tage (je nach Umgebung)

## Zugriff & Rollen
- Zugriff nur für autorisierte Nutzerrollen
- Least-Privilege-Prinzip für Services

## Transport & Konfiguration
- TLS in produktiven Umgebungen
- Secrets in .env (nicht im Repo), regelmäßige Rotation

## API Keys & Zugriff (Direkte Provider)
- OpenAI: `OPENAI_API_KEY` (Server-seitig, nicht an Frontend weitergeben)
- Gemini: `GEMINI_API_KEY` (Server-seitig)
- Ollama: `OLLAMA_URL` (lokaler Host, Zugriff beschränken)
- Berechtigungen/Quotas in den jeweiligen Provider-Konsolen prüfen

## RAG/Docs
- Nur freigegebene Dokumente indexieren
- Aktualisierungsprozess mit Review/QA

## Incident Management
- Fehler-/Sicherheitsvorfälle dokumentieren
- Kontaktwege und Reaktionszeiten definieren
