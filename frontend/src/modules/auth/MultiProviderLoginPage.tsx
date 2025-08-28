import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './MultiProviderLogin.css';

type AuthProvider = 'admin' | 'manual' | 'entra' | 'ldap';

interface LoginCredentials {
  admin: {
    // Keine Felder - Admin-Login ist direkt
  };
  manual: {
    username: string;
    password: string;
  };
  entra: {
    email?: string;
  };
  ldap: {
    username: string;
    password: string;
    domain: string;
  };
}

const MultiProviderLoginPage: React.FC = () => {
  const [activeProvider, setActiveProvider] = useState<AuthProvider>('admin');
  const [credentials, setCredentials] = useState<LoginCredentials>({
    admin: {}, // Keine Credentials nötig
    manual: { username: '', password: '' },
    entra: { email: '' },
    ldap: { username: '', password: '', domain: 'COMPANY' }
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  // Provider-Konfiguration mit Icons und Beschreibungen
  const providers = [
    {
      id: 'admin' as AuthProvider,
      name: 'Administrator',
      icon: '🔑',
      description: 'System-Administrator Token',
      color: '#dc2626'
    },
    {
      id: 'manual' as AuthProvider,
      name: 'Benutzername',
      icon: '👤',
      description: 'Lokale CompanyAI-Benutzer',
      color: '#2563eb'
    },
    {
      id: 'entra' as AuthProvider,
      name: 'Microsoft',
      icon: '🏢',
      description: 'Entra AD Firmen-Account',
      color: '#0078d4'
    },
    {
      id: 'ldap' as AuthProvider,
      name: 'Active Directory',
      icon: '🖥️',
      description: 'LDAP Domain Controller',
      color: '#059669'
    }
  ];

  // Credentials für aktuellen Provider aktualisieren
  const updateCredentials = (field: string, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [activeProvider]: {
        ...prev[activeProvider],
        [field]: value
      }
    }));
    // Fehler für diesen Provider löschen
    if (errors[activeProvider]) {
      setErrors(prev => ({ ...prev, [activeProvider]: '' }));
    }
  };

  // Admin Login (direkt ohne Token)
  const handleAdminLogin = async () => {
    // Direkter Administrator-Login ohne Token-Eingabe
    const adminToken = 'YWRtaW5AY29tcGFueS5jb20='; // Standard Admin-Token
    
    localStorage.setItem('authToken', adminToken);
    localStorage.setItem('userRole', 'admin');
    localStorage.setItem('userName', 'Administrator');
    navigate('/');
  };

  // 🧪 TEST-USER Login (für Permission-Testing)
  const handleTestUserLogin = async () => {
    // Simulierter normaler User für Permission-Testing
    const testUserToken = 'dGVzdC51c2VyQGNvbXBhbnkuY29t'; // test.user@company.com
    
    localStorage.setItem('authToken', testUserToken);
    localStorage.setItem('userRole', 'user');
    localStorage.setItem('userName', 'Test User');
    localStorage.setItem('userEmail', 'test.user@company.com');
    localStorage.setItem('userDepartment', 'standard');
    navigate('/');
  };

  // Manual Username/Password Login
  const handleManualLogin = async () => {
    const { username, password } = credentials.manual;
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/manual-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();
      if (result.success) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('userRole', result.user.role);
        localStorage.setItem('userName', result.user.name);
        navigate('/');
      } else {
        setErrors(prev => ({ ...prev, manual: result.message || 'Anmeldung fehlgeschlagen' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, manual: 'Verbindungsfehler zum Backend' }));
    }
  };

  // Entra AD OAuth Login
  const handleEntraLogin = async () => {
    try {
      // Redirect zur Microsoft OAuth
      const response = await fetch('http://localhost:5000/api/auth/entra-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success && result.redirectUrl) {
        // Zu Microsoft OAuth weiterleiten
        window.location.href = result.redirectUrl;
      } else {
        setErrors(prev => ({ ...prev, entra: result.message || 'Entra AD nicht verfügbar' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, entra: 'Entra AD Verbindungsfehler' }));
    }
  };

  // LDAP Active Directory Login
  const handleLdapLogin = async () => {
    const { username, password, domain } = credentials.ldap;
    
    try {
      const response = await fetch('http://localhost:5000/api/auth/ldap-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, domain })
      });

      const result = await response.json();
      if (result.success) {
        localStorage.setItem('authToken', result.token);
        localStorage.setItem('userRole', result.user.role);
        localStorage.setItem('userName', result.user.name);
        navigate('/');
      } else {
        setErrors(prev => ({ ...prev, ldap: result.message || 'LDAP-Anmeldung fehlgeschlagen' }));
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, ldap: 'LDAP-Server nicht erreichbar' }));
    }
  };

  // Provider-spezifische Login-Handler
  const handleLogin = async () => {
    setLoading(true);
    setErrors({});

    try {
      switch (activeProvider) {
        case 'admin':
          await handleAdminLogin();
          break;
        case 'manual':
          await handleManualLogin();
          break;
        case 'entra':
          await handleEntraLogin();
          break;
        case 'ldap':
          await handleLdapLogin();
          break;
      }
    } finally {
      setLoading(false);
    }
  };

  // Form-Validation
  const isFormValid = () => {
    switch (activeProvider) {
      case 'admin':
        return true; // Admin braucht keine Eingaben
      case 'manual':
        return credentials.manual.username && credentials.manual.password;
      case 'entra':
        return true; // OAuth braucht keine Eingaben
      case 'ldap':
        return credentials.ldap.username && credentials.ldap.password;
      default:
        return false;
    }
  };

  // Provider-spezifische Form-Komponenten
  const renderForm = () => {
    switch (activeProvider) {
      case 'admin':
        return (
          <div className="auth-form-content">
            <div className="admin-login-info">
              <div className="admin-icon">🔐</div>
              <h3>Administrator-Zugang</h3>
              <p>Vollzugriff auf alle CompanyAI-Module und -Einstellungen</p>
              
              <div className="admin-permissions">
                <div className="permission-item">
                  <span className="permission-icon">✅</span>
                  <span>HR-Modul: Vollzugriff</span>
                </div>
                <div className="permission-item">
                  <span className="permission-icon">✅</span>
                  <span>Admin-Portal: Vollzugriff</span>
                </div>
                <div className="permission-item">
                  <span className="permission-icon">✅</span>
                  <span>Support: Vollzugriff</span>
                </div>
                <div className="permission-item">
                  <span className="permission-icon">✅</span>
                  <span>AI & RAG: Vollzugriff</span>
                </div>
              </div>
            </div>
            
            <small className="field-help">
              Als Administrator haben Sie uneingeschränkten Zugriff auf das gesamte System
            </small>
          </div>
        );
        
      case 'manual':
        return (
          <div className="auth-form-content">
            <div className="form-field">
              <label>Benutzername:</label>
              <input
                type="text"
                placeholder="max.mustermann"
                value={credentials.manual.username}
                onChange={(e) => updateCredentials('username', e.target.value)}
                className={errors.manual ? 'error' : ''}
              />
            </div>
            <div className="form-field">
              <label>Passwort:</label>
              <input
                type="password"
                placeholder="••••••••"
                value={credentials.manual.password}
                onChange={(e) => updateCredentials('password', e.target.value)}
                className={errors.manual ? 'error' : ''}
              />
            </div>
            <small className="field-help">
              Für lokale CompanyAI-Benutzer
            </small>
          </div>
        );
        
      case 'entra':
        return (
          <div className="auth-form-content">
            <div className="oauth-info">
              <div className="oauth-icon">🏢</div>
              <h3>Microsoft Entra AD</h3>
              <p>Mit Ihrem Firmen-Microsoft-Konto anmelden</p>
            </div>
            <small className="field-help">
              Sie werden zu Microsoft weitergeleitet und kehren automatisch zurück
            </small>
          </div>
        );
        
      case 'ldap':
        return (
          <div className="auth-form-content">
            <div className="form-field">
              <label>Benutzername:</label>
              <input
                type="text"
                placeholder="max.mustermann"
                value={credentials.ldap.username}
                onChange={(e) => updateCredentials('username', e.target.value)}
                className={errors.ldap ? 'error' : ''}
              />
            </div>
            <div className="form-field">
              <label>Passwort:</label>
              <input
                type="password"
                placeholder="••••••••"
                value={credentials.ldap.password}
                onChange={(e) => updateCredentials('password', e.target.value)}
                className={errors.ldap ? 'error' : ''}
              />
            </div>
            <div className="form-field">
              <label>Domain:</label>
              <select
                value={credentials.ldap.domain}
                onChange={(e) => updateCredentials('domain', e.target.value)}
              >
                <option value="COMPANY">COMPANY</option>
                <option value="COMPANY.LOCAL">COMPANY.LOCAL</option>
                <option value="">Andere...</option>
              </select>
            </div>
            <small className="field-help">
              Active Directory Domain-Controller Anmeldung
            </small>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="multi-provider-auth">
      <div className="auth-header">
        <h2>CompanyAI Anmeldung</h2>
        <p>Wählen Sie Ihre Anmeldeart</p>
      </div>

      {/* Provider Tabs */}
      <div className="provider-tabs">
        {providers.map((provider) => (
          <button
            key={provider.id}
            className={`provider-tab ${activeProvider === provider.id ? 'active' : ''}`}
            onClick={() => setActiveProvider(provider.id)}
            style={{ '--tab-color': provider.color } as React.CSSProperties}
          >
            <span className="tab-icon">{provider.icon}</span>
            <span className="tab-name">{provider.name}</span>
          </button>
        ))}
      </div>

      {/* Aktiver Provider Info */}
      <div className="active-provider-info">
        <div className="provider-details">
          <span className="provider-icon">
            {providers.find(p => p.id === activeProvider)?.icon}
          </span>
          <div>
            <h3>{providers.find(p => p.id === activeProvider)?.name}</h3>
            <p>{providers.find(p => p.id === activeProvider)?.description}</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="auth-form">
        {renderForm()}
        
        {/* Error Display */}
        {errors[activeProvider] && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {errors[activeProvider]}
          </div>
        )}

        {/* Login Button */}
        <button
          className="auth-submit-btn"
          onClick={handleLogin}
          disabled={!isFormValid() || loading}
        >
          {loading ? (
            <span>
              <span className="loading-spinner"></span>
              {activeProvider === 'admin' && 'Administrator-Zugang wird aktiviert...'}
              {activeProvider === 'manual' && 'Anmeldung läuft...'}
              {activeProvider === 'entra' && 'Weiterleitung zu Microsoft...'}
              {activeProvider === 'ldap' && 'Verbindung zum Domain Controller...'}
            </span>
          ) : (
            <span>
              {activeProvider === 'admin' && 'Als Administrator anmelden'}
              {activeProvider === 'manual' && 'Anmelden'}
              {activeProvider === 'entra' && 'Mit Microsoft anmelden'}
              {activeProvider === 'ldap' && 'Anmelden'}
            </span>
          )}
        </button>

        {/* 🧪 TEST-USER Button (nur für Permission-Testing) */}
        {activeProvider === 'admin' && (
          <button
            className="auth-submit-btn test-user-btn"
            onClick={handleTestUserLogin}
            disabled={loading}
            style={{ 
              marginTop: '12px', 
              background: '#6b7280', 
              opacity: 0.8,
              fontSize: '0.9rem'
            }}
          >
            🧪 Als Test-User anmelden (für Permission-Tests)
          </button>
        )}
      </div>

      {/* Info Footer */}
      <div className="auth-info">
        <h4>Multi-Provider Authentifizierung</h4>
        <div className="provider-status">
          <div className="status-item">
            <span className="status-dot active"></span>
            <span>Administrator Token: Aktiv</span>
          </div>
          <div className="status-item">
            <span className="status-dot pending"></span>
            <span>Manual Auth: In Entwicklung</span>
          </div>
          <div className="status-item">
            <span className="status-dot pending"></span>
            <span>Entra AD: In Entwicklung</span>
          </div>
          <div className="status-item">
            <span className="status-dot pending"></span>
            <span>LDAP: In Entwicklung</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiProviderLoginPage;
