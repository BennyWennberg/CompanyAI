// HR Module - Document Management Function
// Verwaltet HR-Dokumente mit externer Ordnerstruktur

import { 
  APIResponse, 
  HRDocument, 
  UploadDocumentRequest 
} from '../types';
import { CombinedUser } from '../../../datasources/entraac/combined';
import fs from 'fs';
import path from 'path';
import { getCombinedUsers } from '../../../datasources';
import { getEmployeeAdditionalInfo } from './manageUserValues';

// Externe Ordnerstruktur: C:\Code\Company_Allg_Data\HR_Module
const HR_DATA_PATH = 'C:\\Code\\Company_Allg_Data\\HR_Module';

/**
 * Dokument-Kategorien für automatische Erkennung
 */
const DOCUMENT_CATEGORIES = [
  'Arbeitsverträge',
  'Zeugnisse', 
  'Gehaltsabrechnungen',
  'Urlaubsanträge',
  'Fortbildungen',
  'Personalakte',
  'Sonstiges'
];

/**
 * Lädt alle Dokumente eines Mitarbeiters
 */
export async function getEmployeeDocuments(
  employeeId: string
): Promise<APIResponse<HRDocument[]>> {
  try {
    console.log(`📋 Lade Dokumente für Employee ${employeeId}...`);

    // User-Daten holen für Ordnername
    const userResult = await getCombinedUsers();
    
    const employee = userResult.find((u: CombinedUser) => u.id === employeeId);
    if (!employee) {
      return {
        success: false,
        error: 'UserNotFound', 
        message: 'Mitarbeiter nicht gefunden'
      };
    }

    const userFolderName = generateUserFolderName(employee);
    const userPath = path.join(HR_DATA_PATH, userFolderName);
    const documentsPath = path.join(userPath, 'Documents');

    // Prüfe ob Documents-Ordner existiert
    if (!fs.existsSync(documentsPath)) {
      return {
        success: true,
        data: [],
        message: 'Noch keine Dokumente vorhanden'
      };
    }

    const documents: HRDocument[] = [];
    
    // BACKWARD COMPATIBILITY: Unterstütze beide Strukturen
    if (fs.existsSync(documentsPath)) {
      
      // 1. Prüfe neue Struktur: Dateien direkt in Documents/
      const items = fs.readdirSync(documentsPath);
      
      for (const item of items) {
        const itemPath = path.join(documentsPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isFile()) {
          // NEUE Struktur: Datei direkt in Documents/
          const fileCategory = detectCategoryFromFileName(item);
          
          const document: HRDocument = {
            id: `doc_${item}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
            fileName: item,
            category: fileCategory,
            fileType: path.extname(item).substring(1).toLowerCase(),
            fileSize: formatFileSize(stats.size),
            uploadDate: stats.birthtime,
            filePath: itemPath,
            employeeId: employeeId
          };
          
          documents.push(document);
          
        } else if (stats.isDirectory() && DOCUMENT_CATEGORIES.includes(item)) {
          // ALTE Struktur: Kategorie-Ordner mit Originaldatei/
          const categoryPath = path.join(documentsPath, item);
          const originaldateiPath = path.join(categoryPath, 'Originaldatei');
          
          if (fs.existsSync(originaldateiPath)) {
            const files = fs.readdirSync(originaldateiPath);
            
            for (const fileName of files) {
              const filePath = path.join(originaldateiPath, fileName);
              const fileStats = fs.statSync(filePath);
              
              if (fileStats.isFile()) {
                const document: HRDocument = {
                  id: `${item}_${fileName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
                  fileName: fileName,
                  category: item,
                  fileType: path.extname(fileName).substring(1).toLowerCase(),
                  fileSize: formatFileSize(fileStats.size),
                  uploadDate: fileStats.birthtime,
                  filePath: filePath,
                  employeeId: employeeId
                };
                
                documents.push(document);
              }
            }
          }
        }
      }
    }

    // Sortierung: neueste zuerst
    documents.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());

    return {
      success: true,
      data: documents,
      message: `${documents.length} Dokumente gefunden`
    };

  } catch (error) {
    console.error('❌ Fehler beim Laden der Dokumente:', error);
    return {
      success: false,
      error: 'DocumentsLoadError',
      message: 'Dokumente konnten nicht geladen werden'
    };
  }
}

