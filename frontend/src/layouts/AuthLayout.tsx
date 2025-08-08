import React from 'react';
import './AuthLayout.css';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ 
  children, 
  title = "CompanyAI", 
  subtitle = "Modulbasierte Unternehmens-KI" 
}) => {
  return (
    <div className="auth-layout">
      <div className="auth-background">
        <div className="auth-pattern"></div>
      </div>
      
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <h1>{title}</h1>
            <span className="version">v2.0</span>
          </div>
          <p className="auth-subtitle">{subtitle}</p>
        </div>
        
        <div className="auth-content">
          {children}
        </div>
        
        <div className="auth-footer">
          <p>&copy; 2024 CompanyAI. Modulbasierte Architektur.</p>
          <div className="auth-links">
            <a href="#" className="auth-link">Dokumentation</a>
            <a href="#" className="auth-link">Support</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
