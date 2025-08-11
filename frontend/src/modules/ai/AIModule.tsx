import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AIChatPage from './AIChatPage';

const AIModule: React.FC = () => {
  return (
    <div className="ai-module">
      <Routes>
        <Route path="/" element={<Navigate to="/ai/chat" replace />} />
        <Route path="/chat" element={<AIChatPage />} />
        <Route path="*" element={<Navigate to="/ai/chat" replace />} />
      </Routes>
    </div>
  );
};

export default AIModule;


