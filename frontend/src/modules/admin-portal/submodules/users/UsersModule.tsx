import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UsersOverviewPage from './pages/UsersOverviewPage';
import SyncManagementPage from './pages/SyncManagementPage';
import UploadPage from './pages/UploadPage';
import ManualUsersPage from './pages/ManualUsersPage';
import ConflictsPage from './pages/ConflictsPage';

const UsersModule: React.FC = () => {
  return (
    <div className="users-submodule">
      <Routes>
        <Route path="/" element={<Navigate to="/admin-portal/users/overview" replace />} />
        <Route path="/overview" element={<UsersOverviewPage />} />
        <Route path="/sync" element={<SyncManagementPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/manual" element={<ManualUsersPage />} />
        <Route path="/conflicts" element={<ConflictsPage />} />
        <Route path="*" element={<Navigate to="/admin-portal/users/overview" replace />} />
      </Routes>
    </div>
  );
};

export default UsersModule;
