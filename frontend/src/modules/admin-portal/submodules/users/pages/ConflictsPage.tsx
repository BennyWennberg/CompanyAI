import React, { useState, useEffect } from 'react';
import '../styles/UsersPages.css';

interface EmailConflict {
  email: string;
  sources: ('entra' | 'ldap' | 'upload' | 'manual')[];
  users: Array<{
    id: string;
    source: 'entra' | 'ldap' | 'upload' | 'manual';
    displayName?: string;
    lastSync: string;
    isActive: boolean;
  }>;
}

const ConflictsPage: React.FC = () => {
  const [conflicts, setConflicts] = useState<EmailConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConflict, setSelectedConflict] = useState<EmailConflict | null>(null);
  const [resolutionMode, setResolutionMode] = useState<'keep' | 'merge'>('keep');
  const [keepSource, setKeepSource] = useState<string>('');

  useEffect(() => {
    loadConflicts();
  }, []);

  const loadConflicts = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/conflicts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success && result.data) {
        setConflicts(result.data);
      } else {
        setError(result.message || 'Fehler beim Laden der Konflikte');
      }

    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Conflicts-Load-Fehler:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveConflict = async (conflict: EmailConflict, keepSource: string) => {
    try {
      const deleteFromSources = conflict.sources.filter(s => s !== keepSource);

      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/conflicts/resolve', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: conflict.email,
          keepSource,
          deleteFromSources
        })
      });

      const result = await response.json();

      if (result.success) {
        // Konflikte neu laden
        loadConflicts();
        setSelectedConflict(null);
      } else {
        alert(`Konflikt-Auflösung fehlgeschlagen: ${result.message}`);
      }

    } catch (err) {
      alert('Fehler bei der Konflikt-Auflösung');
      console.error('Resolve-Conflict-Fehler:', err);
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

  const getSourcePriority = (source: string) => {
    // Priorität für Konflikt-Auflösung (höhere Nummer = höhere Priorität)
    switch (source) {
      case 'entra': return 4; // Höchste Priorität (autorisierte Quelle)
      case 'ldap': return 3;
      case 'manual': return 2;
      case 'upload': return 1; // Niedrigste Priorität
      default: return 0;
    }
  };

  const getSuggestedKeepSource = (conflict: EmailConflict) => {
    return conflict.sources.reduce((best, current) => 
      getSourcePriority(current) > getSourcePriority(best) ? current : best
    );
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

  if (loading) {
    return (
      <div className="admin-portal-page">
        <div className="page-header">
          <div className="page-title">
            <h1>⚠️ E-Mail-Konflikte</h1>
            <p>Doppelte E-Mail-Adressen zwischen Quellen lösen</p>
          </div>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade Konflikte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal-page">
      <div className="page-header">
        <div className="page-title">
          <h1>⚠️ E-Mail-Konflikte</h1>
          <p>Doppelte E-Mail-Adressen zwischen Quellen lösen</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={loadConflicts}>
            🔄 Aktualisieren
          </button>
        </div>
      </div>

      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadConflicts}>
            Erneut versuchen
          </button>
        </div>
      )}

      {/* Konflikt-Übersicht */}
      <div className="content-section">
        <div className="conflicts-summary">
          <div className="summary-card">
            <div className="summary-number">{conflicts.length}</div>
            <div className="summary-label">E-Mail-Konflikte gefunden</div>
          </div>
          {conflicts.length > 0 && (
            <div className="summary-info">
              <p>Die folgenden E-Mail-Adressen existieren in mehreren Quellen und benötigen eine manuelle Auflösung.</p>
            </div>
          )}
        </div>
      </div>

      {conflicts.length === 0 ? (
        <div className="content-section">
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>Keine Konflikte gefunden!</h3>
            <p>Alle E-Mail-Adressen sind eindeutig zwischen den Quellen.</p>
            <button className="btn btn-primary" onClick={loadConflicts}>
              Erneut prüfen
            </button>
          </div>
        </div>
      ) : (
        <div className="content-section">
          <h2>Konflikte ({conflicts.length})</h2>
          <div className="conflicts-list">
            {conflicts.map((conflict, index) => (
              <div key={index} className="conflict-card">
                <div className="conflict-header">
                  <div className="conflict-email">
                    <strong>{conflict.email}</strong>
                  </div>
                  <div className="conflict-sources">
                    {conflict.sources.map(source => (
                      <span key={source} className={`source-badge ${getSourceColor(source)}`}>
                        {getSourceIcon(source)} {source}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="conflict-users">
                  {conflict.users.map((user, userIndex) => (
                    <div key={userIndex} className="conflict-user">
                      <div className="user-info">
                        <span className={`source-badge small ${getSourceColor(user.source)}`}>
                          {getSourceIcon(user.source)}
                        </span>
                        <div className="user-details">
                          <div className="user-name">
                            {user.displayName || 'Unbekannter Name'}
                          </div>
                          <div className="user-meta">
                            {formatDate(user.lastSync)} • {user.isActive ? 'Aktiv' : 'Inaktiv'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="conflict-actions">
                  <div className="suggested-resolution">
                    <span className="suggestion-label">Empfehlung:</span>
                    <span className={`source-badge ${getSourceColor(getSuggestedKeepSource(conflict))}`}>
                      {getSourceIcon(getSuggestedKeepSource(conflict))} {getSuggestedKeepSource(conflict)} behalten
                    </span>
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setSelectedConflict(conflict)}
                  >
                    Konflikt lösen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Konflikt-Auflösung Modal */}
      {selectedConflict && (
        <div className="modal-overlay" onClick={() => setSelectedConflict(null)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Konflikt lösen: {selectedConflict.email}</h3>
              <button className="modal-close" onClick={() => setSelectedConflict(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="resolution-info">
                <p>Diese E-Mail-Adresse existiert in <strong>{selectedConflict.sources.length} Quellen</strong>:</p>
                <div className="conflicted-sources">
                  {selectedConflict.sources.map(source => (
                    <span key={source} className={`source-badge ${getSourceColor(source)}`}>
                      {getSourceIcon(source)} {source}
                    </span>
                  ))}
                </div>
              </div>

              <div className="resolution-modes">
                <h4>Auflösungs-Strategie:</h4>
                
                <div className="resolution-option">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="resolutionMode"
                      value="keep"
                      checked={resolutionMode === 'keep'}
                      onChange={(e) => setResolutionMode(e.target.value as 'keep')}
                    />
                    <span className="radio-label">
                      <strong>Eine Quelle behalten</strong> - Andere Einträge löschen
                    </span>
                  </label>
                  
                  {resolutionMode === 'keep' && (
                    <div className="keep-source-selection">
                      <h5>Welche Quelle soll beibehalten werden?</h5>
                      <div className="source-options">
                        {selectedConflict.sources.map(source => {
                          const user = selectedConflict.users.find(u => u.source === source);
                          const isRecommended = source === getSuggestedKeepSource(selectedConflict);
                          
                          return (
                            <label key={source} className={`source-option ${isRecommended ? 'recommended' : ''}`}>
                              <input
                                type="radio"
                                name="keepSource"
                                value={source}
                                checked={keepSource === source}
                                onChange={(e) => setKeepSource(e.target.value)}
                              />
                              <div className="source-option-content">
                                <div className="source-header">
                                  <span className={`source-badge ${getSourceColor(source)}`}>
                                    {getSourceIcon(source)} {source}
                                  </span>
                                  {isRecommended && <span className="recommended-badge">Empfohlen</span>}
                                </div>
                                <div className="source-details">
                                  <div className="user-name">{user?.displayName || 'Unbekannter Name'}</div>
                                  <div className="user-meta">
                                    {user ? formatDate(user.lastSync) : 'N/A'} • {user?.isActive ? 'Aktiv' : 'Inaktiv'}
                                  </div>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="resolution-option">
                  <label className="radio-option">
                    <input
                      type="radio"
                      name="resolutionMode"
                      value="merge"
                      checked={resolutionMode === 'merge'}
                      onChange={(e) => setResolutionMode(e.target.value as 'merge')}
                      disabled={true}
                    />
                    <span className="radio-label disabled">
                      <strong>Daten zusammenführen</strong> - Alle Informationen vereinen (Coming Soon)
                    </span>
                  </label>
                </div>
              </div>

              <div className="resolution-warning">
                <div className="warning-box">
                  <span className="warning-icon">⚠️</span>
                  <div>
                    <strong>Wichtiger Hinweis:</strong>
                    <p>Diese Aktion kann nicht rückgängig gemacht werden. User-Daten aus den nicht ausgewählten Quellen werden dauerhaft gelöscht.</p>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedConflict(null);
                    setKeepSource('');
                    setResolutionMode('keep');
                  }}
                >
                  Abbrechen
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={() => handleResolveConflict(selectedConflict, keepSource)}
                  disabled={!keepSource}
                >
                  Konflikt lösen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hilfe-Sektion */}
      <div className="content-section">
        <h2>Konflikt-Auflösung - Hilfe</h2>
        <div className="help-content">
          <div className="help-section">
            <h3>Was sind E-Mail-Konflikte?</h3>
            <p>E-Mail-Konflikte entstehen, wenn dieselbe E-Mail-Adresse in mehreren User-Quellen vorhanden ist. Dies kann zu Verwirrung führen und sollte aufgelöst werden.</p>
          </div>
          
          <div className="help-section">
            <h3>Empfohlene Auflösung nach Quelle:</h3>
            <div className="priority-list">
              <div className="priority-item">
                <span className="source-badge source-entra">🏢 Entra ID</span>
                <div>
                  <strong>Höchste Priorität</strong> - Autorisierte Unternehmens-Quelle
                  <p>Meist die vertrauenswürdigste und aktuellste Quelle</p>
                </div>
              </div>
              <div className="priority-item">
                <span className="source-badge source-ldap">🗂️ LDAP</span>
                <div>
                  <strong>Hohe Priorität</strong> - Zentrale Verzeichnis-Quelle
                  <p>Gut für organisatorische Informationen</p>
                </div>
              </div>
              <div className="priority-item">
                <span className="source-badge source-manual">✋ Manual</span>
                <div>
                  <strong>Mittlere Priorität</strong> - Manuell gepflegte Daten
                  <p>Kann spezielle oder ergänzende Informationen enthalten</p>
                </div>
              </div>
              <div className="priority-item">
                <span className="source-badge source-upload">📊 Upload</span>
                <div>
                  <strong>Niedrige Priorität</strong> - Einmalige Uploads
                  <p>Oft temporäre oder veraltete Daten</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictsPage;
