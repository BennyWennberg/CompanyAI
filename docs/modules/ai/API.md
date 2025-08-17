# AI Module - API Dokumentation

## Übersicht

Das AI Module bietet Multi-Provider Chat-Funktionalität, RAG (Retrieval-Augmented Generation) mit direkten Provider-Integrationen, **Original-Dateien Upload** mit automatischer Markdown-Konvertierung, **Chat-Session Management** und **Web-RAG Integration** für aktuelle Online-Informationen.

## Basis-URL

```
http://localhost:5000/api/ai
```

## Authentifizierung

Alle Endpunkte erfordern einen gültigen JWT Token im Authorization Header:

```http
Authorization: Bearer <jwt_token>
```

## Chat & RAG Endpunkte

### 1. Multi-Provider Chat

**POST** `/ai/chat`

Multi-Provider Chat mit optionalem RAG-Kontext.

**Berechtigung:** `requirePermission('read', 'all')`

**Request Body:**
```json
{
  "messages": [
    {"role": "user", "content": "Hallo, wie geht es dir?"}
  ],
  "model": "gpt-4o-mini",
  "provider": "openai",
  "temperature": 0.2,
  "rag": true,
  "ragTopK": 5,
  
  // NEU: Session Management
  "sessionId": "existing-session-id",
  "saveSession": true,
  "sessionTitle": "Mein Chat über KI",
  "tags": ["KI", "Entwicklung"],
  
  // NEU: Web-RAG Integration
  "webRag": true,
  "webSearchQuery": "aktuelle KI Entwicklungen 2024",
  "websiteUrl": "https://example.com/ki-artikel"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "choices": [
      {
        "message": {
          "role": "assistant",
          "content": "Hallo! Basierend auf den aktuellen Informationen..."
        }
      }
    ]
  },
  "meta": {
    "rag": {
      "sources": [
        {
          "path": "dokument.md",
          "chunk": "dokument.md#1",
          "preview": "Hier ist ein Auszug...",
          "isOriginal": false,
          "isWeb": false
        },
        {
          "path": "Aktuelle KI-Trends 2024",
          "chunk": "web-1",
          "preview": "KI-Entwicklungen zeigen...",
          "isOriginal": false,
          "isWeb": true,
          "webUrl": "https://example.com/ki-trends"
        }
      ]
    }
  },
  // NEU: Session Information
  "session": {
    "created": true,
    "sessionId": "new-session-uuid",
    "messagesSaved": true
  }
}
```

### 2. HR Assist

**POST** `/ai/hr-assist`

HR-spezifischer RAG-Assistent.

**Berechtigung:** `requirePermission('read', 'all')`

**Request Body:**
```json
{
  "prompt": "Wie ist der Urlaubsanspruch geregelt?",
  "provider": "openai",
  "model": "gpt-4o-mini"
}
```

### 3. RAG Index neu erstellen

**POST** `/ai/rag/reindex`

Erstellt den RAG-Index aus allen Markdown-Dateien neu.

**Berechtigung:** `requirePermission('admin', 'all')`

**Response:**
```json
{
  "success": true,
  "data": {
    "chunks": 150,
    "model": "openai:text-embedding-3-small",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### 4. Dokumente auflisten

**GET** `/ai/rag/docs`

Listet alle Markdown-Dokumente für RAG auf.

**Berechtigung:** `requirePermission('read', 'all')`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "path": "uploads/beispiel.md",
      "size": 1024,
      "updatedAt": "2024-01-01T12:00:00.000Z",
      "isExternal": true
    }
  ]
}
```

### 5. Einzelnes Dokument abrufen

**GET** `/ai/rag/doc?path=uploads/beispiel.md`

Ruft ein einzelnes Markdown-Dokument ab.

**Berechtigung:** `requirePermission('read', 'all')`

**Response:**
```json
{
  "success": true,
  "data": {
    "path": "uploads/beispiel.md",
    "content": "# Beispiel\n\nInhalt..."
  }
}
```

### 6. Manual Doc hinzufügen

**POST** `/ai/rag/manual-doc`

Fügt eine manuelle Markdown-Datei hinzu.

