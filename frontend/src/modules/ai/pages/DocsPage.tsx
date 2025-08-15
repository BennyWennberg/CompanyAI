import React, { useEffect, useMemo, useState } from 'react';
import '../styles/AIPages.css';

interface DocFile {
  path: string;
  size: number;
  updatedAt: string;
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

  const defaultTargets: ApiTarget[] = useMemo(() => ([
    { id: 't_chat', method: 'POST', path: '/api/ai/chat', description: 'Chat mit optionalem RAG (rag=true)', builtin: true },
    { id: 't_docs', method: 'GET', path: '/api/ai/rag/docs', description: 'Listet alle Markdown-Quellen aus docs/', builtin: true },
    { id: 't_manual', method: 'POST', path: '/api/ai/rag/manual-doc', description: 'Fügt eine manuelle Markdown-Datei hinzu', builtin: true },
    { id: 't_reindex', method: 'POST', path: '/api/ai/rag/reindex', description: 'Erstellt den RAG-Index neu', builtin: true },
    { id: 't_hrassist', method: 'POST', path: '/api/ai/hr-assist', description: 'HR Assist Beispiel mit RAG-Kontext', builtin: true }
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
      const resp = await fetch('/api/ai/rag/docs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler beim Laden der Dokumente');
      setDocs(data.data || []);
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
      alert('Dokument hinzugefügt' + (manualReindex ? ' und Index neu erstellt.' : '.'));
    } catch (e: any) {
      alert(e.message || 'Fehler beim Hinzufügen');
    } finally {
      setManualBusy(false);
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
          <p>RAG liest rekursiv alle Markdown-Dateien aus <code>docs/</code>. Manuelle Uploads landen in <code>docs/uploads/</code>.</p>
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
            Speicherorte: <code>docs/</code> (alle Markdown-Quellen), <code>docs/uploads/</code> (manuell erzeugte Dateien).
            Der aktuelle RAG-Index wird standardmäßig unter <code>backend/rag_index.json</code> gespeichert.
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

        {/* Dokumente Liste */}
        {loading && (
          <div className="loading-state"><div className="loading-spinner" />
            <p>Lade Dokumente…</p></div>
        )}
        {error && (
          <div className="error-state"><h3>Fehler</h3><p>{error}</p>
            <button className="btn btn-primary" onClick={loadDocs}>Erneut versuchen</button>
          </div>
        )}
        {!loading && !error && (
          <div className="stats-grid">
            {docs.length === 0 && (
              <div className="empty-state"><div className="empty-icon">📄</div><h3>Keine Dokumente gefunden</h3><p>Füge Markdown-Dateien unter docs/ hinzu.</p></div>
            )}
            {docs.map((d) => (
              <div key={d.path} className="stat-card">
                <div className="stat-content">
                  <h3>{d.path}</h3>
                  <p>Größe: {Math.round(d.size / 1024)} KB</p>
                  <p>Aktualisiert: {new Date(d.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Manuelle Datei hinzufügen */}
        <div className="filters-section" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Manuelle Markdown-Datei hinzufügen</h3>
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

        {/* Bestehende Markdown-Dateien hochladen */}
        <div className="filters-section" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Bestehende Markdown-Dateien hochladen</h3>
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
                className="btn btn-primary"
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
                    alert(`Upload abgeschlossen${manualReindex ? ' und Index neu erstellt.' : '.'}`);
                  } catch (e: any) {
                    alert(e.message || 'Fehler beim Upload');
                  } finally {
                    setUploadBusy(false);
                  }
                }}
              >
                {uploadBusy ? 'Lade hoch…' : `Hochladen (${selectedFiles.length})`}
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
