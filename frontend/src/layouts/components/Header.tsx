import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import './Header.css';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { theme } = useTheme();

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
    return `${theme.companyName} Dashboard`;
  };

  const getCurrentModule = () => {
    const path = location.pathname;
    if (path.startsWith('/hr')) return 'hr';
    if (path.startsWith('/support')) return 'support';
    return 'dashboard';
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    navigate('/login');
  };

  const getUserInfo = () => {
    const userName = localStorage.getItem('userName') || 'User';
    const userRole = localStorage.getItem('userRole') || 'guest';
    
    const roleMap: Record<string, string> = {
      'admin': 'Administrator',
      'hr_manager': 'HR Manager', 
      'hr_specialist': 'HR Specialist',
      'guest': 'Gast'
    };
    
    return {
      name: userName,
      role: roleMap[userRole] || userRole,
      initials: userName.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
    };
  };

  const userInfo = getUserInfo();

  return (
    <header className="main-header">
      <div className="header-left">
        <div className="logo" onClick={() => navigate('/')}>
          {theme.companyLogoUrl && theme.companyLogoUrl !== '/logo.png' ? (
            <img src={theme.companyLogoUrl} alt={theme.companyName} style={{ height: '32px', marginRight: '8px' }} />
          ) : null}
          <div>
            <h1>{theme.companyName}</h1>
            <span className="version">{theme.appVersion}</span>
          </div>
        </div>
        <div className="page-title">
          <h2>{getPageTitle()}</h2>
          <div className="breadcrumb">
            <span className={`module-badge ${getCurrentModule()}`}>
              {getCurrentModule().toUpperCase()}
            </span>
            {theme.companySlogan && (
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', marginLeft: '8px' }}>
                {theme.companySlogan}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="header-right">
        <div className="user-info">
          <div className="user-details">
            <span className="user-name">{userInfo.name}</span>
            <span className="user-role">{userInfo.role}</span>
          </div>
          <div className="user-avatar">
            {userInfo.initials}
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
