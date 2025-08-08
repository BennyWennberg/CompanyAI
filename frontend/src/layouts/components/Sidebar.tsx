import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navigationItems = [
    {
      title: 'Dashboard',
      path: '/',
      icon: '📊',
      active: location.pathname === '/'
    },
    {
      title: 'HR Module',
      path: '/hr',
      icon: '👥',
      active: location.pathname.startsWith('/hr'),
      submenu: [
        { title: 'Mitarbeiter', path: '/hr/employees', icon: '👤' },
        { title: 'Onboarding', path: '/hr/onboarding', icon: '🎯' },
        { title: 'Berichte', path: '/hr/reports', icon: '📈' },
        { title: 'Statistiken', path: '/hr/stats', icon: '📊' }
      ]
    },
    {
      title: 'Support Module',
      path: '/support',
      icon: '🎫',
      active: location.pathname.startsWith('/support'),
      submenu: [
        { title: 'Tickets', path: '/support/tickets', icon: '📋' },
        { title: 'Neues Ticket', path: '/support/create', icon: '➕' },
        { title: 'Dashboard', path: '/support/dashboard', icon: '📊' }
      ]
    },
    {
      title: 'Einstellungen',
      path: '/settings',
      icon: '⚙️',
      active: location.pathname.startsWith('/settings')
    }
  ];

  return (
    <aside className="main-sidebar">
      <nav className="sidebar-nav">
        <div className="nav-section">
          <h3 className="nav-title">Navigation</h3>
          <ul className="nav-list">
            {navigationItems.map((item) => (
              <li key={item.path} className="nav-item">
                <NavLink
                  to={item.path}
                  className={({ isActive }) => 
                    `nav-link ${isActive || item.active ? 'active' : ''}`
                  }
                  end={item.path === '/'}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-text">{item.title}</span>
                </NavLink>
                
                {item.submenu && item.active && (
                  <ul className="submenu">
                    {item.submenu.map((subItem) => (
                      <li key={subItem.path} className="submenu-item">
                        <NavLink
                          to={subItem.path}
                          className={({ isActive }) => 
                            `submenu-link ${isActive ? 'active' : ''}`
                          }
                        >
                          <span className="submenu-icon">{subItem.icon}</span>
                          <span className="submenu-text">{subItem.title}</span>
                        </NavLink>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="nav-section">
          <h3 className="nav-title">Module Status</h3>
          <div className="module-status">
            <div className="status-item">
              <span className="status-indicator hr"></span>
              <span className="status-text">HR: Aktiv</span>
            </div>
            <div className="status-item">
              <span className="status-indicator support"></span>
              <span className="status-text">Support: Aktiv</span>
            </div>
            <div className="status-item">
              <span className="status-indicator inactive"></span>
              <span className="status-text">Produktion: Geplant</span>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
