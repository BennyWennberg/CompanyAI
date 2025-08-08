import React from 'react';
import '../styles/HRPages.css';

const OnboardingPage: React.FC = () => {
  return (
    <div className="hr-page">
      <div className="page-header">
        <div className="page-title">
          <h1>🎯 Onboarding-Verwaltung</h1>
          <p>Automatische Einarbeitungspläne und Aufgabenverfolgung</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary">
            ➕ Neuer Onboarding-Plan
          </button>
        </div>
      </div>

      <div className="content-section">
        <div className="feature-preview">
          <div className="preview-icon">🚧</div>
          <h3>Onboarding-Verwaltung in Entwicklung</h3>
          <p>
            Diese Seite wird die automatische Generierung von Onboarding-Plänen,
            Aufgabenverfolgung und abteilungsspezifische Templates enthalten.
          </p>
          
          <div className="planned-features">
            <h4>Geplante Features:</h4>
            <ul>
              <li>✅ Automatische Plan-Generierung (Backend verfügbar)</li>
              <li>🔄 Aufgaben-Dashboard</li>
              <li>🔄 Abteilungs-Templates</li>
              <li>🔄 Fortschritts-Tracking</li>
              <li>🔄 E-Mail-Benachrichtigungen</li>
            </ul>
          </div>

          <div className="api-info">
            <h4>Verfügbare Backend-API:</h4>
            <code>POST /api/hr/onboarding/plans</code><br />
            <code>PUT /api/hr/onboarding/plans/:id/tasks/:taskId</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;