/**
 * Lädt Dokument-Datei für Download
 */
export async function downloadEmployeeDocument(
  employeeId: string,
  documentId: string
): Promise<APIResponse<Buffer>> {
  try {
    console.log(`📥 Download Dokument ${documentId} für Employee ${employeeId}...`);

    // Hole Dokument-Info
    const documentsResult = await getEmployeeDocuments(employeeId);
    if (!documentsResult.success || !documentsResult.data) {
      return documentsResult as any;
    }

    const document = documentsResult.data.find(d => d.id === documentId);
    if (!document) {
      return {
        success: false,
        error: 'DocumentNotFound',
        message: 'Dokument nicht gefunden'
      };
    }

    // Datei lesen
    const fileBuffer = fs.readFileSync(document.filePath);

    return {
      success: true,
      data: fileBuffer,
      message: 'Dokument erfolgreich geladen'
    };

  } catch (error) {
    console.error('❌ Fehler beim Download:', error);
    return {
      success: false,
      error: 'DocumentDownloadError', 
      message: 'Download fehlgeschlagen'
    };
  }
}

/**
 * Löscht Dokument (Original + Markdown)
 */
export async function deleteEmployeeDocument(
  employeeId: string,
  documentId: string
): Promise<APIResponse<boolean>> {
  try {
    console.log(`🗑️ Lösche Dokument ${documentId} für Employee ${employeeId}...`);

    // Hole Dokument-Info
    const documentsResult = await getEmployeeDocuments(employeeId);
    if (!documentsResult.success || !documentsResult.data) {
      return documentsResult as any;
    }

    const document = documentsResult.data.find(d => d.id === documentId);
    if (!document) {
      return {
        success: false,
        error: 'DocumentNotFound',
        message: 'Dokument nicht gefunden'
      };
    }

    // Original-Datei löschen
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Markdown-Datei löschen (BACKWARD COMPATIBILITY)
    let markdownPath: string;
    
    if (document.filePath.includes('Originaldatei')) {
      // ALTE Struktur: .../Documents/Kategorie/Originaldatei/file.pdf → .../Documents/Kategorie/Markdown/file.md
      markdownPath = document.filePath.replace('Originaldatei', 'Markdown').replace(path.extname(document.filePath), '.md');
    } else {
      // NEUE Struktur: .../Documents/file.pdf → .../Markdowns/file.md
      const userPath = path.dirname(path.dirname(document.filePath)); // User-Ordner
      markdownPath = path.join(userPath, 'Markdowns', path.basename(document.filePath, path.extname(document.filePath)) + '.md');
    }
    
    if (fs.existsSync(markdownPath)) {
      fs.unlinkSync(markdownPath);
      console.log(`📝 Markdown-Datei gelöscht: ${markdownPath}`);
    }

    return {
      success: true,
      data: true,
      message: 'Dokument erfolgreich gelöscht'
    };

  } catch (error) {
    console.error('❌ Fehler beim Löschen:', error);
    return {
      success: false,
      error: 'DocumentDeleteError',
      message: 'Dokument konnte nicht gelöscht werden'
    };
  }
}

/**
 * Lädt Dokument hoch und speichert in externer Ordnerstruktur
 */
