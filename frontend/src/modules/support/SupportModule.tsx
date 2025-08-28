import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TicketsPage from './pages/TicketsPage';
import CreateTicketPage from './pages/CreateTicketPage';
import DashboardPage from './pages/DashboardPage';
import TicketDetailPage from './pages/TicketDetailPage';

const SupportModule: React.FC = () => {
  return (
    <div className="support-module">
      <Routes>
        <Route path="/" element={<Navigate to="/support/tickets" replace />} />
        <Route path="/tickets" element={<TicketsPage />} />
        <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
        <Route path="/create" element={<CreateTicketPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/support/tickets" replace />} />
      </Routes>
    </div>
  );
};

export default SupportModule;
