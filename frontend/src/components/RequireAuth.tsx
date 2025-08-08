import React from 'react';
import { Navigate } from 'react-router-dom';

interface RequireAuthProps {
  children: React.ReactNode;
}

/**
 * Auth-Guard Komponente - Schützt Routen vor unautorisierten Zugriffen
 * Redirected zu /login wenn kein gültiger Token vorhanden ist
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default RequireAuth;
