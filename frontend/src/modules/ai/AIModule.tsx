import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AIChatPage from './pages/AIChatPage';
import DocsPage from './pages/DocsPage';

const AIModule: React.FC = () => {
  return (
    <div className="ai-module">
      <Routes>
        <Route path="/" element={<Navigate to="/ai/chat" replace />} />
        <Route path="/chat" element={<AIChatPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="*" element={<Navigate to="/ai/chat" replace />} />
      </Routes>
    </div>
  );
};

export default AIModule;


