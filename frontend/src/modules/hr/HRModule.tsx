import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EmployeesPage from './pages/EmployeesPage';
import OnboardingPage from './pages/OnboardingPage';
import ReportsPage from './pages/ReportsPage';
import StatsPage from './pages/StatsPage';

const HRModule: React.FC = () => {
  return (
    <div className="hr-module">
      <Routes>
        <Route path="/" element={<Navigate to="/hr/employees" replace />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="*" element={<Navigate to="/hr/employees" replace />} />
      </Routes>
    </div>
  );
};

export default HRModule;
