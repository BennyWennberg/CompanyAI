import React, { useEffect, useState } from 'react';

interface HybridStats {
  chunksTotal: number;
  avgChunkLength: number;
  uniqueTokens: number;
  topTokens: Array<{ token: string; frequency: number }>;
}

const RAGStatusPage: React.FC = () => {
  const [stats, setStats] = useState<HybridStats | null>(null);
  const [query, setQuery] = useState('');
  const [compare, setCompare] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('authToken');
      const resp = await fetch('/api/ai/rag/hybrid/stats', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler');
      setStats(data.data);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadStats(); }, []);

  const runCompare = async () => {
    if (!query.trim()) return;
    try {
      setLoading(true); setError(null);
      const token = localStorage.getItem('authToken');
      const body = JSON.stringify({ query, topK: 5 });
      const resp = await fetch('/api/ai/rag/hybrid/compare', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message || 'Fehler');
      setCompare(data.data);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Vergleich');
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🔍 RAG Status</h1>
          <p>Hybrid-Suche Statistiken und Vergleich</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadStats} disabled={loading}>Neu laden</button>
        </div>
      </div>

      {loading && (
        <div className="loading-state"><div className="loading-spinner"></div><p>Lade...</p></div>
      )}
      {error && (
        <div className="error-state"><p>{error}</p></div>
      )}

      {stats && (
        <div className="content-section">
          <h2>Index Statistiken</h2>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon">📚</div><div className="stat-content"><div className="stat-number">{stats.chunksTotal}</div><div className="stat-label">Chunks</div></div></div>
            <div className="stat-card"><div className="stat-icon">📏</div><div className="stat-content"><div className="stat-number">{stats.avgChunkLength}</div><div className="stat-label">Ø Token-Länge</div></div></div>
            <div className="stat-card"><div className="stat-icon">🔤</div><div className="stat-content"><div className="stat-number">{stats.uniqueTokens}</div><div className="stat-label">Einzigartige Tokens</div></div></div>
          </div>
          <h3 style={{ marginTop: 16 }}>Top Tokens</h3>
          <ul>
            {stats.topTokens.map(t => (
              <li key={t.token}>{t.token} – {t.frequency}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="content-section">
        <h2>Suchmethoden vergleichen</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Query (z.B. HR Modul)" style={{ flex: 1 }} />
          <button className="btn btn-primary" onClick={runCompare} disabled={loading || !query.trim()}>Vergleichen</button>
        </div>
        {compare && (
          <div style={{ marginTop: 12 }}>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon">🧭</div><div className="stat-content"><div className="stat-number">{compare.summary.performance.vectorDuration} ms</div><div className="stat-label">Vector Dauer</div></div></div>
              <div className="stat-card"><div className="stat-icon">🔎</div><div className="stat-content"><div className="stat-number">{compare.summary.performance.bm25Duration} ms</div><div className="stat-label">BM25 Dauer</div></div></div>
              <div className="stat-card"><div className="stat-icon">⚖️</div><div className="stat-content"><div className="stat-number">{compare.summary.performance.hybridDuration} ms</div><div className="stat-label">Hybrid Dauer</div></div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RAGStatusPage;


