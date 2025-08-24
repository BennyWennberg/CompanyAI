import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const userRoles = [
    {
      id: 'admin',
      name: 'Administrator',
      description: 'Vollzugriff auf alle Module',
      token: 'YWRtaW5AY29tcGFueS5jb20=',
      permissions: ['HR: Vollzugriff', 'Support: Vollzugriff', 'System: Admin']
    },
    {
      id: 'hr_manager',
      name: 'HR Manager',
      description: 'Vollzugriff auf HR-Module',
      token: 'aHIubWFuYWdlckBjb21wYW55LmNvbQ==',
      permissions: ['HR: Vollzugriff', 'Reports: Schreibzugriff']
    },
    {
      id: 'hr_specialist',
      name: 'HR Specialist',
      description: 'Eingeschränkter HR-Zugriff',
      token: 'aHIuc3BlY2lhbGlzdEBjb21wYW55LmNvbQ==',
      permissions: ['HR: Lesezugriff', 'Onboarding: Schreibzugriff']
    }
  ];

  const handleLogin = async () => {
    if (!selectedRole) return;

    setIsLoading(true);
    
    const role = userRoles.find(r => r.id === selectedRole);
    if (role) {
      // Simuliere API-Call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Token speichern
      localStorage.setItem('authToken', role.token);
      localStorage.setItem('userRole', role.id);
      localStorage.setItem('userName', role.name);
      
      // Zur Hauptseite weiterleiten
      navigate('/');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="auth-form">
      <div className="login-header">
        <h2>Anmeldung</h2>
        <p>Wählen Sie Ihre Rolle für den Demo-Zugang</p>
      </div>

      <div className="role-selection">
        <label className="form-label">Benutzerrolle auswählen:</label>
        <div className="role-options">
          {userRoles.map((role) => (
            <div
              key={role.id}
              className={`role-option ${selectedRole === role.id ? 'selected' : ''}`}
              onClick={() => setSelectedRole(role.id)}
            >
              <div className="role-header">
                <div className="role-radio">
                  <input
                    type="radio"
                    name="role"
                    value={role.id}
                    checked={selectedRole === role.id}
                    onChange={() => setSelectedRole(role.id)}
                  />
                </div>
                <div className="role-info">
                  <h3>{role.name}</h3>
                  <p>{role.description}</p>
                </div>
              </div>
              <div className="role-permissions">
                <strong>Berechtigungen:</strong>
                <ul>
                  {role.permissions.map((permission, index) => (
                    <li key={index}>{permission}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        className="form-button"
        onClick={handleLogin}
        disabled={!selectedRole || isLoading}
      >
        {isLoading ? 'Anmelden...' : 'Anmelden'}
      </button>

      <div className="login-info">
        <h4>Demo-Modus Information:</h4>
        <p>
          Diese Anwendung läuft im Demo-Modus mit Mock-Authentifizierung.
          Wählen Sie eine Rolle um verschiedene Berechtigungsebenen zu testen.
        </p>
        <div className="api-info">
          <strong>Backend API:</strong> http://localhost:5000<br />
          <strong>API-Dokumentation:</strong> <a href="http://localhost:5000/api/hello" target="companyai-api-docs" rel="noopener noreferrer">API Übersicht</a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
