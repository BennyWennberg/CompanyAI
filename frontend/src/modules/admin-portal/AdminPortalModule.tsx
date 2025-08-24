import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import UsersModule from './submodules/users/UsersModule';
import SystemModule from './submodules/system/SystemModule';
import PermissionsModule from './submodules/permissions/PermissionsModule';

const AdminPortalModule: React.FC = () => {
  return (
    <div className="admin-portal-module">
      <Routes>
        <Route path="/" element={<Navigate to="/admin-portal/system/dashboard" replace />} />
        <Route path="/users/*" element={<UsersModule />} />
        <Route path="/system/*" element={<SystemModule />} />
        <Route path="/permissions/*" element={<PermissionsModule />} />
        <Route path="*" element={<Navigate to="/admin-portal/system/dashboard" replace />} />
      </Routes>
    </div>
  );
};

export default AdminPortalModule;
