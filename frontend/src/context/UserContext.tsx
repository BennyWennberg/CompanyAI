// Zentrale User-Context für Frontend User-Management
// VEREINFACHT: Single User State statt Auth-Token-Handling in jeder Page

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Zentrale User-Interface für Frontend (kompatibel mit Backend)
export interface FrontendUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  department?: string;
  position?: string;
  status: string;
  permissions: string[];
  isAuthenticated: boolean;
}

interface UserContextType {
  // User State
  user: FrontendUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Auth Methods
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  
  // Permission Helpers
  hasPermission: (action: string, resource: string) => boolean;
  hasRole: (role: string) => boolean;
  
  // API Headers (für andere Components)
  getAuthHeaders: () => Record<string, string>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
  apiBaseUrl?: string;
}

export const UserProvider: React.FC<UserProviderProps> = ({ 
  children, 
  apiBaseUrl = 'http://localhost:5000' 
}) => {
  const [user, setUser] = useState<FrontendUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const isAuthenticated = !!user;
  
  // Initialize user from localStorage on mount
  useEffect(() => {
    initializeUser();
  }, []);
  
  const initializeUser = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('authToken');
      if (!token) {
        setIsLoading(false);
        return;
      }
      
      // Validate token with backend
      const response = await fetch(`${apiBaseUrl}/api/auth/validate`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const userData = result.data;
          setUser({
            id: userData.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
            role: userData.role || 'USER',
            department: userData.department,
            position: userData.position,
            status: userData.status || 'active',
            permissions: userData.permissions || [],
            isAuthenticated: true
          });
        } else {
          // Token invalid
          localStorage.removeItem('authToken');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userName');
        }
      } else {
        // Token invalid or expired
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
      }
    } catch (err) {
      console.error('User initialization error:', err);
      setError('Benutzer-Initialisierung fehlgeschlagen');
      // Clear invalid data
      localStorage.removeItem('authToken');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
    } finally {
      setIsLoading(false);
    }
  };
  
  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      const result = await response.json();
      
      if (result.success && result.user) {
        const userData = result.user;
        
        // Store auth data
        localStorage.setItem('authToken', userData.token);
        localStorage.setItem('userRole', userData.role);
        localStorage.setItem('userName', userData.displayName || `${userData.firstName} ${userData.lastName}`);
        
        // Set user state
        setUser({
          id: userData.id,
          email: userData.email,
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
          role: userData.role,
          department: userData.department,
          position: userData.position,
          status: 'active',
          permissions: userData.permissions || [],
          isAuthenticated: true
        });
        
        return true;
      } else {
        setError(result.message || 'Login fehlgeschlagen');
        return false;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Verbindungsfehler beim Login');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
  };
  
  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${apiBaseUrl}/api/users/${user.id}`, {
        headers: getAuthHeaders()
      });
      
      const result = await response.json();
      if (result.success && result.data) {
        const userData = result.data;
        setUser({
          ...user,
          firstName: userData.firstName,
          lastName: userData.lastName,
          displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
          department: userData.department,
          position: userData.position,
          status: userData.status,
          permissions: userData.permissions || []
        });
      }
    } catch (err) {
      console.error('User refresh error:', err);
    }
  };
  
  const hasPermission = (action: string, resource: string): boolean => {
    if (!user || !user.permissions) return false;
    
    // Super Admin has all permissions
    if (user.role === 'SUPER_ADMIN') return true;
    
    // Check specific permissions
    return user.permissions.some((permission: any) => 
      (permission.resource === resource || permission.resource === 'all') &&
      (permission.action === action || permission.action === 'admin')
    );
  };
  
  const hasRole = (role: string): boolean => {
    if (!user) return false;
    
    // Support both exact match and hierarchy check
    if (user.role === role) return true;
    
    // Admin roles include lower roles
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'ADMIN' && ['HR_ADMIN', 'IT_ADMIN', 'USER'].includes(role)) return true;
    
    return false;
  };
  
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('authToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  };
  
  const value: UserContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    refreshUser,
    hasPermission,
    hasRole,
    getAuthHeaders
  };
  
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;
