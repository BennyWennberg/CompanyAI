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

## API Keys & Zugriff (OpenWebUI)
- OpenWebUI (lokal): Standardmäßig kein API-Key nötig für localhost-Tests.
- Produktionsbetrieb:
  - Setze `OPENWEBUI_URL` im `backend/.env`
  - Wenn ein API-Key/Token für den Upstream nötig ist, speichere ihn als `OPENWEBUI_API_KEY` im `backend/.env` und sende ihn als Header (z. B. `Authorization: Bearer ...`) über die Proxy-Schicht.
  - Für Cloud-LLMs (OpenAI-kompatibel) verwende `OPENAI_API_KEY`.

## RAG/Docs
- Nur freigegebene Dokumente indexieren
- Aktualisierungsprozess mit Review/QA

## Incident Management
- Fehler-/Sicherheitsvorfälle dokumentieren
- Kontaktwege und Reaktionszeiten definieren
