import React, { useEffect, useState } from 'react';

interface LogEntry {
  id: string;
  timestamp: string;
  channel: string;
  event: string;
  payload?: any;
}

const LoggingPage: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('authToken');
      const resp = await fetch('/api/ai/logs?limit=200', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler');
      setLogs(data.data || []);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden der Logs');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadLogs(); }, []);

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>📋 Logging</h1>
          <p>Letzte Ereignisse und Metriken</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadLogs} disabled={loading}>Neu laden</button>
        </div>
      </div>

      {loading && (<div className="loading-state"><div className="loading-spinner"></div><p>Lade Logs...</p></div>)}
      {error && (<div className="error-state"><p>{error}</p></div>)}

      <div className="content-section">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Zeit</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Kanal</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Event</th>
                <th style={{ textAlign: 'left', padding: 8, borderBottom: '1px solid #e5e7eb' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ padding: 8 }}>{new Date(l.timestamp).toLocaleString()}</td>
                  <td style={{ padding: 8 }}>{l.channel}</td>
                  <td style={{ padding: 8 }}>{l.event}</td>
                  <td style={{ padding: 8 }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(l.payload, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LoggingPage;