**Berechtigung:** `requirePermission('admin', 'all')`

**Request Body:**
```json
{
  "title": "Mein Dokument",
  "content": "# Markdown Content\n\nInhalt...",
  "reindex": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "created": {
      "filePath": "/path/to/file.md",
      "relativePath": "uploads/my-doc.md",
      "isExternal": true
    },
    "message": "Dokument wurde in externem Ordner gespeichert"
  }
}
```

---

## 📁 Original-Dateien Endpoints (NEU)

### 7. Original-Datei hochladen

**POST** `/ai/rag/upload-file`

Lädt eine Original-Datei hoch und erstellt automatisch Markdown für RAG.

**Berechtigung:** `requirePermission('admin', 'all')`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `file`: Die hochzuladende Datei (beliebiges Format, max. 25MB)
- `reindex`: `"true"` oder `"false"` (optional, default: false)

**PowerShell Beispiel:**
```powershell
$token = "your-jwt-token"
$headers = @{ "Authorization" = "Bearer $token" }

# Datei hochladen
$filePath = "C:\dokumente\beispiel.pdf"
$form = @{
    file = Get-Item $filePath
    reindex = "true"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/ai/rag/upload-file" `
    -Method POST -Headers $headers -Form $form
```

**Response:**
```json
{
  "success": true,
  "data": {
    "upload": {
      "originalFile": "/external/path/originals/beispiel-2024-01-01T12-00-00-000Z.pdf",
      "markdownFile": "/external/path/markdowns/beispiel-2024-01-01T12-00-00-000Z.md",
      "relativePaths": {
        "original": "originals/beispiel-2024-01-01T12-00-00-000Z.pdf",
        "markdown": "markdowns/beispiel-2024-01-01T12-00-00-000Z.md"
      },
      "isExternal": true,
      "extractedText": "Text aus der PDF-Datei..."
    },
    "reindexed": {
      "chunks": 150,
      "model": "openai:text-embedding-3-small",
      "createdAt": "2024-01-01T12:00:00.000Z"
    },
    "message": "Original-Datei \"beispiel.pdf\" wurde gespeichert (+ Markdown für RAG)"
  }
}
```

### 8. Original-Dateien auflisten

**GET** `/ai/rag/originals`

Listet alle hochgeladenen Original-Dateien auf.

**Berechtigung:** `requirePermission('read', 'all')`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "filename": "beispiel-2024-01-01T12-00-00-000Z.pdf",
      "originalName": "beispiel.pdf",
      "size": 524288,
      "uploadedAt": "2024-01-01T12:00:00.000Z",
      "downloadUrl": "/api/ai/rag/download/original/beispiel-2024-01-01T12-00-00-000Z.pdf",
      "markdownFile": "beispiel-2024-01-01T12-00-00-000Z.md"
    }
  ]
}
```

### 9. Original-Datei herunterladen

**GET** `/ai/rag/download/original/:filename`

Lädt eine Original-Datei herunter.

**Berechtigung:** `requirePermission('read', 'all')`

**Parameter:**
- `filename`: Der interne Dateiname (mit Zeitstempel)

**PowerShell Beispiel:**
```powershell
$token = "your-jwt-token"
$headers = @{ "Authorization" = "Bearer $token" }
$filename = "beispiel-2024-01-01T12-00-00-000Z.pdf"

Invoke-WebRequest -Uri "http://localhost:5000/api/ai/rag/download/original/$filename" `
    -Headers $headers -OutFile "heruntergeladen.pdf"
