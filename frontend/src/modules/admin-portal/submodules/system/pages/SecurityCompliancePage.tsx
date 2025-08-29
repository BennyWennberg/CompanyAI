import React, { useEffect, useState } from 'react';

const SecurityCompliancePage: React.FC = () => {
  const [config, setConfig] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setError(null);
      const token = localStorage.getItem('authToken');
      const resp = await fetch('/api/ai/config', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler');
      setConfig(data.data);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden der AI-Konfiguration');
    }
  };

  useEffect(() => { loadConfig(); }, []);

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🛡️ Sicherheit & Compliance</h1>
          <p>Guardrails für Web-RAG und RAG-Konfiguration</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadConfig}>Neu laden</button>
        </div>
      </div>

      {error && (<div className="error-state"><p>{error}</p></div>)}

      <div className="content-section">
        <h2>Web-RAG Guardrails</h2>
        <ul>
          <li>WEB_SEARCH_ENABLED: <strong>{config?.WEB_SEARCH_ENABLED ? 'Aktiv' : 'Deaktiviert'}</strong></li>
          <li>WEB_RAG_ADMIN_ONLY: <strong>{config?.WEB_RAG_ADMIN_ONLY ? 'Ja' : 'Nein'}</strong></li>
          <li>Allowlist Domains: {config?.WEB_RAG_ALLOWLIST?.length ? config.WEB_RAG_ALLOWLIST.join(', ') : '—'}</li>
        </ul>
      </div>

      <div className="content-section">
        <h2>RAG Konfiguration</h2>
        <ul>
          <li>HYBRID_RAG_ENABLED: <strong>{config?.HYBRID_RAG_ENABLED ? 'Aktiv' : 'Deaktiviert'}</strong></li>
          <li>RAG_EXTERNAL_DOCS_PATH gesetzt: <strong>{config?.RAG_EXTERNAL_DOCS_PATH_SET ? 'Ja' : 'Nein'}</strong></li>
          <li>RAG_INDEX_PATH gesetzt: <strong>{config?.RAG_INDEX_PATH_SET ? 'Ja' : 'Nein'}</strong></li>
        </ul>
        <p>Konfiguration erfolgt über Backend-Umgebungsvariablen.</p>
      </div>
    </div>
  );
};

export default SecurityCompliancePage;


