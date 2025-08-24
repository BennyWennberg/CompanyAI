import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './pages/DashboardPage';
import StatsPage from './pages/StatsPage';
import DatabasePage from './pages/DatabasePage';

const SystemModule: React.FC = () => {
  return (
    <div className="system-submodule">
      <Routes>
        <Route path="/" element={<Navigate to="/admin-portal/system/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/database" element={<DatabasePage />} />
        <Route path="*" element={<Navigate to="/admin-portal/system/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default SystemModule;