export async function uploadEmployeeDocument(
  request: UploadDocumentRequest
): Promise<APIResponse<HRDocument>> {
  try {
    console.log(`📤 Upload Dokument für Employee ${request.employeeId}...`);

    // User-Daten holen
    const userResult = await getCombinedUsers();
    
    const employee = userResult.find((u: CombinedUser) => u.id === request.employeeId);
    if (!employee) {
      return {
        success: false,
        error: 'UserNotFound',
        message: 'Mitarbeiter nicht gefunden'
      };
    }

    // Ordnerstruktur erstellen
    const setupResult = await setupEmployeeDirectory(employee);
    if (!setupResult.success) {
      return setupResult as any;
    }

    const userFolderName = generateUserFolderName(employee);
    const userPath = path.join(HR_DATA_PATH, userFolderName);
    const documentsPath = path.join(userPath, 'Documents');

    // Datei direkt in Documents/ speichern (keine Kategorie-Unterordner)
    const fileName = request.fileName;
    const filePath = path.join(documentsPath, fileName);
    
    fs.writeFileSync(filePath, request.fileBuffer);

    // user_details.txt aktualisieren
    await updateUserDetailsFile(employee);

    const stats = fs.statSync(filePath);
    const document: HRDocument = {
      id: `${request.category}_${fileName}`.replace(/[^a-zA-Z0-9_-]/g, '_'),
      fileName: fileName,
      category: request.category,
      fileType: path.extname(fileName).substring(1).toLowerCase(),
      fileSize: formatFileSize(stats.size),
      uploadDate: stats.birthtime,
      filePath: filePath,
      employeeId: request.employeeId
    };

    return {
      success: true,
      data: document,
      message: `Dokument "${fileName}" erfolgreich hochgeladen`
    };

  } catch (error) {
    console.error('❌ Fehler beim Upload:', error);
    return {
      success: false,
      error: 'DocumentUploadError',
      message: 'Upload fehlgeschlagen'
    };
  }
}

/**
 * Erstellt Ordnerstruktur für Mitarbeiter
 */
async function setupEmployeeDirectory(employee: CombinedUser): Promise<APIResponse<boolean>> {
  try {
    const userFolderName = generateUserFolderName(employee);
    const userPath = path.join(HR_DATA_PATH, userFolderName);
    const documentsPath = path.join(userPath, 'Documents');
    const markdownsPath = path.join(userPath, 'Markdowns');

    // Hauptordner erstellen
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
      console.log(`📁 User-Ordner automatisch erstellt: ${userPath}`);
    }

    // Documents-Ordner erstellen (direkt, ohne Kategorien)
    if (!fs.existsSync(documentsPath)) {
      fs.mkdirSync(documentsPath, { recursive: true });
      console.log(`📂 Documents-Ordner automatisch erstellt: ${documentsPath}`);
    }

    // Markdowns-Ordner erstellen (für RAG)
    if (!fs.existsSync(markdownsPath)) {
      fs.mkdirSync(markdownsPath, { recursive: true });
      console.log(`📝 Markdowns-Ordner automatisch erstellt: ${markdownsPath}`);
    }

    // user_details.txt automatisch erstellen/aktualisieren
    await updateUserDetailsFile(employee);

    return {
      success: true,
      data: true,
      message: 'Ordnerstruktur automatisch erstellt'
    };

  } catch (error) {
    console.error('❌ Fehler beim automatischen Erstellen der Ordnerstruktur:', error);
    return {
      success: false,
      error: 'DirectorySetupError',
      message: 'Ordnerstruktur konnte nicht erstellt werden'
    };
  }
}

/**
 * Aktualisiert user_details.txt mit Organisation-Daten aus Tab 2/3 UND Schema-basierten Zusatzinformationen
 */