```

**Response:** Datei-Download (Original-Dateiname wird wiederhergestellt)

### 10. Original-Datei löschen

**DELETE** `/ai/rag/originals/:filename`

Löscht eine Original-Datei und die zugehörige Markdown-Datei.

**Berechtigung:** `requirePermission('admin', 'all')`

**Parameter:**
- `filename`: Der interne Dateiname (mit Zeitstempel)

**Response:**
```json
{
  "success": true,
  "message": "Datei \"beispiel-2024-01-01T12-00-00-000Z.pdf\" wurde gelöscht (Original + Markdown)"
}
```

---

## 📄 Unterstützte Dateiformate

Das System extrahiert automatisch Text aus verschiedenen Formaten:

### ✅ **Vollständig unterstützt:**
- `.txt`, `.md`, `.markdown` - Direkte Textverarbeitung
- `.json` - Strukturierte JSON-Darstellung  
- `.csv` - Tabellenformat beibehalten
- `.html`, `.htm` - HTML-Tags entfernt
- `.xml` - XML-Struktur erhalten
- `.log` - Log-Einträge (letzte 200 Zeilen)
- `.sql` - SQL-Code
- `.yaml`, `.yml` - YAML-Konfiguration
- `.ini`, `.cfg`, `.conf` - Konfigurationsdateien

### ⚠️ **Teilweise unterstützt:**
- Andere Textformate werden als UTF-8 versucht zu lesen
- Binärdateien erhalten informativen Platzhalter-Text

### 📁 **Binärdateien:**
- `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`
- `.jpg`, `.png`, `.mp4`, `.zip` usw.
- Werden als Binärdateien erkannt und mit Download-Link versehen

### 🚫 **Nicht erlaubt:**
- `.exe`, `.bat`, `.sh`, `.ps1`, `.scr` (Sicherheitsrisiko)

---

## 💾 Externe Speicherung

### **Ordnerstruktur (extern) - NEU:**
```
RAG_EXTERNAL_DOCS_PATH/
├── originals/              # Original-Dateien (für User-Downloads)
│   ├── beispiel-2024-01-01T12-00-00-000Z.pdf
│   └── dokument-2024-01-01T12-30-00-000Z.docx
├── markdowns/              # Markdown für RAG-System
│   ├── beispiel-2024-01-01T12-00-00-000Z.md
│   └── dokument-2024-01-01T12-30-00-000Z.md
└── rag_index.json          # RAG Embedding-Index
```

### **Vorteile:**
- ✅ **Original + Markdown**: Beide Versionen parallel gespeichert
- ✅ **Download-Links**: User können Originaldateien herunterladen  
- ✅ **Text-Extraktion**: Automatische Konvertierung für RAG
- ✅ **Externe Speicherung**: Getrennt vom Projekt
- ✅ **Alle Dateitypen**: PDFs, Word, Excel, Bilder, etc.
- ✅ **Sicherheit**: Path-Traversal-Schutz, Dateityp-Validierung

### **Environment-Konfiguration:**
```bash
# In backend/.env
RAG_EXTERNAL_DOCS_PATH=C:/CompanyAI-External/docs
RAG_INDEX_PATH=C:/CompanyAI-External/rag_index.json
```

---

## 🧪 PowerShell Test-Beispiele

### Original-Datei hochladen und testen:
```powershell
# 1. Token setzen
$token = "your-jwt-token-here"
$headers = @{ "Authorization" = "Bearer $token" }

# 2. Datei hochladen
$filePath = "C:\test\beispiel.pdf"
$form = @{
    file = Get-Item $filePath
    reindex = "true"
}

$uploadResult = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/rag/upload-file" `
    -Method POST -Headers $headers -Form $form

Write-Host "Upload erfolgreich: $($uploadResult.data.message)"

# 3. Original-Dateien auflisten
$originals = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/rag/originals" `
    -Headers $headers

Write-Host "Anzahl Original-Dateien: $($originals.data.Count)"

# 4. RAG mit neuen Daten testen
$chatRequest = @{
    messages = @(@{ role = "user"; content = "Was steht in der hochgeladenen PDF?" })
    rag = $true
    ragTopK = 3
} | ConvertTo-Json -Depth 3

$chatResult = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/chat" `
    -Method POST -Headers $headers -Body $chatRequest -ContentType "application/json"

