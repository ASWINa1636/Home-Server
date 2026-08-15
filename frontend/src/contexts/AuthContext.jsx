/**
 * AuthContext — Centralized authentication state management.
 * Provides user, token, login, logout, isAuthenticated, isAdmin across the app.
 * Includes auto-logout on token expiration or 401 responses.
 */
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [username, setUsername] = useState(() => localStorage.getItem('username'));
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('isAdmin') === 'true');

  const isAuthenticated = !!token;

  const login = useCallback((newToken, newUsername, adminFlag = false) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
    localStorage.setItem('isAdmin', String(!!adminFlag));
    setToken(newToken);
    setUsername(newUsername);
    setIsAdmin(!!adminFlag);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('isAdmin');
    setToken(null);
    setUsername(null);
    setIsAdmin(false);
  }, []);

  // Re-check profile on mount to sync isAdmin from server
  useEffect(() => {
    if (!token) return;
    api.get('/api/user/profile')
      .then(res => {
        setIsAdmin(!!res.data.is_admin);
        localStorage.setItem('isAdmin', String(!!res.data.is_admin));
      })
      .catch(() => {
        // Token might be expired — handled by 401 interceptor
      });
  }, [token]);

  const value = {
    token,
    username,
    isAuthenticated,
    isAdmin,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
