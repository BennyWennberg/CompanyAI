import React, { useState } from 'react';
import '../styles/HRPages.css';
import SchemaManagerModal from '../components/SchemaManagerModal';

const ReportsPage: React.FC = () => {
  const [schemaManagerOpen, setSchemaManagerOpen] = useState(false);

  return (
    <div className="hr-page">
      <div className="page-header">
        <div className="page-title">
          <h1>📈 HR-Berichte</h1>
          <p>Detaillierte Analysen und Berichte für HR-Management</p>
        </div>
        <div className="page-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setSchemaManagerOpen(true)}
            title="Feldtypen für alle Mitarbeiter verwalten"
          >
            📊 Zusätzliche Informationen
          </button>
          <button className="btn btn-secondary">
            📈 Neuer Bericht
          </button>
        </div>
      </div>

      <div className="content-section">
        <div className="feature-preview">
          <div className="preview-icon">📊</div>
          <h3>HR-Reporting in Entwicklung</h3>
          <p>
            Diese Seite wird umfassende HR-Berichte, Analysen und 
            exportierbare Reports bereitstellen.
          </p>
          
          <div className="planned-features">
            <h4>Geplante Features:</h4>
            <ul>
              <li>✅ Report-Generierung (Backend verfügbar)</li>
              <li>🔄 Interaktive Dashboards</li>
              <li>🔄 Export-Funktionen (PDF, Excel)</li>
              <li>🔄 Zeitraum-Analysen</li>
              <li>🔄 Trend-Visualisierungen</li>
            </ul>
          </div>

          <div className="api-info">
            <h4>Verfügbare Backend-API:</h4>
            <code>POST /api/hr/reports</code><br />
            <code>POST /api/hr/reports/detailed</code>
          </div>
        </div>
      </div>

      {/* Schema Manager Modal */}
      <SchemaManagerModal
        isOpen={schemaManagerOpen}
        onClose={() => setSchemaManagerOpen(false)}
        onSchemasUpdated={() => {}}
      />
    </div>
  );
};

export default ReportsPage;