Write-Host "RAG Antwort: $($chatResult.data.choices[0].message.content)"
```

---

## 💬 Chat-Session Management (NEU)

### 11. Chat-Session erstellen

**POST** `/ai/sessions`

Erstellt eine neue Chat-Session für die Organisation von Gesprächen.

**Berechtigung:** `requirePermission('read', 'all')`

**Request Body:**
```json
{
  "title": "KI-Entwicklung Diskussion",
  "description": "Gespräch über aktuelle KI-Trends und Implementierung",
  "tags": ["KI", "Entwicklung", "Planung"],
  "folder": "Projekte",
  "settings": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.2,
    "useRag": true,
    "ragTopK": 5,
    "useWebRag": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "title": "KI-Entwicklung Diskussion",
    "description": "Gespräch über aktuelle KI-Trends...",
    "tags": ["KI", "Entwicklung", "Planung"],
    "folder": "Projekte",
    "settings": { ... },
    "messages": [],
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "createdBy": "user-id"
  },
  "message": "Chat-Session erfolgreich erstellt"
}
```

### 12. Chat-Session laden

**GET** `/ai/sessions/:sessionId`

Lädt eine bestehende Chat-Session mit allen Nachrichten.

**Berechtigung:** `requirePermission('read', 'all')`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "session-uuid",
    "title": "KI-Entwicklung Diskussion",
    "messages": [
      {
        "id": "message-uuid",
        "role": "user",
        "content": "Wie entwickelt sich KI?",
        "timestamp": "2024-01-01T12:01:00.000Z",
        "sources": []
      },
      {
        "id": "message-uuid-2",
        "role": "assistant", 
        "content": "KI entwickelt sich rasant...",
        "timestamp": "2024-01-01T12:01:30.000Z",
        "sources": [...]
      }
    ],
    "settings": { ... },
    // ... weitere Session-Daten
  }
}
```

### 13. Chat-Sessions durchsuchen

**GET** `/ai/sessions/search`

Durchsucht Chat-Sessions basierend auf verschiedenen Kriterien.

**Berechtigung:** `requirePermission('read', 'all')`

**Query-Parameter:**
- `query`: Textsuche in Titel, Beschreibung und Nachrichten
- `tags`: Tag-Filter (mehrfach möglich)
- `folder`: Ordner-Filter
- `dateFrom`: Datum von (ISO String)
- `dateTo`: Datum bis (ISO String)
- `limit`: Anzahl Ergebnisse (default: 50)
- `offset`: Offset für Paginierung (default: 0)

**PowerShell Beispiel:**
```powershell
$token = "your-jwt-token"
$headers = @{ "Authorization" = "Bearer $token" }

# Sessions mit Tag "KI" aus den letzten 7 Tagen
$searchResult = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/sessions/search?tags=KI&dateFrom=2024-01-25&limit=10" -Headers $headers

Write-Host "Gefunden: $($searchResult.data.Count) Sessions"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "session-uuid",
      "title": "KI-Entwicklung Diskussion",
      "description": "Gespräch über...",
      "tags": ["KI", "Entwicklung"],
      "folder": "Projekte",
      "messageCount": 12,
      "lastMessage": "Das sind interessante Punkte...",
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-01T15:30:00.000Z"
    }
  ],
  "message": "5 von 23 Sessions gefunden"
}
```

### 14. Chat-Session aktualisieren

**PUT** `/ai/sessions/:sessionId`

Aktualisiert Session-Metadaten (Titel, Tags, Einstellungen).

**Berechtigung:** `requirePermission('read', 'all')` (nur eigene Sessions)

**Request Body:**
```json
{
  "id": "session-uuid",
  "title": "Neuer Titel",
  "tags": ["KI", "Entwicklung", "2024"],
  "settings": {
    "useWebRag": true
  }
}
```

### 15. Chat-Session löschen

**DELETE** `/ai/sessions/:sessionId`

Löscht eine Chat-Session permanent.

**Berechtigung:** `requirePermission('read', 'all')` (nur eigene Sessions)

**Response:**
```json
{
  "success": true,
  "message": "Chat-Session erfolgreich gelöscht"
}
```

### 16. Verfügbare Tags laden

**GET** `/ai/sessions/tags`

Lädt alle verfügbaren Tags des aktuellen Benutzers.

**Berechtigung:** `requirePermission('read', 'all')`

**Response:**
```json
{
  "success": true,
  "data": [
    "KI",
    "Entwicklung",
    "Planung",
    "Support",
    "HR"
  ],
  "message": "5 verschiedene Tags gefunden"
}
```

