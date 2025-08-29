// AI Module - File Upload Functions
// Erweiterte RAG-Funktionalität für Original-Dateien + Markdown-Konvertierung

import fs from 'fs';
import path from 'path';
import multer from 'multer';
import type { Result as MammothResult } from 'mammoth';

// Externe Ordner-Konfiguration (neue Struktur)
const RAG_EXTERNAL_DOCS_PATH = process.env.RAG_EXTERNAL_DOCS_PATH;
const DOCS_DIR = RAG_EXTERNAL_DOCS_PATH ? path.resolve(RAG_EXTERNAL_DOCS_PATH) : path.resolve(process.cwd(), 'docs');
const ORIGINALS_DIR = path.resolve(DOCS_DIR, 'originals');
const MARKDOWNS_DIR = path.resolve(DOCS_DIR, 'markdowns');

interface FileUploadResult {
  originalFile: string;
  markdownFile: string;
  relativePaths: {
    original: string;
    markdown: string;
  };
  isExternal: boolean;
  extractedText: string;
}

/**
 * Text aus verschiedenen Dateiformaten extrahieren
 */
export function extractTextFromFile(filename: string, content: Buffer): string {
  const extension = path.extname(filename).toLowerCase();
  const maxPreviewLength = 5000; // Begrenzen für RAG
  
  try {
    switch (extension) {
      case '.txt':
      case '.md':
      case '.markdown':
        return content.toString('utf-8').substring(0, maxPreviewLength);
      
      case '.json':
        try {
          const jsonData = JSON.parse(content.toString('utf-8'));
          return JSON.stringify(jsonData, null, 2).substring(0, maxPreviewLength);
        } catch {
          return content.toString('utf-8').substring(0, maxPreviewLength);
        }
      
      case '.csv':
        // CSV als Tabelle darstellen
        const csvText = content.toString('utf-8');
        const lines = csvText.split('\n').slice(0, 100); // Max 100 Zeilen
        return lines.join('\n').substring(0, maxPreviewLength);
      
      case '.html':
      case '.htm':
        // HTML Tags entfernen (basic)
        const htmlText = content.toString('utf-8');
        const cleaned = htmlText
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        return cleaned.substring(0, maxPreviewLength);
      
      case '.xml':
        // XML strukturiert anzeigen
        return content.toString('utf-8').substring(0, maxPreviewLength);
      
      case '.log':
        // Log-Dateien: Letzte Einträge zeigen
        const logText = content.toString('utf-8');
        const logLines = logText.split('\n').slice(-200); // Letzte 200 Zeilen
        return logLines.join('\n').substring(0, maxPreviewLength);
      
      case '.sql':
        // SQL-Dateien
        return content.toString('utf-8').substring(0, maxPreviewLength);
      
      case '.yaml':
      case '.yml':
        // YAML-Dateien
        return content.toString('utf-8').substring(0, maxPreviewLength);
      
      case '.ini':
      case '.cfg':
      case '.conf':
        // Konfigurations-Dateien
        return content.toString('utf-8').substring(0, maxPreviewLength);
      
      default:
        // Für andere Formate: Versuche als UTF-8 Text zu lesen
        try {
          const text = content.toString('utf-8');
          // Prüfe ob es lesbarer Text ist (nicht binär)
          const sample = text.substring(0, 100);
          const nonPrintableChars = (sample.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length;
          
          if (nonPrintableChars / sample.length < 0.3) { // Weniger als 30% non-printable
            return text.substring(0, maxPreviewLength);
          } else {
            return createBinaryFileMessage(filename, content.length);
          }
        } catch {
          return createBinaryFileMessage(filename, content.length);
        }
    }
  } catch (error) {
    console.error(`Fehler beim Extrahieren von ${filename}:`, error);
    return `[Fehler beim Lesen der Datei: ${filename}]\n\nFehler: ${error}\n\nSie können die Originaldatei über den Download-Link öffnen.`;
  }
}

/**
 * Asynchrone Extraktion für Binärformate (PDF/DOCX)
 */
export async function extractTextFromBinaryAsync(filename: string, content: Buffer): Promise<string | null> {
  const extension = path.extname(filename).toLowerCase();
  try {
    if (extension === '.docx') {
      // Lazy import to avoid optional dep cost when unused
      const mammoth = await import('mammoth');
      const result: MammothResult = await mammoth.extractRawText({ buffer: content });
      return (result.value || '').trim();
    }
    if (extension === '.pdf') {
      const pdfParse = (await import('pdf-parse')).default as (data: Buffer) => Promise<{ text: string }>;
      const parsed = await pdfParse(content);
      return (parsed.text || '').trim();
    }
    return null;
  } catch (err) {
    console.warn(`Binary extraction failed for ${filename}:`, err);
    return null;
  }
}

/**
 * Nachricht für Binärdateien erstellen
 */
function createBinaryFileMessage(filename: string, size: number): string {
  const sizeKB = Math.round(size / 1024);
  const extension = path.extname(filename).toLowerCase();
  
  let fileTypeDescription = 'Datei';
  if (['.pdf'].includes(extension)) fileTypeDescription = 'PDF-Dokument';
  else if (['.doc', '.docx'].includes(extension)) fileTypeDescription = 'Word-Dokument';
  else if (['.xls', '.xlsx'].includes(extension)) fileTypeDescription = 'Excel-Tabelle';
  else if (['.ppt', '.pptx'].includes(extension)) fileTypeDescription = 'PowerPoint-Präsentation';
  else if (['.jpg', '.jpeg', '.png', '.gif', '.bmp'].includes(extension)) fileTypeDescription = 'Bild-Datei';
  else if (['.mp4', '.avi', '.mkv', '.mov'].includes(extension)) fileTypeDescription = 'Video-Datei';
  else if (['.mp3', '.wav', '.flac'].includes(extension)) fileTypeDescription = 'Audio-Datei';
  else if (['.zip', '.rar', '.7z'].includes(extension)) fileTypeDescription = 'Archive';
  
  return `[${fileTypeDescription}: ${filename}]\n\n**Dateigröße:** ${sizeKB} KB\n**Format:** ${extension.toUpperCase()}\n\nDiese Datei ist eine Binärdatei und kann nicht als Text angezeigt werden.\n\n**→ Verwenden Sie den Download-Link um die Originaldatei zu öffnen.**\n\n*Hinweis: Für eine bessere RAG-Integration empfehlen wir, PDF-Dokumente in Markdown zu konvertieren oder den Text zu extrahieren.*`;
}

/**
 * Ordner für externe Speicherung sicherstellen
 */
function ensureUploadDirs() {
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      console.log(`Erstelle externen Hauptordner: ${DOCS_DIR}`);
      fs.mkdirSync(DOCS_DIR, { recursive: true });
    }
    if (!fs.existsSync(ORIGINALS_DIR)) {
      console.log(`Erstelle Originaldateien-Ordner: ${ORIGINALS_DIR}`);
      fs.mkdirSync(ORIGINALS_DIR, { recursive: true });
    }
    if (!fs.existsSync(MARKDOWNS_DIR)) {
      console.log(`Erstelle Markdowns-Ordner: ${MARKDOWNS_DIR}`);
      fs.mkdirSync(MARKDOWNS_DIR, { recursive: true });
    }
  } catch (error) {
    console.error('Fehler beim Erstellen der Upload-Ordner:', error);
    throw new Error(`Upload-Ordner konnten nicht erstellt werden: ${error}`);
  }
}

