import React from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import './MainLayout.css';

interface MainLayoutProps {
  children: React.ReactNode;
  mode?: 'default' | 'fullwidth' | 'compact';
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, mode = 'default' }) => {
  return (
    <div className={`main-layout ${mode}`}>
      <Header />
      <div className="layout-content">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