---

## 🌐 Web-RAG Integration (NEU)

### Übersicht

Web-RAG erweitert das Standard-RAG um aktuelle Online-Informationen durch:
- **Web-Suche**: Automatische Suche über Google/Bing/DuckDuckGo
- **Website-Scraping**: Direktes Einlesen von Website-Inhalten
- **Kombinierte Quellen**: Interne Dokumente + Web-Inhalte

### Konfiguration

**Environment-Variablen:**
```bash
# In backend/.env
WEB_SEARCH_ENABLED=true
SERPER_API_KEY=your_serper_api_key_here    # Google Search
BING_API_KEY=your_bing_api_key_here        # Bing Search
```

### Verwendung im Chat

Web-RAG wird automatisch über den `/ai/chat` Endpunkt aktiviert:

```json
{
  "messages": [...],
  "webRag": true,
  "webSearchQuery": "aktuelle KI Entwicklungen 2024",
  "websiteUrl": "https://example.com/ki-artikel"
}
```

### Web-Quellen in Responses

Web-Quellen werden mit speziellen Flags markiert:

```json
{
  "sources": [
    {
      "path": "Aktuelle KI-Trends",
      "chunk": "web-1", 
      "preview": "KI-Entwicklungen zeigen...",
      "isWeb": true,
      "webUrl": "https://example.com/trends",
      "isOriginal": false
    }
  ]
}
```

### Unterstützte Web-Search-Provider

1. **Google (via Serper.dev)**
   - API-Key erforderlich
   - Beste Suchergebnisse
   - Rate-Limits beachten

2. **Bing (Microsoft)**
   - Azure Cognitive Services API
   - Gute Abdeckung
   - Enterprise-tauglich

3. **DuckDuckGo (kostenlos)**
   - Keine API-Keys nötig
   - Limitierte Ergebnisse
   - Privacy-fokussiert

### Sicherheit

- **URL-Validierung**: Nur HTTP/HTTPS erlaubt
- **Content-Length-Limit**: Max. 1MB pro Website
- **Timeout**: 10 Sekunden pro Request
- **Rate-Limiting**: Automatische Verzögerung

---

## 💾 Session-Speicherung

### Ordnerstruktur

```
RAG_EXTERNAL_DOCS_PATH/
├── chat-sessions/               # Session-Dateien (NEU)
│   ├── session-uuid-1.json
│   ├── session-uuid-2.json
│   └── session-uuid-3.json
├── originals/                   # Original-Dateien
├── markdowns/                   # RAG-Markdown  
└── rag_index.json              # RAG-Index
```

### Session-Datei Format

```json
{
  "id": "session-uuid",
  "title": "Session-Titel", 
  "description": "Beschreibung",
  "tags": ["tag1", "tag2"],
  "folder": "Ordner",
  "settings": {
    "provider": "openai",
    "model": "gpt-4o-mini", 
    "temperature": 0.2,
    "useRag": true,
    "ragTopK": 5,
    "useWebRag": false
  },
  "messages": [
    {
      "id": "message-uuid",
      "role": "user",
      "content": "Nachricht",
      "timestamp": "2024-01-01T12:00:00.000Z",
      "sources": []
    }
  ],
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T13:30:00.000Z",
  "createdBy": "user-id"
}
```

---

## 🎤 Voice Integration (NEU)

### Übersicht

Voice Integration ermöglicht nahtlose Sprach-Interaktionen durch:
- **Speech-to-Text**: Mikrofonaufnahmen zu Text konvertieren (Whisper)
- **Text-to-Speech**: AI-Antworten automatisch vorlesen (OpenAI TTS)
- **Hands-Free Experience**: Vollständig sprachbasierte Chat-Interaktion

### 17. Speech-to-Text

**POST** `/ai/voice/speech-to-text`

Konvertiert Audio-Aufnahmen zu Text mit OpenAI Whisper.

**Berechtigung:** `requirePermission('read', 'all')`

**Content-Type:** `multipart/form-data`

**Form Data:**
- `audio`: Audio-Datei (MP3, WAV, OGG, WebM, M4A, FLAC, max. 25MB)
- `language`: Sprache für Transkription (optional, default: 'de')

