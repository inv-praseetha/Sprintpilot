import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/AuthService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const currentUser = AuthService.getCurrentUser();
      const accessToken = AuthService.getAccessToken();
      const refreshToken = AuthService.getRefreshToken();

      if (currentUser && accessToken) {
        setUser(currentUser);
      } else if (currentUser && refreshToken) {
        try {
          await AuthService.refreshToken();
          setUser(currentUser);
        } catch (err) {
          console.error('Failed to recover session with refresh token on startup:', err);
          AuthService.logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (idToken) => {
    setLoading(true);
    try {
      const data = await AuthService.loginWithGoogle(idToken);
      setUser(data.employee);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    AuthService.logout();
    setUser(null);
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user && AuthService.isAuthenticated(),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
