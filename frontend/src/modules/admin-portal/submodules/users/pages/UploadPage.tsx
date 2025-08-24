import React, { useState } from 'react';
import '../../../styles/AdminPortalPages.css';

interface UploadAnalysis {
  rowCount: number;
  columns: string[];
  sampleData: any[];
  suggestedMapping: {[csvColumn: string]: string};
  issues: string[];
}

interface UploadStats {
  totalUploads: number;
  totalUsers: number;
  recentUploads: Array<{
    batchId: string;
    userCount: number;
    uploadedAt: string;
    uploadedBy: string;
  }>;
  lastUpload: string | null;
}

const UploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<UploadAnalysis | null>(null);
  const [uploadStats, setUploadStats] = useState<UploadStats | null>(null);
  const [mapping, setMapping] = useState<{[csvColumn: string]: string}>({});
  const [uploadMode, setUploadMode] = useState<'add' | 'replace'>('add');
  // const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  React.useEffect(() => {
    loadUploadStats();
  }, []);

  const loadUploadStats = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/upload/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setUploadStats(result.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Upload-Stats:', err);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysis(null);
      setMapping({});
      setError(null);
      setSuccess(null);
    }
  };

  const analyzeFile = async () => {
    if (!selectedFile) return;

    try {
      setAnalyzing(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/upload/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success && result.data) {
        setAnalysis(result.data);
        setMapping(result.data.suggestedMapping || {});
      } else {
        setError(result.message || 'Analyse fehlgeschlagen');
      }

    } catch (err) {
      setError('Fehler bei der Datei-Analyse');
      console.error('Analyse-Fehler:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const processUpload = async () => {
    if (!selectedFile || !analysis) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', uploadMode);
      formData.append('mapping', JSON.stringify(mapping));

      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/upload/process', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await response.json();

      if (result.success && result.data) {
        setSuccess(`Upload erfolgreich: ${result.data.added} hinzugefügt, ${result.data.updated} aktualisiert`);
        setSelectedFile(null);
        setAnalysis(null);
        setMapping({});
        
        // Stats aktualisieren
        loadUploadStats();
        
        // Datei-Input zurücksetzen
        const fileInput = document.getElementById('file-input') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        setError(result.message || 'Upload fehlgeschlagen');
      }

    } catch (err) {
      setError('Fehler beim Upload-Processing');
      console.error('Upload-Fehler:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleMappingChange = (csvColumn: string, dbField: string) => {
    setMapping(prev => ({
      ...prev,
      [csvColumn]: dbField
    }));
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.csv')) return '📄';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return '📊';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>📤 CSV/Excel Upload</h1>
          <p>Bulk-Import von Usern aus Dateien</p>
        </div>
      </div>

      {/* Upload-Statistiken */}
      {uploadStats && (
        <div className="content-section">
          <h2>Upload-Statistiken</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">📁</div>
              <div className="stat-content">
                <div className="stat-number">{uploadStats.totalUploads}</div>
                <div className="stat-label">Uploads</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-number">{uploadStats.totalUsers}</div>
                <div className="stat-label">Upload-User</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🕒</div>
              <div className="stat-content">
                <div className="stat-number">
                  {uploadStats.lastUpload ? formatDate(uploadStats.lastUpload) : 'Nie'}
                </div>
                <div className="stat-label">Letzter Upload</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Datei-Upload Bereich */}
      <div className="content-section">
        <h2>Datei hochladen</h2>
        
        <div className="upload-area">
          <div className="file-input-container">
            <input
              id="file-input"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="file-input"
            />
            <label htmlFor="file-input" className="file-input-label">
              <div className="file-input-content">
                <div className="upload-icon">📁</div>
                <div>
                  <div className="upload-text">
                    {selectedFile ? 'Datei ändern' : 'Datei auswählen'}
                  </div>
                  <div className="upload-subtext">
                    CSV, Excel (.xlsx, .xls) - Max. 10MB
                  </div>
                </div>
              </div>
            </label>
          </div>

          {selectedFile && (
            <div className="selected-file">
              <div className="file-info">
                <span className="file-icon">{getFileIcon(selectedFile.name)}</span>
                <span className="file-name">{selectedFile.name}</span>
                <span className="file-size">({formatFileSize(selectedFile.size)})</span>
              </div>
              <button
                className="btn btn-primary"
                onClick={analyzeFile}
                disabled={analyzing}
              >
                {analyzing ? '🔍 Analysiere...' : '🔍 Datei analysieren'}
              </button>
            </div>
          )}
        </div>

        {/* Upload-Mode Auswahl */}
        <div className="upload-mode-section">
          <h3>Upload-Modus</h3>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="uploadMode"
                value="add"
                checked={uploadMode === 'add'}
                onChange={(e) => setUploadMode(e.target.value as 'add')}
              />
              <span className="radio-label">
                <strong>Hinzufügen (Add)</strong> - Neue User hinzufügen, bestehende aktualisieren
              </span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="uploadMode"
                value="replace"
                checked={uploadMode === 'replace'}
                onChange={(e) => setUploadMode(e.target.value as 'replace')}
              />
              <span className="radio-label">
                <strong>Ersetzen (Replace)</strong> - Alle bestehenden Upload-User löschen und neue hinzufügen
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Analyse-Ergebnisse */}
      {analysis && (
        <div className="content-section">
          <h2>Datei-Analyse</h2>
          
          <div className="analysis-overview">
            <div className="analysis-stat">
              <strong>{analysis.rowCount}</strong> Zeilen gefunden
            </div>
            <div className="analysis-stat">
              <strong>{analysis.columns.length}</strong> Spalten entdeckt
            </div>
          </div>

          {/* Issues/Warnungen */}
          {analysis.issues.length > 0 && (
            <div className="analysis-issues">
              <h3>⚠️ Warnungen:</h3>
              <ul>
                {analysis.issues.map((issue, index) => (
                  <li key={index} className="issue-item">{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Beispiel-Daten */}
          <div className="sample-data-section">
            <h3>📋 Beispiel-Daten (erste 3 Zeilen):</h3>
            <div className="table-container">
              <table className="sample-table">
                <thead>
                  <tr>
                    {analysis.columns.map(column => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.sampleData.slice(0, 3).map((row, index) => (
                    <tr key={index}>
                      {analysis.columns.map(column => (
                        <td key={column}>{row[column] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feld-Mapping */}
          <div className="mapping-section">
            <h3>🔗 Feld-Mapping</h3>
            <p>Ordne die CSV-Spalten den Datenbank-Feldern zu:</p>
            
            <div className="mapping-grid">
              {analysis.columns.map(column => (
                <div key={column} className="mapping-row">
                  <div className="csv-column">
                    <strong>{column}</strong>
                    <span className="column-sample">
                      Beispiel: {analysis.sampleData[0]?.[column] || 'N/A'}
                    </span>
                  </div>
                  <div className="mapping-arrow">→</div>
                  <div className="db-field">
                    <select
                      value={mapping[column] || ''}
                      onChange={(e) => handleMappingChange(column, e.target.value)}
                      className="mapping-select"
                    >
                      <option value="">Nicht zuordnen</option>
                      <option value="email">E-Mail (erforderlich)</option>
                      <option value="firstName">Vorname</option>
                      <option value="lastName">Nachname</option>
                      <option value="displayName">Anzeigename</option>
                      <option value="department">Abteilung</option>
                      <option value="jobTitle">Position</option>
                      <option value="phone">Telefon</option>
                      <option value="isActive">Status (Aktiv/Inaktiv)</option>
                    </select>
                    {analysis.suggestedMapping[column] && (
                      <span className="suggested-mapping">
                        Vorschlag: {analysis.suggestedMapping[column]}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upload-Button */}
          <div className="upload-actions">
            <button
              className="btn btn-success"
              onClick={processUpload}
              disabled={uploading || !Object.values(mapping).includes('email')}
            >
              {uploading ? '⏳ Verarbeite...' : '✅ Upload starten'}
            </button>
            {!Object.values(mapping).includes('email') && (
              <p className="upload-warning">
                ⚠️ E-Mail-Feld muss zugeordnet werden
              </p>
            )}
          </div>
        </div>
      )}

      {/* Letzte Uploads */}
      {uploadStats && uploadStats.recentUploads.length > 0 && (
        <div className="content-section">
          <h2>Letzte Uploads</h2>
          <div className="recent-uploads">
            {uploadStats.recentUploads.slice(0, 5).map((upload, index) => (
              <div key={index} className="upload-item">
                <div className="upload-info">
                  <div className="upload-count">{upload.userCount} User</div>
                  <div className="upload-details">
                    <div>von {upload.uploadedBy}</div>
                    <div>{formatDate(upload.uploadedAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status-Meldungen */}
      {error && (
        <div className="status-message error">
          ❌ {error}
        </div>
      )}

      {success && (
        <div className="status-message success">
          ✅ {success}
        </div>
      )}
    </div>
  );
};

export default UploadPage;