**PowerShell Beispiel:**
```powershell
$token = "your-jwt-token"
$headers = @{ "Authorization" = "Bearer $token" }

# Audio-Datei hochladen
$audioPath = "C:\recordings\test.mp3"
$form = @{
    audio = Get-Item $audioPath
    language = "de"
}

Invoke-RestMethod -Uri "http://localhost:5000/api/ai/voice/speech-to-text" `
    -Method POST -Headers $headers -Form $form
```

**Response:**
```json
{
  "success": true,
  "data": {
    "text": "Hallo, das ist der transkribierte Text aus der Audio-Aufnahme."
  },
  "message": "Audio erfolgreich transkribiert"
}
```

### 18. Text-to-Speech

**POST** `/ai/voice/text-to-speech`

Generiert Audio aus Text mit OpenAI TTS.

**Berechtigung:** `requirePermission('read', 'all')`

**Request Body:**
```json
{
  "text": "Text der vorgelesen werden soll",
  "voice": "alloy",
  "format": "mp3",
  "speed": 1.0
}
```

**Verfügbare Stimmen:**
- `alloy`: Neutral und ausgewogen
- `echo`: Männliche Stimme
- `fable`: Britischer Akzent
- `onyx`: Tiefe männliche Stimme
- `nova`: Weibliche Stimme
- `shimmer`: Weiche weibliche Stimme

**Response:**
```json
{
  "success": true,
  "data": {
    "audioUrl": "/api/ai/voice/audio/tts_1704067200000.mp3",
    "duration": 12
  },
  "message": "Audio erfolgreich generiert"
}
```

### 19. Audio-Datei herunterladen

**GET** `/ai/voice/audio/:filename`

Lädt generierte Audio-Dateien herunter.

**Berechtigung:** `requirePermission('read', 'all')`

**Parameter:**
- `filename`: Audio-Dateiname aus TTS-Response

**Response:** Audio-Stream (MP3/WAV/OGG)

### 20. Voice-Cleanup

**POST** `/ai/voice/cleanup`

Entfernt alte Audio-Dateien (älter als 24h).

**Berechtigung:** `requirePermission('admin', 'all')`

**Response:**
```json
{
  "success": true,
  "data": {
    "removed": 5
  },
  "message": "5 alte Audio-Dateien entfernt"
}
```

---

## 🔍 Hybrid RAG Search (NEU)

### Übersicht

Hybrid RAG Search kombiniert mehrere Suchalgorithmen für bessere Ergebnisse:
- **Vector Similarity**: Semantische Ähnlichkeit über Embeddings
- **BM25 Scoring**: Keyword-basierte Relevanzbewertung
- **Hybrid Fusion**: Gewichtete Kombination beider Methoden
- **Performance Analytics**: Vergleich der Suchmethoden

### Konfiguration

**Environment-Variablen:**
```bash
# In backend/.env
HYBRID_RAG_ENABLED=true  # Aktiviert Hybrid-Suche
```

### 21. Hybrid RAG Statistiken

**GET** `/ai/rag/hybrid/stats`

Lädt Statistiken über die Hybrid-Suche.

**Berechtigung:** `requirePermission('read', 'all')`

**Response:**
```json
{
  "success": true,
  "data": {
    "chunksTotal": 1250,
    "avgChunkLength": 180,
    "uniqueTokens": 15420,
    "topTokens": [
      {"token": "entwicklung", "frequency": 245},
      {"token": "system", "frequency": 198},
      {"token": "benutzer", "frequency": 156}
    ]
  },
  "message": "Hybrid RAG Statistiken geladen"
}
```

### 22. Search-Methods Vergleich

**POST** `/ai/rag/hybrid/compare`

Vergleicht verschiedene Suchmethoden für eine Query.

**Berechtigung:** `requirePermission('read', 'all')`

**Request Body:**
```json
{
  "query": "künstliche Intelligenz machine learning",
  "topK": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "künstliche Intelligenz machine learning",
    "comparison": {
      "vectorOnly": {
        "chunks": [...],
        "duration": 45
      },
      "bm25Only": {
        "chunks": [...], 
        "duration": 23
      },
      "hybrid": {
        "chunks": [...],
        "duration": 67
      }
    },
    "summary": {
      "vectorOnlyCount": 5,
      "bm25OnlyCount": 5,
      "hybridCount": 5,
      "performance": {
        "vectorDuration": 45,
        "bm25Duration": 23,
        "hybridDuration": 67,
        "hybridOverhead": 22
      }
    }
  },
  "message": "Search-Methods-Vergleich für \"künstliche Intelligenz machine learning\" abgeschlossen"
}
```

### Hybrid Search Gewichtung

**Standard-Konfiguration:**
- Vector Similarity: **70%** (semantische Bedeutung)
- BM25 Keyword: **30%** (exakte Begriffe)
- Minimum Threshold: **0.05** (Relevanz-Schwellenwert)

**Automatische Features:**
- **Query Expansion**: Synonyme und Variationen hinzufügen
- **Token Normalization**: Deutsche Umlaute und Stoppwörter
- **Fallback Strategie**: Bei Fehlern automatisch auf Vector-only

---

## 💾 Voice & Hybrid Storage

### Ordnerstruktur (Erweitert)

```
RAG_EXTERNAL_DOCS_PATH/
├── chat-sessions/              # Chat-Sessions (JSON)
├── voice-uploads/              # Audio-Dateien (NEU)
│   ├── tts_1704067200000.mp3  # Generierte TTS-Dateien
│   ├── temp_recording_xyz.webm # Temporäre STT-Aufnahmen
│   └── ...
├── originals/                  # Original-Dateien
├── markdowns/                  # RAG-Markdown
└── rag_index.json             # RAG-Index (mit Hybrid-Metriken)
```

### Voice-Features Integration

**Frontend Integration:**
- 🎤 **Mikrofonaufnahme**: Browser MediaRecorder API
- 🔊 **Audio-Playback**: Automatisches TTS für AI-Antworten
- 📝 **Speech-to-Text**: Aufnahme zu Text-Input konvertieren
- 🎛️ **Voice Controls**: Stimme wählen, Auto-TTS konfigurieren

**Sicherheit:**
- **Audio-Cleanup**: Automatische Bereinigung alter Dateien (24h)
- **File-Size-Limits**: Max. 25MB pro Audio-Datei
- **Format-Validation**: Nur unterstützte Audio-Formate
- **User-Isolation**: Audio-Dateien pro User getrennt

---

## 🧪 PowerShell Voice & Hybrid Tests

### Voice + Hybrid RAG Test:
```powershell
# 1. Token setzen
$token = "your-jwt-token-here"
$headers = @{ "Authorization" = "Bearer $token" }

