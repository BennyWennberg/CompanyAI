# Prompt Guidelines

## Ziele
- Konsistente, reproduzierbare KI-Antworten
- Minimierung von Halluzinationen

## Do
- Klare Rollen (system) vorgeben
- Kontext (Abschnitte, Daten) explizit mitgeben
- Erwünschtes Format definieren (Stichpunkte/JSON)
- Quellen/Verweise anfordern

## Don't
- Vage Anforderungen ohne Kontext
- Aufforderungen zu sensiblen/PII-Inhalten
- Nicht genehmigte externe Datenquellen

## Template (Beispiel)
```
System: Du bist ein HR-Assistent. Antworte präzise, strukturiert und in Deutsch.
User: [konkrete Anfrage + Kontextauszüge]
Assistant: [Antwort mit Stichpunkten + Quellen]
```

## Review-Prozess
- Änderungen an Prompts per PR
- Tests für kritische Workflows (Regression vermeiden)
