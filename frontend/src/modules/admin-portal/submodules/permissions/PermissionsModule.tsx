import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RolesPage from './pages/RolesPage';
import GroupsPage from './pages/GroupsPage';
import TokensPage from './pages/TokensPage';
import AuditPage from './pages/AuditPage';
import HierarchyPage from './pages/HierarchyPage';

const PermissionsModule: React.FC = () => {
  return (
    <div className="permissions-submodule">
      <Routes>
        <Route path="/" element={<Navigate to="/admin-portal/permissions/hierarchy" replace />} />
        <Route path="/hierarchy" element={<HierarchyPage />} />
        <Route path="/roles" element={<RolesPage />} />
        <Route path="/groups" element={<GroupsPage />} />
        <Route path="/tokens" element={<TokensPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="*" element={<Navigate to="/admin-portal/permissions/hierarchy" replace />} />
      </Routes>
    </div>
  );
};

export default PermissionsModule;