export async function updateUserDetailsFile(employee: CombinedUser): Promise<void> {
  try {
    const userFolderName = generateUserFolderName(employee);
    const userPath = path.join(HR_DATA_PATH, userFolderName);
    const detailsPath = path.join(userPath, 'user_details.txt');

    // Schema-basierte Zusatzinformationen laden
    let additionalInfoSection = '\n=== ZUSATZINFORMATIONEN ===\n';
    
    try {
      const { getEmployeeAdditionalInfo } = await import('./manageUserValues');
      const additionalInfoResult = await getEmployeeAdditionalInfo(employee.id);
      
      if (additionalInfoResult.success && additionalInfoResult.data) {
        const fieldsWithValues = additionalInfoResult.data.filter(field => field.hasValue);
        
        if (fieldsWithValues.length > 0) {
          const formattedFields = fieldsWithValues.map(field => {
            let displayValue = field.value || 'Nicht gesetzt';
            
            // Formatierung je nach Typ
            if (field.schema.type === 'boolean') {
              displayValue = field.value === 'true' ? '✅ Ja' : '❌ Nein';
            } else if (field.schema.type === 'number' && field.schema.unit) {
              displayValue = `${field.value} ${field.schema.unit}`;
            } else if (field.schema.type === 'date' && field.value) {
              try {
                const date = new Date(field.value);
                displayValue = date.toLocaleDateString('de-DE');
              } catch {
                displayValue = field.value;
              }
            }
            
            return `${field.schema.name}: ${displayValue} (${field.schema.category})`;
          });
          
          additionalInfoSection += formattedFields.join('\n') + '\n';
        } else {
          additionalInfoSection += 'Keine Werte gesetzt\n';
        }
      } else {
        additionalInfoSection += 'Keine Werte gesetzt\n';
      }
    } catch (error) {
      console.error('Fehler beim Laden der Zusatzinformationen:', error);
      additionalInfoSection += 'Fehler beim Laden der Zusatzinformationen\n';
    }

    const userDetails = `=== MITARBEITER-DETAILS ===
Mitarbeiter: ${employee.displayName}
E-Mail: ${employee.mail || employee.userPrincipalName || '-'}
Abteilung: ${employee.department || '-'}
Position: ${employee.jobTitle || '-'}
Kostenstelle: ${(employee as any).costCenter || '-'}
Vorgesetzter: ${(employee as any).manager?.displayName || '-'}
Unternehmen: ${(employee as any).companyName || '-'}
Büro/Standort: ${(employee as any).officeLocation || '-'}
Geschäftsbereich: ${(employee as any).division || '-'}
Anstellungsart: ${(employee as any).employeeType || '-'}
Status: ${employee.accountEnabled ? 'Aktiv' : 'Inaktiv'}
Mitarbeiter-ID: ${(employee as any).employeeId || '-'}
Benutzertyp: ${(employee as any).userType || '-'}
Letzte Aktualisierung: ${new Date().toISOString()}
Quelle: ${employee.source}

${additionalInfoSection}
=== SYSTEM-INFORMATIONEN ===
Erstellungsdatum: ${(employee as any).createdDateTime || 'Unbekannt'}
Letzte Anmeldung: ${(employee as any).signInActivity?.lastSignInDateTime || 'Unbekannt'}

=== DOKUMENTE ===
(Dokumente werden automatisch aus dem Documents-Ordner geladen)

=== NOTIZEN ===
(Hier können manuelle Notizen hinzugefügt werden)
`;

    fs.writeFileSync(detailsPath, userDetails, 'utf8');
    console.log(`✅ user_details.txt aktualisiert: ${detailsPath}`);

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der user_details.txt:', error);
  }
}

/**
 * Generiert Ordnername basierend auf displayName (Spaces → _)
 */
function generateUserFolderName(employee: CombinedUser): string {
  return employee.displayName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Erkennt Kategorie aus Dateinamen (automatisch)
 */
function detectCategoryFromFileName(fileName: string): string {
  const name = fileName.toLowerCase();
  
  if (name.includes('vertrag') || name.includes('contract')) return 'Arbeitsverträge';
  if (name.includes('zeugnis') || name.includes('certificate')) return 'Zeugnisse';
  if (name.includes('gehalt') || name.includes('salary') || name.includes('lohn')) return 'Gehaltsabrechnungen';
  if (name.includes('urlaub') || name.includes('vacation') || name.includes('leave')) return 'Urlaubsanträge';
  if (name.includes('fortbildung') || name.includes('training') || name.includes('kurs')) return 'Fortbildungen';
  if (name.includes('akte') || name.includes('personal')) return 'Personalakte';
  
  return 'Sonstiges';
}

/**
 * Formatiert Dateigröße lesbar
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Prüft verfügbaren Speicherplatz für HR-Dokumente
 */
export async function getHRStorageStats(): Promise<APIResponse<{
  totalSpace: string;
  usedSpace: string;
  freeSpace: string;
  userCount: number;
  documentCount: number;
}>> {
  try {
    console.log('📊 Berechne HR-Speicher-Statistiken...');

    if (!fs.existsSync(HR_DATA_PATH)) {
      return {
        success: true,
        data: {
          totalSpace: 'Unbekannt',
          usedSpace: '0 B',
          freeSpace: 'Unbekannt',
          userCount: 0,
          documentCount: 0
        },
        message: 'HR-Datenordner noch nicht erstellt'
      };
    }

    // Berechne verwendeten Speicher
    let totalSize = 0;
    let documentCount = 0;
    let userCount = 0;

    const userDirs = fs.readdirSync(HR_DATA_PATH);
    
    for (const userDir of userDirs) {
      const userPath = path.join(HR_DATA_PATH, userDir);
      
      if (fs.statSync(userPath).isDirectory()) {
        userCount++;
        const documentsPath = path.join(userPath, 'Documents');
        
        if (fs.existsSync(documentsPath)) {
          const size = calculateDirectorySize(documentsPath);
          totalSize += size.bytes;
          documentCount += size.fileCount;
        }
      }
    }

    return {
      success: true,
      data: {
        totalSpace: 'Unbekannt', // TODO: Disk-Space ermitteln
        usedSpace: formatFileSize(totalSize),
        freeSpace: 'Unbekannt',
        userCount: userCount,
        documentCount: documentCount
      },
      message: 'Speicher-Statistiken berechnet'
    };

  } catch (error) {
    console.error('❌ Fehler bei Speicher-Statistiken:', error);
    return {
      success: false,
      error: 'StorageStatsError',
      message: 'Speicher-Statistiken konnten nicht berechnet werden'
    };
  }
}

/**
 * Berechnet Ordnergröße rekursiv
 */
function calculateDirectorySize(dirPath: string): { bytes: number; fileCount: number } {
  let totalSize = 0;
  let fileCount = 0;

  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        const subResult = calculateDirectorySize(itemPath);
        totalSize += subResult.bytes;
        fileCount += subResult.fileCount;
      } else {
        totalSize += stats.size;
        fileCount++;
      }
    }
  } catch (error) {
    console.error(`Fehler beim Berechnen der Ordnergröße: ${dirPath}`, error);
  }

  return { bytes: totalSize, fileCount };
}

