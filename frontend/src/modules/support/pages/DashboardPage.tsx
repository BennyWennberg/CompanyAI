import React from 'react';
import '../styles/SupportPages.css';

const DashboardPage: React.FC = () => {
  return (
    <div className="support-page">
      <div className="page-header">
        <div className="page-title">
          <h1>📊 Support-Dashboard</h1>
          <p>Übersicht über Support-Metriken und Ticket-Statistiken</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">
            📈 Export-Bericht
          </button>
        </div>
      </div>

      <div className="content-section">
        <div className="feature-preview">
          <div className="preview-icon">📊</div>
          <h3>Support-Dashboard in Entwicklung</h3>
          <p>
            Diese Seite wird eine umfassende Übersicht über alle Support-Metriken,
            Ticket-Statistiken und Performance-Kennzahlen bereitstellen.
          </p>
          
          <div className="planned-features">
            <h4>Geplante Features:</h4>
            <ul>
              <li>✅ Ticket-Verwaltung (bereits verfügbar)</li>
              <li>🔄 Ticket-Statistiken und Trends</li>
              <li>🔄 Agent-Performance-Metriken</li>
              <li>🔄 SLA-Monitoring</li>
              <li>🔄 Customer-Satisfaction-Tracking</li>
              <li>🔄 Interaktive Charts und Graphen</li>
            </ul>
          </div>

          <div className="api-info">
            <h4>Verfügbare Backend-API:</h4>
            <code>GET /api/support/tickets</code><br />
            <code>POST /api/support/tickets</code><br />
            <code>PUT /api/support/tickets/:id</code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
