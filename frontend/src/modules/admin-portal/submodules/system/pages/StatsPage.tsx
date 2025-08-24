import React, { useState, useEffect } from 'react';
import '../styles/SystemPages.css';

interface SourceStats {
  source: 'entra' | 'ldap' | 'upload' | 'manual';
  count: number;
  activeCount: number;
  uniqueEmails: number;
  duplicateEmails: string[];
  avgCreatedPerDay: number;
  lastActivity: string | null;
}

interface AdvancedStats {
  sourceComparison: SourceStats[];
  overallMetrics: {
    uniqueEmailsAcrossSources: number;
    duplicateEmailsCount: number;
    mostActiveSource: string | null;
    oldestUser: string | null;
    newestUser: string | null;
  };
}

const StatsPage: React.FC = () => {
  const [advancedStats, setAdvancedStats] = useState<AdvancedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'emails' | 'activity'>('users');

  useEffect(() => {
    loadAdvancedStats();
  }, []);

  const loadAdvancedStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/stats/advanced', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setAdvancedStats(result.data);
      } else {
        setError(result.message || 'Fehler beim Laden der Statistiken');
      }

    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Stats-Load-Fehler:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'entra': return '🏢';
      case 'ldap': return '🗂️';
      case 'upload': return '📊';
      case 'manual': return '✋';
      default: return '📁';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'entra': return 'source-entra';
      case 'ldap': return 'source-ldap';
      case 'upload': return 'source-upload';
      case 'manual': return 'source-manual';
      default: return 'source-default';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const getTotalUsers = () => {
    if (!advancedStats) return 0;
    return advancedStats.sourceComparison.reduce((sum, source) => sum + source.count, 0);
  };

  const getTotalActiveUsers = () => {
    if (!advancedStats) return 0;
    return advancedStats.sourceComparison.reduce((sum, source) => sum + source.activeCount, 0);
  };

  if (loading) {
    return (
      <div className="admin-portal-page">
        <div className="page-header">
          <div className="page-title">
            <h1>📊 Erweiterte Statistiken</h1>
            <p>Detaillierte Analysen aller User-Quellen</p>
          </div>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Statistiken...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-portal-page">
        <div className="page-header">
          <div className="page-title">
            <h1>📊 Erweiterte Statistiken</h1>
            <p>Detaillierte Analysen aller User-Quellen</p>
          </div>
        </div>
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadAdvancedStats}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (!advancedStats) return null;

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>📊 Erweiterte Statistiken</h1>
          <p>Detaillierte Analysen aller User-Quellen</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadAdvancedStats}>
            🔄 Aktualisieren
          </button>
        </div>
      </div>

      {/* Globale Übersichts-Metriken */}
      <div className="content-section">
        <h2>Globale Übersicht</h2>
        <div className="stats-grid large">
          <div className="stat-card highlight">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <div className="stat-number">{getTotalUsers()}</div>
              <div className="stat-label">Gesamt-User</div>
              <div className="stat-sublabel">{getTotalActiveUsers()} aktiv</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📧</div>
            <div className="stat-content">
              <div className="stat-number">{advancedStats.overallMetrics.uniqueEmailsAcrossSources}</div>
              <div className="stat-label">Eindeutige E-Mails</div>
              <div className="stat-sublabel">
                {advancedStats.overallMetrics.duplicateEmailsCount} Konflikte
              </div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-number">
                {getSourceIcon(advancedStats.overallMetrics.mostActiveSource || '')} 
                {advancedStats.overallMetrics.mostActiveSource || 'N/A'}
              </div>
              <div className="stat-label">Aktivste Quelle</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-number">
                {advancedStats.overallMetrics.newestUser 
                  ? new Date(advancedStats.overallMetrics.newestUser).toLocaleDateString()
                  : 'N/A'
                }
              </div>
              <div className="stat-label">Neuester User</div>
              <div className="stat-sublabel">
                Ältester: {advancedStats.overallMetrics.oldestUser 
                  ? new Date(advancedStats.overallMetrics.oldestUser).toLocaleDateString()
                  : 'N/A'
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metric-Selector */}
      <div className="content-section">
        <div className="metric-selector">
          <button
            className={`metric-btn ${selectedMetric === 'users' ? 'active' : ''}`}
            onClick={() => setSelectedMetric('users')}
          >
            👥 User-Verteilung
          </button>
          <button
            className={`metric-btn ${selectedMetric === 'emails' ? 'active' : ''}`}
            onClick={() => setSelectedMetric('emails')}
          >
            📧 E-Mail-Analyse
          </button>
          <button
            className={`metric-btn ${selectedMetric === 'activity' ? 'active' : ''}`}
            onClick={() => setSelectedMetric('activity')}
          >
            📈 Aktivitäts-Trends
          </button>
        </div>
      </div>

      {/* Quellen-Vergleich */}
      <div className="content-section">
        <h2>Quellen-Vergleich</h2>
        <div className="sources-comparison">
          {advancedStats.sourceComparison.map(source => (
            <div key={source.source} className="comparison-card">
              <div className="comparison-header">
                <div className="source-info">
                  <span className={`source-badge large ${getSourceColor(source.source)}`}>
                    {getSourceIcon(source.source)} {source.source.charAt(0).toUpperCase() + source.source.slice(1)}
                  </span>
                </div>
                <div className="source-percentage">
                  {calculatePercentage(source.count, getTotalUsers())}% aller User
                </div>
              </div>

              <div className="comparison-metrics">
                {selectedMetric === 'users' && (
                  <>
                    <div className="metric-row">
                      <span className="metric-label">Gesamt:</span>
                      <span className="metric-value">{source.count}</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Aktiv:</span>
                      <span className="metric-value">
                        {source.activeCount} ({calculatePercentage(source.activeCount, source.count)}%)
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Inaktiv:</span>
                      <span className="metric-value">
                        {source.count - source.activeCount} ({calculatePercentage(source.count - source.activeCount, source.count)}%)
                      </span>
                    </div>
                  </>
                )}

                {selectedMetric === 'emails' && (
                  <>
                    <div className="metric-row">
                      <span className="metric-label">Eindeutige E-Mails:</span>
                      <span className="metric-value">{source.uniqueEmails}</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Duplikate in Quelle:</span>
                      <span className="metric-value">
                        {source.duplicateEmails.length}
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">E-Mail-Eindeutigkeit:</span>
                      <span className="metric-value">
                        {calculatePercentage(source.uniqueEmails, source.count)}%
                      </span>
                    </div>
                  </>
                )}

                {selectedMetric === 'activity' && (
                  <>
                    <div className="metric-row">
                      <span className="metric-label">User/Tag (Ø30d):</span>
                      <span className="metric-value">{source.avgCreatedPerDay}</span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Letzte Aktivität:</span>
                      <span className="metric-value">
                        {source.lastActivity ? formatDate(source.lastActivity) : 'N/A'}
                      </span>
                    </div>
                    <div className="metric-row">
                      <span className="metric-label">Trend (30d):</span>
                      <span className="metric-value">
                        {source.avgCreatedPerDay > 0 ? '📈 Aktiv' : '📊 Stabil'}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Visual Progress Bars */}
              <div className="progress-section">
                {selectedMetric === 'users' && (
                  <div className="progress-bar">
                    <div className="progress-label">Aktive User</div>
                    <div className="progress-track">
                      <div 
                        className="progress-fill active"
                        style={{ width: `${calculatePercentage(source.activeCount, source.count)}%` }}
                      ></div>
                    </div>
                    <div className="progress-value">{calculatePercentage(source.activeCount, source.count)}%</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Duplikat-Analyse */}
      {selectedMetric === 'emails' && (
        <div className="content-section">
          <h2>E-Mail-Duplikate pro Quelle</h2>
          <div className="duplicates-analysis">
            {advancedStats.sourceComparison.map(source => (
              source.duplicateEmails.length > 0 && (
                <div key={source.source} className="duplicate-section">
                  <h3>
                    <span className={`source-badge ${getSourceColor(source.source)}`}>
                      {getSourceIcon(source.source)} {source.source}
                    </span>
                    - {source.duplicateEmails.length} Duplikate
                  </h3>
                  <div className="duplicate-emails">
                    {source.duplicateEmails.slice(0, 10).map((email, index) => (
                      <span key={index} className="duplicate-email">{email}</span>
                    ))}
                    {source.duplicateEmails.length > 10 && (
                      <span className="duplicate-more">+{source.duplicateEmails.length - 10} weitere</span>
                    )}
                  </div>
                </div>
              )
            ))}
          </div>
        </div>
      )}

      {/* Data Quality Score */}
      <div className="content-section">
        <h2>Datenqualität-Score</h2>
        <div className="quality-scores">
          {advancedStats.sourceComparison.map(source => {
            const qualityScore = Math.round(
              ((source.uniqueEmails / source.count) * 40) + // E-Mail-Eindeutigkeit (40%)
              ((source.activeCount / source.count) * 30) +   // Aktive User Quote (30%)
              (source.lastActivity ? 20 : 0) +               // Letzte Aktivität (20%)
              (source.count > 0 ? 10 : 0)                    // Hat User (10%)
            );

            const getQualityColor = (score: number) => {
              if (score >= 80) return 'quality-excellent';
              if (score >= 60) return 'quality-good';
              if (score >= 40) return 'quality-fair';
              return 'quality-poor';
            };

            return (
              <div key={source.source} className="quality-card">
                <div className="quality-header">
                  <span className={`source-badge ${getSourceColor(source.source)}`}>
                    {getSourceIcon(source.source)} {source.source}
                  </span>
                  <div className={`quality-score ${getQualityColor(qualityScore)}`}>
                    {qualityScore}/100
                  </div>
                </div>
                <div className="quality-breakdown">
                  <div className="quality-factor">
                    <span>E-Mail-Eindeutigkeit:</span>
                    <span>{calculatePercentage(source.uniqueEmails, source.count)}%</span>
                  </div>
                  <div className="quality-factor">
                    <span>Aktive User Quote:</span>
                    <span>{calculatePercentage(source.activeCount, source.count)}%</span>
                  </div>
                  <div className="quality-factor">
                    <span>Letzte Aktivität:</span>
                    <span>{source.lastActivity ? '✅' : '❌'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export-Sektion */}
      <div className="content-section">
        <h2>Daten-Export</h2>
        <div className="export-options">
          <p>Exportiere detaillierte Statistiken für weitere Analysen:</p>
          <div className="export-buttons">
            <button className="btn btn-secondary">
              📊 Statistiken als CSV
            </button>
            <button className="btn btn-secondary">
              📈 Charts als PDF
            </button>
            <button className="btn btn-secondary">
              📋 Vollständiger Bericht
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