/**
 * Dateiname für Speicherung normalisieren
 */
function normalizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[äöüß]/g, (match) => ({ 'ä': 'ae', 'ö': 'oe', 'ü': 'ue', 'ß': 'ss' }[match] || match))
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50); // Max 50 Zeichen
}

/**
 * Original-Datei + Markdown speichern
 */
export async function addOriginalFile(
  originalName: string, 
  originalContent: Buffer
): Promise<FileUploadResult> {
  ensureUploadDirs();

  const normalizedName = normalizeFilename(path.parse(originalName).name);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const originalExtension = path.extname(originalName);
  
  // Originaldatei speichern
  const originalFilename = `${normalizedName}-${ts}${originalExtension}`;
  const originalPath = path.join(ORIGINALS_DIR, originalFilename);
  fs.writeFileSync(originalPath, originalContent);
  
  // Text extrahieren (bevorzugt asynchron für Binärformate)
  let extractedText = extractTextFromFile(originalName, originalContent);
  if (/\.(pdf|docx)$/i.test(originalName)) {
    const asyncText = await extractTextFromBinaryAsync(originalName, originalContent);
    if (asyncText && asyncText.length > 0) {
      extractedText = asyncText.substring(0, 5000);
    }
  }
  
  // Markdown-Version für RAG erstellen (in markdowns Ordner)
  const markdownFilename = `${normalizedName}-${ts}.md`;
  const markdownPath = path.join(MARKDOWNS_DIR, markdownFilename);
  
  const fileSize = Math.round(originalContent.length / 1024);
  const downloadUrl = `/api/ai/rag/download/original/${originalFilename}`;
  
  const markdownContent = `# ${path.parse(originalName).name}

**Originaldatei:** ${originalName}  
**Dateigröße:** ${fileSize} KB  
**Format:** ${path.extname(originalName).toUpperCase()}  
**Hochgeladen:** ${new Date().toLocaleString()}  
**Download:** [📁 ${originalName} herunterladen](${downloadUrl})

---

## Inhalt

${extractedText}

---

*Automatisch extrahiert und für RAG-System konvertiert.*`;

  fs.writeFileSync(markdownPath, markdownContent, 'utf-8');
  
  console.log(`✅ Original gespeichert: ${originalPath}`);
  console.log(`✅ Markdown erstellt: ${markdownPath}`);
  
  return {
    originalFile: originalPath,
    markdownFile: markdownPath,
    relativePaths: {
      original: path.relative(DOCS_DIR, originalPath),
      markdown: path.relative(DOCS_DIR, markdownPath)
    },
    isExternal: !!RAG_EXTERNAL_DOCS_PATH,
    extractedText: extractedText.substring(0, 500) + '...' // Preview
  };
}