# 2. Text-to-Speech testen
$ttsData = @{
    text = "CompanyAI unterstützt jetzt Speech-to-Text und Text-to-Speech"
    voice = "nova"
    format = "mp3"
} | ConvertTo-Json

$ttsResult = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/voice/text-to-speech" `
    -Method POST -Headers $headers -Body $ttsData -ContentType "application/json"

Write-Host "TTS Audio-URL: $($ttsResult.data.audioUrl)"

# 3. Hybrid RAG Statistiken
$hybridStats = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/rag/hybrid/stats" -Headers $headers
Write-Host "Hybrid RAG Chunks: $($hybridStats.data.chunksTotal)"
Write-Host "Unique Tokens: $($hybridStats.data.uniqueTokens)"

# 4. Search-Methods Vergleich
$compareData = @{
    query = "künstliche Intelligenz entwicklung"
    topK = 3
} | ConvertTo-Json

$compareResult = Invoke-RestMethod -Uri "http://localhost:5000/api/ai/rag/hybrid/compare" `
    -Method POST -Headers $headers -Body $compareData -ContentType "application/json"

Write-Host "Vector Search: $($compareResult.data.summary.performance.vectorDuration)ms"
Write-Host "BM25 Search: $($compareResult.data.summary.performance.bm25Duration)ms"  
Write-Host "Hybrid Search: $($compareResult.data.summary.performance.hybridDuration)ms"
```