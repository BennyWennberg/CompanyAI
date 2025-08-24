import React, { useState, useEffect } from 'react';
import '../styles/PermissionsPages.css';

interface APIToken {
  id: string;
  name: string;
  token: string;
  permissions: string[];
  expiresAt: string | null;
  lastUsed: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: string;
}

const TokensPage: React.FC = () => {
  const [tokens, setTokens] = useState<APIToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const response = await fetch('http://localhost:5000/api/admin-portal/permissions/tokens', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success && result.data) {
        setTokens(result.data);
      } else {
        setError(result.message || 'Fehler beim Laden der API-Tokens');
      }
    } catch (err) {
      setError('Verbindungsfehler zum Backend');
      console.error('Fehler beim Laden der API-Tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (!confirm('Möchten Sie diesen API-Token wirklich widerrufen?')) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`http://localhost:5000/api/admin-portal/permissions/tokens/${tokenId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      if (result.success) {
        await loadTokens();
      } else {
        setError(result.message || 'Fehler beim Widerrufen des Tokens');
      }
    } catch (err) {
      setError('Fehler beim Widerrufen des Tokens');
      console.error('Fehler beim Widerrufen des Tokens:', err);
    }
  };

  if (loading) {
    return (
      <div className="permissions-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Lade API-Tokens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="permissions-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🎫 Token-Verwaltung</h1>
          <p>Verwalten Sie API-Tokens für externe Integrationen</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            Neuen Token erstellen
          </button>
        </div>
      </div>

      {error && (
        <div className="error-state">
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="content-section">
        {tokens.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎫</div>
            <h3>Keine API-Tokens gefunden</h3>
            <p>Erstellen Sie einen neuen Token für externe Integrationen.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              Ersten Token erstellen
            </button>
          </div>
        ) : (
          <div className="tokens-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Berechtigungen</th>
                  <th>Läuft ab</th>
                  <th>Letzte Nutzung</th>
                  <th>Status</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td>
                      <div className="token-info">
                        <strong>{token.name}</strong>
                        <small>Erstellt von {token.createdBy}</small>
                      </div>
                    </td>
                    <td>
                      <div className="permissions-cell">
                        {token.permissions.map((permission, idx) => (
                          <span key={idx} className="permission-tag small">
                            {permission}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {token.expiresAt ? (
                        <span className="expires-date">
                          {new Date(token.expiresAt).toLocaleDateString('de-DE')}
                        </span>
                      ) : (
                        <span className="never-expires">Läuft nie ab</span>
                      )}
                    </td>
                    <td>
                      {token.lastUsed ? (
                        <span className="last-used">
                          {new Date(token.lastUsed).toLocaleDateString('de-DE')}
                        </span>
                      ) : (
                        <span className="never-used">Nie verwendet</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${token.isActive ? 'active' : 'inactive'}`}>
                        {token.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td>
                      <div className="token-actions">
                        <button 
                          className="btn btn-small btn-outline"
                          onClick={() => handleRevokeToken(token.id)}
                          disabled={!token.isActive}
                        >
                          Widerrufen
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Form Modal würde hier hin */}
      {showCreateForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Neuen API-Token erstellen</h3>
              <button 
                className="modal-close"
                onClick={() => setShowCreateForm(false)}
              >
                ✕
              </button>
            </div>
            {/* Form-Inhalt würde hier hin */}
            <p>Token-Erstellungs-Form folgt...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokensPage;