/**
 * Wartung: Alle Originale erneut nach Markdown konvertieren
 */
export async function rebuildMarkdownsFromOriginals(): Promise<{ processed: number; errors: number }> {
  ensureUploadDirs();
  let processed = 0; let errors = 0;
  const files = fs.readdirSync(ORIGINALS_DIR).filter(f => !f.startsWith('.'));
  for (const filename of files) {
    try {
      const originalPath = path.join(ORIGINALS_DIR, filename);
      const buf = fs.readFileSync(originalPath);
      const base = path.parse(filename).name; // normalizedName-ISO
      const markdownFilename = `${base}.md`;
      const markdownPath = path.join(MARKDOWNS_DIR, markdownFilename);

      // Extrahieren
      let extractedText = extractTextFromFile(filename, buf);
      const asyncText = await extractTextFromBinaryAsync(filename, buf);
      if (asyncText && asyncText.length > 0) extractedText = asyncText.substring(0, 5000);

      const downloadUrl = `/api/ai/rag/download/original/${filename}`;
      const markdownContent = `# ${path.parse(filename).name}

**Originaldatei:** ${filename}  
**Dateigröße:** ${Math.round(buf.length / 1024)} KB  
**Format:** ${path.extname(filename).toUpperCase()}  
**Download:** [📁 ${filename} herunterladen](${downloadUrl})

---

## Inhalt

${extractedText}

---

*Automatisch extrahiert und für RAG-System konvertiert.*`;

      fs.writeFileSync(markdownPath, markdownContent, 'utf-8');
      processed++;
    } catch (e) {
      console.warn('Rebuild markdown failed for', filename, e);
      errors++;
    }
  }
  return { processed, errors };
}

/**
 * Multer Storage Konfiguration für temporären Upload
 */
export const fileUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(process.cwd(), 'temp-uploads');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const normalized = normalizeFilename(file.originalname);
    cb(null, `temp-${timestamp}-${normalized}`);
  }
});

/**
 * Multer-Instanz konfigurieren
 */
export const upload = multer({ 
  storage: fileUploadStorage,
  limits: { 
    fileSize: 25 * 1024 * 1024, // 25MB Maximum
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Alle Dateitypen erlauben, aber große Archive warnen
    const extension = path.extname(file.originalname).toLowerCase();
    const restrictedExts = ['.exe', '.bat', '.sh', '.ps1', '.scr'];
    
    if (restrictedExts.includes(extension)) {
      cb(new Error(`Dateityp ${extension} ist nicht erlaubt`));
    } else {
      cb(null, true);
    }
  }
});

/**
 * Original-Dateien auflisten
 */
export function listOriginalFiles(): Array<{ 
  filename: string; 
  originalName: string;
  size: number; 
  uploadedAt: string;
  downloadUrl: string;
  markdownFile?: string;
}> {
  if (!fs.existsSync(ORIGINALS_DIR)) {
    return [];
  }
  
  try {
    const files = fs.readdirSync(ORIGINALS_DIR, { withFileTypes: true });
    return files
      .filter(entry => entry.isFile())
      .map(entry => {
        const fullPath = path.join(ORIGINALS_DIR, entry.name);
        const stats = fs.statSync(fullPath);
        
        // Originalname aus Filename extrahieren
        const originalName = entry.name.replace(/-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/, '');
        
        return {
          filename: entry.name,
          originalName: originalName,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString(),
          downloadUrl: `/api/ai/rag/download/original/${entry.name}`,
          markdownFile: entry.name.replace(path.extname(entry.name), '.md')
        };
      })
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  } catch (error) {
    console.error('Fehler beim Auflisten der Original-Dateien:', error);
    return [];
  }
}

/**
 * Original-Datei löschen (+ zugehörige Markdown)
 */
export function deleteOriginalFile(filename: string): boolean {
  try {
    const originalPath = path.join(ORIGINALS_DIR, filename);
    const markdownFilename = filename.replace(path.extname(filename), '.md');
    const markdownPath = path.join(MARKDOWNS_DIR, markdownFilename);
    
    let deleted = false;
    
    if (fs.existsSync(originalPath)) {
      fs.unlinkSync(originalPath);
      deleted = true;
    }
    
    if (fs.existsSync(markdownPath)) {
      fs.unlinkSync(markdownPath);
    }
    
    return deleted;
  } catch (error) {
    console.error(`Fehler beim Löschen von ${filename}:`, error);
    return false;
  }
}
