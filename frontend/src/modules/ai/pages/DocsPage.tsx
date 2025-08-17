import React, { useEffect, useMemo, useState } from 'react';
import '../styles/AIPages.css';

interface DocFile {
  path: string;
  size: number;
  updatedAt: string;
  isExternal?: boolean;
}

interface OriginalFile {
  filename: string;
  originalName: string;
  size: number;
  uploadedAt: string;
  downloadUrl: string;
  markdownFile?: string;
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiTarget {
  id: string;
  method: HttpMethod;
  path: string;
  description?: string;
  builtin?: boolean;
}

const STORAGE_KEY = 'ai_rag_api_targets';

const DocsPage: React.FC = () => {
  const [docs, setDocs] = useState<DocFile[]>([]);
  const [originals, setOriginals] = useState<OriginalFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiTargets, setApiTargets] = useState<ApiTarget[]>([]);
  const [newMethod, setNewMethod] = useState<HttpMethod>('GET');
  const [newPath, setNewPath] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualReindex, setManualReindex] = useState(false);
  const [manualBusy, setManualBusy] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [reindexBusy, setReindexBusy] = useState(false);
  // NEU: Original-File Upload
  const [selectedOriginalFile, setSelectedOriginalFile] = useState<File | null>(null);
  const [originalUploadBusy, setOriginalUploadBusy] = useState(false);

  const defaultTargets: ApiTarget[] = useMemo(() => ([
    { id: 't_chat', method: 'POST', path: '/api/ai/chat', description: 'Chat mit optionalem RAG (rag=true)', builtin: true },
    { id: 't_docs', method: 'GET', path: '/api/ai/rag/docs', description: 'Listet alle Markdown-Quellen aus docs/', builtin: true },
    { id: 't_manual', method: 'POST', path: '/api/ai/rag/manual-doc', description: 'Fügt eine manuelle Markdown-Datei hinzu', builtin: true },
    { id: 't_reindex', method: 'POST', path: '/api/ai/rag/reindex', description: 'Erstellt den RAG-Index neu', builtin: true },
    { id: 't_hrassist', method: 'POST', path: '/api/ai/hr-assist', description: 'HR Assist Beispiel mit RAG-Kontext', builtin: true },
    { id: 't_upload', method: 'POST', path: '/api/ai/rag/upload-file', description: '📁 Original-Dateien hochladen (NEU)', builtin: true },
    { id: 't_originals', method: 'GET', path: '/api/ai/rag/originals', description: '📁 Original-Dateien auflisten (NEU)', builtin: true },
    { id: 't_download', method: 'GET', path: '/api/ai/rag/download/original/:filename', description: '📁 Original-Datei herunterladen (NEU)', builtin: true }
  ]), []);

  const loadTargetsFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const custom: ApiTarget[] = raw ? JSON.parse(raw) : [];
      const merged = [...defaultTargets, ...custom];
      setApiTargets(merged);
    } catch {
      setApiTargets(defaultTargets);
    }
  };

  const saveCustomTargets = (custom: ApiTarget[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  };

  const addApiTarget = () => {
    if (!newPath.trim()) return;
    const custom: ApiTarget = {
      id: `c_${Date.now()}`,
      method: newMethod,
      path: newPath.trim(),
      description: newDesc.trim() || undefined,
    };
    const currentCustom = apiTargets.filter(t => !t.builtin);
    const updatedCustom = [...currentCustom, custom];
    saveCustomTargets(updatedCustom);
    setNewPath(''); setNewDesc(''); setNewMethod('GET');
    loadTargetsFromStorage();
  };

  const removeApiTarget = (id: string) => {
    const currentCustom = apiTargets.filter(t => !t.builtin);
    const updatedCustom = currentCustom.filter(t => t.id !== id);
    saveCustomTargets(updatedCustom);
    loadTargetsFromStorage();
  };

  const loadDocs = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('authToken');
      if (!token) { setError('Nicht authentifiziert'); return; }
      
      // Markdown-Dokumente laden
      const resp = await fetch('/api/ai/rag/docs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler beim Laden der Dokumente');
      setDocs(data.data || []);
      
      // Original-Dateien laden
      const originalsResp = await fetch('/api/ai/rag/originals', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const originalsData = await originalsResp.json();
      if (originalsData.success) {
        setOriginals(originalsData.data || []);
      }
      
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally { setLoading(false); }
  };

  const submitManualDoc = async () => {
    if (!manualTitle.trim() || !manualContent.trim()) return;
    setManualBusy(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Nicht authentifiziert');
      const resp = await fetch('/api/ai/rag/manual-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: manualTitle.trim(), content: manualContent, reindex: manualReindex })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler beim Hinzufügen');
      setManualTitle(''); setManualContent(''); setManualReindex(false);
      loadDocs();
      const message = data.data?.message || 'Dokument hinzugefügt';
      alert(message + (manualReindex ? ' und Index neu erstellt.' : '.'));
    } catch (e: any) {
      alert(e.message || 'Fehler beim Hinzufügen');
    } finally {
      setManualBusy(false);
    }
  };

  // NEU: Original-Datei Upload
  const uploadOriginalFile = async () => {
    if (!selectedOriginalFile) return;
    
    setOriginalUploadBusy(true);
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Nicht authentifiziert');
      
      const formData = new FormData();
      formData.append('file', selectedOriginalFile);
      formData.append('reindex', String(manualReindex));
      
      const response = await fetch('/api/ai/rag/upload-file', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Upload fehlgeschlagen');
      
      setSelectedOriginalFile(null);
      loadDocs();
      alert(result.data.message + (manualReindex ? ' und Index neu erstellt.' : '.'));
      
    } catch (error: any) {
      alert('Upload-Fehler: ' + error.message);
    } finally {
      setOriginalUploadBusy(false);
    }
  };

  // NEU: Original-Datei löschen
  const deleteOriginalFile = async (filename: string, originalName: string) => {
    if (!confirm(`Original-Datei "${originalName}" wirklich löschen?\n\nDies entfernt auch die zugehörige Markdown-Datei für RAG.`)) return;
    
    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error('Nicht authentifiziert');
      
      const response = await fetch(`/api/ai/rag/originals/${filename}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Löschen fehlgeschlagen');
      
      loadDocs();
      alert(result.message);
      
    } catch (error: any) {
      alert('Lösch-Fehler: ' + error.message);
    }
  };

  useEffect(() => {
    loadTargetsFromStorage();
    loadDocs();
  }, []);

  return (
    <div className="ai-page">
      <div className="page-header">
        <div className="page-title">
          <h1>📚 AI Dokumente</h1>
          <p>RAG liest rekursiv alle Markdown-Dateien aus dem konfigurierten Ordner. Dateien werden extern gespeichert (getrennt vom Projekt).</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadDocs}>🔄 Aktualisieren</button>
          <button
            className="btn btn-primary"
            disabled={reindexBusy}
            onClick={async () => {
              try {
                setReindexBusy(true);
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error('Nicht authentifiziert');
                const resp = await fetch('/api/ai/rag/reindex', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await resp.json();
                if (!data.success) throw new Error(data.message || 'Reindex fehlgeschlagen');
                loadDocs();
                alert(`Index neu erstellt (Chunks: ${data.data?.chunks})`);
              } catch (e: any) {
                alert(e.message || 'Reindex fehlgeschlagen');
              } finally { setReindexBusy(false); }
            }}
          >{reindexBusy ? 'Indexiere…' : 'Index neu erstellen'}</button>
        </div>
      </div>

      <div className="content-section">
        {/* Speicherorte Hinweis */}
        <div className="page-summary" style={{ marginBottom: 16 }}>
          <p>
            <strong>Neue Ordnerstruktur:</strong> Original-Dateien in <code>/originals/</code>, Markdown-Dateien in <code>/markdowns/</code>
            {docs.some(d => d.isExternal) && <span style={{color: 'green'}}> ✅ Externe Speicherung aktiv</span>}
            {docs.length > 0 && !docs.some(d => d.isExternal) && <span style={{color: 'orange'}}> ⚠️ Interne Speicherung (Projekt-Ordner)</span>}
          </p>
        </div>

        {/* APIs Zielbereich */}
        <div className="filters-section" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 8 }}>RAG APIs</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {apiTargets.map(t => (
              <div key={t.id} className="stat-card" style={{ minWidth: 260 }}>
                <div className="stat-content">
                  <h3><span style={{ fontFamily: 'monospace' }}>[{t.method}]</span> {t.path}</h3>
                  {t.description && <p>{t.description}</p>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-small btn-secondary" onClick={() => navigator.clipboard.writeText(t.path)}>Kopieren</button>
                    {!t.builtin && (
                      <button className="btn btn-small btn-outline" onClick={() => removeApiTarget(t.id)}>Entfernen</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12 }}>
            <h4>API manuell hinzufügen</h4>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select value={newMethod} onChange={e => setNewMethod(e.target.value as HttpMethod)} className="filter-select">
                {['GET','POST','PUT','PATCH','DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <input className="filter-input" placeholder="/api/pfad" value={newPath} onChange={e => setNewPath(e.target.value)} />
              <input className="filter-input" placeholder="Beschreibung (optional)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
              <button className="btn btn-primary" onClick={addApiTarget}>Hinzufügen</button>
            </div>
          </div>
        </div>

        {        /* Loading/Error States */}
        {loading && (
          <div className="loading-state"><div className="loading-spinner" />
            <p>Lade Dokumente…</p></div>
        )}
        {error && (
          <div className="error-state"><h3>Fehler</h3><p>{error}</p>
            <button className="btn btn-primary" onClick={loadDocs}>Erneut versuchen</button>
          </div>
        )}

        {/* 1. Original-Dateien Liste (ZUERST) */}
        {!loading && !error && (
          <div style={{ marginTop: 24 }}>
            <h3>📁 Original-Dateien ({originals.length})</h3>
            <p style={{ color: '#6b7280', marginBottom: 12 }}>
              Hochgeladene Original-Dateien - User können diese herunterladen
            </p>
            
            {originals.length === 0 ? (
              <div className="empty-state" style={{ backgroundColor: '#f0f9ff', border: '1px solid #0ea5e9' }}>
                <div className="empty-icon">📁</div>
                <h3>Keine Original-Dateien hochgeladen</h3>
                <p>Nutzen Sie die blaue "📁 Original-Dateien hochladen" Sektion unten.</p>
              </div>
            ) : (
              <div className="stats-grid">
                {originals.map((file) => (
                  <div key={file.filename} className="stat-card" style={{ backgroundColor: '#f0f9ff', border: '1px solid #0ea5e9' }}>
                    <div className="stat-content">
                      <h3 style={{ color: '#0c4a6e' }}>
                        📁 {file.originalName}
                      </h3>
                      <p>Größe: {Math.round(file.size / 1024)} KB</p>
                      <p>Hochgeladen: {new Date(file.uploadedAt).toLocaleString()}</p>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <a
                          href={file.downloadUrl}
                          className="btn btn-small btn-primary"
                          style={{ textDecoration: 'none' }}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          💾 Download Original
                        </a>
                        <button
                          className="btn btn-small btn-outline"
                          onClick={() => deleteOriginalFile(file.filename, file.originalName)}
                          style={{ color: '#dc2626' }}
                        >
                          🗑️ Löschen
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Markdown-Dokumente Liste (ZWEITE Position) */}
        {!loading && !error && (
          <div style={{ marginTop: 32 }}>
            <h3>📝 Markdown-Dokumente (Ordner: markdowns/) ({docs.length})</h3>
            <p style={{ color: '#6b7280', marginBottom: 12 }}>
              Für RAG-System indexierte Markdown-Dateien (automatisch generiert + manuell hinzugefügte)
            </p>
            
            {docs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>Keine Markdown-Dokumente</h3>
                <p>Laden Sie Original-Dateien hoch oder fügen Sie manuell Markdown hinzu.</p>
              </div>
            ) : (
              <div className="stats-grid">
                {docs.map((d) => (
                  <div key={d.path} className="stat-card">
                    <div className="stat-content">
                      <h3>
                        📝 {d.path}
                        {d.isExternal && <span style={{color: 'green', fontSize: '0.8em', marginLeft: '8px'}}>📁 Extern</span>}
                        {!d.isExternal && <span style={{color: 'orange', fontSize: '0.8em', marginLeft: '8px'}}>📁 Intern</span>}
                      </h3>
                      <p>Größe: {Math.round(d.size / 1024)} KB</p>
                      <p>Aktualisiert: {new Date(d.updatedAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Manuelle Datei hinzufügen */}
        <div className="filters-section" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>📝 Manuelle Markdown-Datei hinzufügen (Ordner: markdowns/)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="filter-input" placeholder="Titel" value={manualTitle} onChange={e => setManualTitle(e.target.value)} />
            <textarea className="filter-input" placeholder="# Markdown Inhalt" value={manualContent} onChange={e => setManualContent(e.target.value)} rows={6} />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={manualReindex} onChange={e => setManualReindex(e.target.checked)} />
              Nach dem Hinzufügen Index neu erstellen
            </label>
            <div>
              <button className="btn btn-success" disabled={manualBusy} onClick={submitManualDoc}>{manualBusy ? 'Wird hinzugefügt…' : 'Hinzufügen'}</button>
            </div>
          </div>
        </div>

        {/* NEU: Original-Dateien hochladen */}
        <div className="filters-section" style={{ marginTop: 16, backgroundColor: '#f0f9ff', padding: 16, borderRadius: 8, border: '2px solid #0ea5e9' }}>
          <h3 style={{ marginBottom: 8, color: '#0c4a6e' }}>📁 Original-Dateien hochladen (NEU)</h3>
          <p style={{ color: '#075985', marginBottom: 12 }}>
            <strong>Laden Sie beliebige Dateien hoch!</strong> Das System speichert das Original UND erstellt automatisch Markdown für RAG.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="file"
              accept="*/*"
              onChange={(e) => setSelectedOriginalFile(e.target.files?.[0] || null)}
            />
            
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={manualReindex} onChange={e => setManualReindex(e.target.checked)} />
              Nach dem Upload Index neu erstellen
            </label>
            
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-success"
                disabled={originalUploadBusy || !selectedOriginalFile}
                onClick={uploadOriginalFile}
              >
                {originalUploadBusy ? 'Lädt hoch...' : '📁 Original-Datei hochladen'}
              </button>
            </div>
            
            {selectedOriginalFile && (
              <div className="page-summary" style={{ backgroundColor: '#e0f2fe', border: '1px solid #0ea5e9' }}>
                <p><strong>📄 Ausgewählt:</strong> {selectedOriginalFile.name} ({Math.round(selectedOriginalFile.size / 1024)} KB)</p>
                <p><strong>✅ Wird gespeichert:</strong></p>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  <li>📁 <strong>Original-Datei</strong> → zum Herunterladen für User</li>
                  <li>📝 <strong>Markdown-Version</strong> → für RAG-System</li>
                </ul>
                <p><strong>📂 Speicherort:</strong> Extern → /originals/ (Original) + /markdowns/ (RAG)</p>
              </div>
            )}
          </div>
        </div>

        {/* Bestehende Markdown-Dateien hochladen */}
        <div className="filters-section" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>📝 Markdown-Dateien hochladen (Nur für RAG)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              type="file"
              multiple
              accept=".md,.markdown,text/markdown,text/plain"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={manualReindex} onChange={e => setManualReindex(e.target.checked)} />
              Nach dem Hochladen Index neu erstellen
            </label>
            <div>
              <button
                className="btn btn-secondary"
                disabled={uploadBusy || selectedFiles.length === 0}
                onClick={async () => {
                  if (selectedFiles.length === 0) return;
                  setUploadBusy(true);
                  try {
                    const token = localStorage.getItem('authToken');
                    if (!token) throw new Error('Nicht authentifiziert');
                    for (let i = 0; i < selectedFiles.length; i++) {
                      const f = selectedFiles[i];
                      const text = await f.text();
                      const isLast = i === selectedFiles.length - 1;
                      const resp = await fetch('/api/ai/rag/manual-doc', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                        body: JSON.stringify({ title: f.name, content: text, reindex: manualReindex && isLast })
                      });
                      const data = await resp.json();
                      if (!data.success) throw new Error(data.message || `Fehler bei ${f.name}`);
                    }
                    setSelectedFiles([]);
                    loadDocs();
                    alert(`Upload abgeschlossen${manualReindex ? ' und Index neu erstellt.' : '.'} Dateien wurden extern gespeichert.`);
                  } catch (e: any) {
                    alert(e.message || 'Fehler beim Upload');
                  } finally {
                    setUploadBusy(false);
                  }
                }}
              >
                {uploadBusy ? 'Lade hoch…' : `📝 Markdown hochladen (${selectedFiles.length})`}
              </button>
            </div>
            {selectedFiles.length > 0 && (
              <div className="page-summary">
                <p>Ausgewählt: {selectedFiles.map(f => f.name).join(', ')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocsPage;
