import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Header.css';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.startsWith('/hr')) {
      if (path.includes('/employees')) return 'HR - Mitarbeiter-Verwaltung';
      if (path.includes('/onboarding')) return 'HR - Onboarding';
      if (path.includes('/reports')) return 'HR - Berichte';
      return 'HR - Human Resources';
    }
    if (path.startsWith('/support')) {
      if (path.includes('/tickets')) return 'Support - Tickets';
      if (path.includes('/create')) return 'Support - Neues Ticket';
      return 'Support - Kundensupport';
    }
    return 'CompanyAI Dashboard';
  };

  const getCurrentModule = () => {
    const path = location.pathname;
    if (path.startsWith('/hr')) return 'hr';
    if (path.startsWith('/support')) return 'support';
    return 'dashboard';
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    navigate('/login');
  };

  return (
    <header className="main-header">
      <div className="header-left">
        <div className="logo" onClick={() => navigate('/')}>
          <h1>CompanyAI</h1>
          <span className="version">v2.0</span>
        </div>
        <div className="page-title">
          <h2>{getPageTitle()}</h2>
          <div className="breadcrumb">
            <span className={`module-badge ${getCurrentModule()}`}>
              {getCurrentModule().toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      
      <div className="header-right">
        <div className="user-info">
          <div className="user-details">
            <span className="user-name">HR Manager</span>
            <span className="user-role">Vollzugriff</span>
          </div>
          <div className="user-avatar">
            HM
          </div>
        </div>
        
        <button className="logout-btn" onClick={handleLogout} title="Abmelden">
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