/**
 * Erstellt automatisch Ordnerstruktur für alle Entra ID Users (einmalig)
 */
export async function initializeAllUserDirectories(): Promise<APIResponse<{
  created: number;
  skipped: number;
  errors: number;
}>> {
  try {
    console.log('🚀 Initialisiere HR-Ordnerstruktur für alle Users...');

    const userResult = await getCombinedUsers();
    
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const user of userResult) {
      try {
        const userFolderName = generateUserFolderName(user);
        const userPath = path.join(HR_DATA_PATH, userFolderName);

        if (fs.existsSync(userPath)) {
          skipped++;
          console.log(`⏭️ Bereits vorhanden: ${userFolderName}`);
        } else {
          const setupResult = await setupEmployeeDirectory(user);
          if (setupResult.success) {
            created++;
            console.log(`✅ Erstellt: ${userFolderName}`);
          } else {
            errors++;
            console.log(`❌ Fehler bei: ${userFolderName}`);
          }
        }
      } catch (error) {
        errors++;
        console.error(`❌ Fehler bei User ${user.displayName}:`, error);
      }
    }

    return {
      success: true,
      data: { created, skipped, errors },
      message: `Initialisierung abgeschlossen: ${created} erstellt, ${skipped} übersprungen, ${errors} Fehler`
    };

  } catch (error) {
    console.error('❌ Fehler bei der User-Directory-Initialisierung:', error);
    return {
      success: false,
      error: 'InitializationError',
      message: 'Initialisierung fehlgeschlagen'
    };
  }
}

/**
 * Erstellt oder aktualisiert user_details.txt für einen spezifischen Mitarbeiter (Public API)
 */
export async function updateEmployeeDetailsFile(employeeId: string): Promise<APIResponse<boolean>> {
  try {
    // User-Daten holen
    const userResult = await getCombinedUsers();
    const employee = userResult.find((u: CombinedUser) => u.id === employeeId);
    
    if (!employee) {
      return {
        success: false,
        error: 'UserNotFound',
        message: 'Mitarbeiter nicht gefunden'
      };
    }

    // Ordnerstruktur sicherstellen
    const setupResult = await setupEmployeeDirectory(employee);
    if (!setupResult.success) {
      return setupResult as any;
    }

    // user_details.txt aktualisieren
    await updateUserDetailsFile(employee);

    return {
      success: true,
      data: true,
      message: 'Mitarbeiter-Details-Datei erfolgreich aktualisiert'
    };

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Details-Datei:', error);
    return {
      success: false,
      error: 'UpdateDetailsError',
      message: 'Details-Datei konnte nicht aktualisiert werden'
    };
  }
}
