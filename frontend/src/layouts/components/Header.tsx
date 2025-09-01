import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { 
  MagnifyingGlassIcon, 
  BellIcon, 
  ChevronDownIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import './Header.css';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const getBreadcrumbs = () => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    
    const breadcrumbs = [{ label: 'Dashboard', path: '/', icon: HomeIcon }];
    
    if (segments[0] === 'hr') {
      breadcrumbs.push({ label: 'Personal', path: '/hr', icon: UserIcon });
      if (segments[1] === 'employees') breadcrumbs.push({ label: 'Mitarbeiter', path: '/hr/employees' });
      if (segments[1] === 'onboarding') breadcrumbs.push({ label: 'Onboarding', path: '/hr/onboarding' });
      if (segments[1] === 'reports') breadcrumbs.push({ label: 'Berichte', path: '/hr/reports' });
    } else if (segments[0] === 'support') {
      breadcrumbs.push({ label: 'Support', path: '/support', icon: UserIcon });
      if (segments[1] === 'tickets') breadcrumbs.push({ label: 'Tickets', path: '/support/tickets' });
      if (segments[1] === 'create') breadcrumbs.push({ label: 'Neues Ticket', path: '/support/create' });
    } else if (segments[0] === 'ai') {
      breadcrumbs.push({ label: 'KI-Assistent', path: '/ai', icon: UserIcon });
    } else if (segments[0] === 'admin-portal') {
      breadcrumbs.push({ label: 'Administration', path: '/admin-portal', icon: Cog6ToothIcon });
    }
    
    return breadcrumbs;
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

  const breadcrumbs = getBreadcrumbs();
  const currentPageTitle = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      console.log('Searching for:', searchQuery);
      // TODO: Implement global search
    }
  };

  return (
    <header className="modern-header">
      <div className="header-container">
        {/* Logo & Company Brand */}
        <div className="header-brand" onClick={() => navigate('/')}>
          {theme.companyLogoUrl && theme.companyLogoUrl !== '/logo.png' ? (
            <img src={theme.companyLogoUrl} alt={theme.companyName} className="company-logo" />
          ) : (
            <div className="company-logo-placeholder">
              {theme.companyName.charAt(0)}
            </div>
          )}
          <div className="brand-text">
            <h1 className="company-name">{theme.companyName}</h1>
            {theme.companySlogan && (
              <span className="company-slogan">{theme.companySlogan}</span>
            )}
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <span className="breadcrumb-separator">/</span>}
              <button
                className={`breadcrumb-item ${
                  index === breadcrumbs.length - 1 ? 'current' : 'clickable'
                }`}
                onClick={() => index < breadcrumbs.length - 1 && navigate(crumb.path)}
                disabled={index === breadcrumbs.length - 1}
              >
                {crumb.icon && index === 0 && <crumb.icon className="breadcrumb-icon" />}
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Search & Actions */}
        <div className="header-actions">
          {/* Global Search */}
          <form className="search-form" onSubmit={handleSearch}>
            <div className="search-input-container">
              <MagnifyingGlassIcon className="search-icon" />
              <input
                type="text"
                placeholder="Suchen..."
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </form>

          {/* Notifications */}
          <button className="notification-btn" title="Benachrichtigungen">
            <BellIcon className="notification-icon" />
            <span className="notification-badge">3</span>
          </button>

          {/* User Menu */}
          <div className="user-menu" onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}>
            <div className="user-avatar">
              {userInfo.initials}
            </div>
            <div className="user-details">
              <span className="user-name">{userInfo.name}</span>
              <span className="user-role">{userInfo.role}</span>
            </div>
            <ChevronDownIcon className={`dropdown-icon ${isUserMenuOpen ? 'open' : ''}`} />
            
            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="user-dropdown">
                <div className="dropdown-header">
                  <div className="user-avatar-large">{userInfo.initials}</div>
                  <div>
                    <div className="dropdown-user-name">{userInfo.name}</div>
                    <div className="dropdown-user-role">{userInfo.role}</div>
                  </div>
                </div>
                
                <div className="dropdown-divider" />
                
                <button className="dropdown-item" onClick={() => navigate('/profile')}>
                  <UserIcon className="dropdown-icon-item" />
                  Mein Profil
                </button>
                
                <button className="dropdown-item" onClick={() => navigate('/settings')}>
                  <Cog6ToothIcon className="dropdown-icon-item" />
                  Einstellungen
                </button>
                
                <div className="dropdown-divider" />
                
                <button className="dropdown-item danger" onClick={handleLogout}>
                  <ArrowRightOnRectangleIcon className="dropdown-icon-item" />
                  Abmelden
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page Title Bar - Only show on non-dashboard pages */}
      {location.pathname !== '/' && (
        <div className="page-title-bar">
          <div className="header-container">
            <h2 className="page-title">{currentPageTitle}</h2>
            <div className="page-actions">
              <span className="version-badge">v{theme.appVersion}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
